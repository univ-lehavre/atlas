"""Point d'entrée de la code-location Dagster.

Chargé par le serveur gRPC (``dagster api grpc -m citation_dagster.definitions``)
que l'orchestrateur Dagster du cluster découvre via son workspace.

Deux familles d'assets :
- ``raw_snapshot`` — ingestion du brut OpenAlex (étape 2) ;
- les modèles dbt ``staging`` → ``curated`` (étape 3.2), exposés via
  ``dagster-dbt`` (``citation_dagster.dbt``).
"""

import json
import os
import tempfile
import time
from pathlib import Path

from dagster import (
    AssetSelection,
    DefaultSensorStatus,
    Definitions,
    RunConfig,
    RunRequest,
    ScheduleDefinition,
    SensorEvaluationContext,
    SkipReason,
    define_asset_job,
    sensor,
)

from citation_dagster import watermark
from citation_dagster.assets import (
    author_recommendations_manifest,
    collab_manifest,
    index_load,
    pair_uplift_model,
    pair_uplift_predictions_manifest,
    raw_snapshot,
    researcher_embeddings,
    researcher_vectors_manifest,
    researchers_fts_manifest,
    researchers_manifest,
    work_vectors_manifest,
)
from citation_dagster.assets.drift import evidently_embedding_drift, read_drift_verdict
from citation_dagster.assets.drift_uplift import evidently_uplift_drift
from citation_dagster.assets.quality import (
    ge_author_recommendations,
    ge_curated_edges,
    ge_index_load,
    ge_marts_collab,
    ge_marts_researchers,
    ge_pair_uplift_predictions,
    ge_raw_contract,
    ge_researcher_vectors,
)
from citation_dagster.assets.raw_snapshot import RawSnapshotConfig
from citation_dagster.dbt import dbt_components
from citation_dagster.resources import ceph_target_from_env, render_rclone_config

# Le pod de run (K8sRunLauncher) doit recevoir les accès S3 du lakehouse : on
# injecte la SOURCE des creds (AWS_*/BUCKET_*) via les tags k8s au niveau du RUN (et
# non de l'op — en mode multiprocess, seule la config run-level configure le pod).
# Le job de transformation dbt en a besoin AUSSI : dbt-duckdb crée son secret S3
# depuis l'environnement (profiles.yml + env_var) à l'ouverture de session.
#
# La SOURCE diffère selon le profil (comme l'envFrom du Deployment, cf. overlays) :
#   - banc léger (SeaweedFS) : UN Secret unique porte AWS_* ET BUCKET_* ;
#   - prod (ObjectBucketClaim Rook) : un Secret (AWS_*) ET un ConfigMap (BUCKET_*),
#     tous deux du nom de la claim (≠ `citation-s3-access`).
# Les NOMS de ces ressources sont donc des valeurs d'INSTANCE : on les lit de
# l'environnement du pod gRPC (posé par chaque overlay via CITATION_S3_SECRET /
# CITATION_S3_CONFIGMAP) plutôt que de les coder en dur. Défaut = `citation-s3-access`
# (banc / checkout neuf / tests), pas de ConfigMap par défaut. Sans ce paramétrage,
# un nom codé en dur ferait échouer le pod de run en prod (« Secret not found ») et,
# même au bon nom, n'apporterait jamais le ConfigMap BUCKET_* de l'OBC.
#
# Piège ADR 0086 (contrat cluster) : les variables posées sur le Deployment de la
# code-location gRPC (OPENLINEAGE_URL, MLFLOW_TRACKING_URI…) NE se propagent PAS
# aux pods de run du K8sRunLauncher. Sans les réinjecter ICI, l'émission de lineage
# (_emit_lineage no-op si OPENLINEAGE_URL absent) et le logging MLflow (drift/CT)
# tombent en no-op SILENCIEUX dans le run (run SUCCESS mais rien d'émis). On les
# déclare donc au niveau du run via container_config.env. Hosts en forme COURTE
# `<svc>.<ns>` (marquez.marquez, mlflow.mlflow) et NON le FQDN `…svc.cluster.local` :
# en prod, un search domain externe (resolv.conf, ndots:5) fait timeouter la résolution
# du FQDN complet côté pod de run (cf. univ-lehavre/cluster#458). Ces valeurs DOIVENT
# rester identiques à code-location.yaml (sinon Deployment gRPC ≠ pods de run).
_RUN_ENV = [
    {"name": "OPENLINEAGE_URL", "value": "http://marquez.marquez:5000"},
    {"name": "OPENLINEAGE_ENDPOINT", "value": "api/v1/lineage"},
    {"name": "OPENLINEAGE_NAMESPACE", "value": "dagster"},
    {"name": "MLFLOW_TRACKING_URI", "value": "http://mlflow.mlflow:5000"},
]


def _s3_env_from() -> list[dict]:
    """`env_from` des pods de run pour les creds S3 (AWS_*/BUCKET_*), par profil.

    Lit les NOMS depuis l'env du pod gRPC (posés par l'overlay) : `CITATION_S3_SECRET`
    (défaut `citation-s3-access`) toujours en `secret_ref` ; `CITATION_S3_CONFIGMAP`
    ajouté en `config_map_ref` UNIQUEMENT s'il est défini (prod : ConfigMap BUCKET_*
    de l'OBC ; banc : absent, le Secret unique porte déjà BUCKET_*).
    """
    secret = os.environ.get("CITATION_S3_SECRET", "citation-s3-access")
    env_from = [{"secret_ref": {"name": secret}}]
    configmap = os.environ.get("CITATION_S3_CONFIGMAP")
    if configmap:
        env_from.append({"config_map_ref": {"name": configmap}})
    return env_from


# dnsConfig ndots:1 sur les pods de RUN (piège FQDN prod sous charge, univ-lehavre/cluster#458).
# Le résolveur k8s pose `ndots:5` par défaut : un host intra-cluster à < 5 points (ex.
# `rook-ceph-rgw-datalake.rook-ceph`, 1 point) est traité comme RELATIF → glibc `getaddrinfo`
# parcourt TOUTE la search-list (dagster.svc…, svc…, cluster.local, PUIS les domaines EXTERNES
# du resolv.conf) avant la forme absolue = 5-6 lookups par résolution. Le contrat GE
# (`ge_raw_contract` → DuckDB httpfs, qui résout via cpp-httplib/getaddrinfo, PAS c-ares) fait un
# HTTP HEAD PAR FICHIER sur des milliers de `part_*.gz` du datalake → l'amplification ×5-6 sature
# le DNS et fait remonter des `EAI_AGAIN` transitoires (« Could not resolve hostname », prod
# dirqual 2026-07-05, run c1d30af4). `ndots:1` fait tenter tout nom ≥ 1 point en ABSOLU d'abord →
# 1 seul lookup, aucune search-list. Bénéficie à TOUS les accès DNS du pod (DuckDB, S3, Postgres),
# pas seulement DuckDB. Posé via `pod_spec_config` du tag `dagster-k8s/config` (le K8sRunLauncher
# ne porte pas le pod-spec des runs — il vient d'ici). rclone (ingestion, glibc aussi) réutilise
# ses connexions → peu de lookups → n'était pas affecté (687 GiB ingérés OK).
_DNS_NDOTS_1 = {"dns_config": {"options": [{"name": "ndots", "value": "1"}]}}

# Volume de SPILLING DuckDB (scalabilité au datalake complet). DuckDB borne sa RAM
# (memory_limit, cf. lakehouse.connect / profiles.yml) et déborde ses tris/jointures dans
# `temp_directory` — sans disque monté, ce spilling écrirait dans l'overlay du conteneur
# (petit, peu perf). On monte un emptyDir dédié (`/tmp/duckdb-spill`, = DBT_DUCKDB_TEMP_DIR)
# → gros modèles curated (ex. curated_edges : DISTINCT+ORDER BY sur ~8M arêtes) débordent sur
# disque au lieu d'OOM-killer le pod. emptyDir = éphémère par run (nettoyé à la fin), taille
# bornée par l'espace du nœud (kubelet évince si dépassement — accepté : le spill est
# transitoire). `medium: ""` = disque du nœud (pas la RAM ; `Memory` compterait dans la RAM).
_SPILL_VOLUME = {"name": "duckdb-spill", "empty_dir": {}}
_SPILL_MOUNT = {"name": "duckdb-spill", "mount_path": "/tmp/duckdb-spill"}

# requests/limits du pod de run, COHÉRENTS avec les réglages DuckDB (memory_limit=64GB,
# threads=60 — cf. lakehouse.connect / profiles.yml). Sans resources explicites, le pod de
# run tournait en BestEffort : le scheduler ne réservait rien → DuckDB parallélisait/allouait
# « à l'aveugle » et le pod était OOM-killé au 1er gros modèle curated. On DÉCLARE donc :
#   - requests : placement garanti — 16 cœurs / 16Gi (ce que le run prend a minima) ;
#   - limits : plafond aligné sur DuckDB (memory_limit 64GB + marge pandas/python/arrow →
#     72Gi) + 60 cœurs (= threads). Les nœuds ont 80 cœurs / ~251 GiB → confortable (< 30 %).
# Dérivable par l'env (ADR 0023) : le banc léger baisse DBT_DUCKDB_MEMORY_LIMIT + ces valeurs.
# NB CRITIQUE : le memory_limit DuckDB (64GB ≈ 68,7Gi) reste SOUS la limite pod (72Gi) → DuckDB
# spille sur disque AVANT que le cgroup ne tue le pod (l'ordre est essentiel : sinon OOM avant
# spill). L'écart (72Gi − 64GB) absorbe la RAM hors-DuckDB (pandas/arrow des assets Python).
_RUN_RESOURCES = {
    "requests": {"cpu": "16", "memory": "16Gi"},
    "limits": {"cpu": "60", "memory": "72Gi"},
}


def _k8s_config(env):
    """Tag `dagster-k8s/config` d'un pod de run : env + S3 + dnsConfig ndots:1 + volume de
    spilling DuckDB + resources (cohérentes avec memory_limit/threads DuckDB). Partagé par
    l'ingestion et le transform (DRY, jscpd) — seul `env` diffère (POSTGRES_* d'index_load)."""
    return {
        "dagster-k8s/config": {
            "container_config": {
                "env": env,
                "env_from": _s3_env_from(),
                "volume_mounts": [_SPILL_MOUNT],
                "resources": _RUN_RESOURCES,
            },
            "pod_spec_config": {**_DNS_NDOTS_1, "volumes": [_SPILL_VOLUME]},
        }
    }


_RUN_K8S_CONFIG = _k8s_config(_RUN_ENV)

# index_load (transform_job, étape 4) écrit l'index pgvector → son pod de run a besoin
# de POSTGRES_HOST/PORT/DB/USER/PASSWORD (resources.postgres_target_from_env, qui LÈVE
# si absents). On les MAPPE EXPLICITEMENT — on N'injecte PAS `env_from: pg-role-pgvector`
# brut, qui était DOUBLEMENT faux : (1) ce Secret (type basic-auth) porte les clés
# `username`/`password`, PAS `POSTGRES_USER`/`POSTGRES_PASSWORD` → variables absentes ;
# (2) `env_from`/`secret_ref` est résolu SAME-NAMESPACE, or pg-role-pgvector vit en ns
# `postgres` et le pod de run en ns `dagster` → introuvable. Le déployeur fournit donc un
# Secret DÉRIVÉ `pgvector-pg-auth` dans le ns `dagster` (clés username/password, recopie
# de pg-role-pgvector — même patron que dagster-pg-auth ; cf. contrat namespaces-secrets,
# univ-lehavre/cluster). Host/db/port en littéraux NOM COURT (pg-rw.postgres, cf. note DNS
# du contrat / cluster#458). USER/PASSWORD via secretKeyRef vers le dérivé.
_PG_ENV_SECRET = "pgvector-pg-auth"


def _pg_secret_env(var: str, key: str) -> dict:
    """Variable POSTGRES_* lue d'une clé du Secret dérivé (ns dagster), via secretKeyRef."""
    return {"name": var, "value_from": {"secret_key_ref": {"name": _PG_ENV_SECRET, "key": key}}}


_TRANSFORM_ENV = [
    *_RUN_ENV,
    {"name": "POSTGRES_HOST", "value": "pg-rw.postgres"},
    {"name": "POSTGRES_PORT", "value": "5432"},
    {"name": "POSTGRES_DB", "value": "pgvector"},
    _pg_secret_env("POSTGRES_USER", "username"),
    _pg_secret_env("POSTGRES_PASSWORD", "password"),
]
# Transform : mêmes ndots:1 + volume de spilling que l'ingestion (via _k8s_config), mais
# _TRANSFORM_ENV ajoute les POSTGRES_* d'index_load. Le transform fait le gros du DuckDB
# (dbt curated/marts + embeddings + uplift) → le spilling y est le plus critique.
_TRANSFORM_K8S_CONFIG = _k8s_config(_TRANSFORM_ENV)

ingestion_job = define_asset_job(
    "ingestion_job",
    selection=AssetSelection.assets("raw_snapshot"),
    tags=_RUN_K8S_CONFIG,
)

# Assets dbt + ressource CLI (ou [], {} si dbt indisponible — lint/checkout neuf).
_dbt_assets, _dbt_resources = dbt_components()

# collab_manifest dépend de l'asset dbt marts_collab_pairs (via AssetKey) : il s'exécute
# APRÈS le mart, dans le même run (donc même context.run_id → même préfixe dt=…/run=…).
# Ajouté inconditionnellement : si dbt est indisponible ([],{}), sa dépendance pend sur
# une clé externe non exécutable et la code-location reste chargeable (asset orphelin).
# researcher_embeddings (lot 3) dépend des assets dbt curated_work_topics/keywords
# et curated_authorships (via AssetKey) : il s'exécute APRÈS eux, dans le même run
# (même context.run_id → même préfixe dt=…/run=…). Ajouté inconditionnellement,
# comme collab_manifest : en mode dégradé (dbt indisponible), ses clés sources ne
# sont pas exécutables et il reste un asset orphelin chargeable.
# Les manifests du producteur researchers (lot 4) sont ajoutés inconditionnellement,
# comme collab_manifest : researchers_manifest dépend du mart dbt marts_researchers ;
# researcher_vectors_manifest et work_vectors_manifest dépendent de l'asset Python
# researcher_embeddings (toujours présent). En mode dégradé (dbt absent), les manifests
# dont la dépendance est une clé dbt pendent sur une clé externe non exécutable et la
# code-location reste chargeable (assets orphelins).
# index_load (étape 4) charge l'index Postgres depuis les marts servis researchers_fts
# + researcher_vectors (via leurs manifests). Ajouté inconditionnellement comme les
# manifests : ses dépendances (clés de manifests, eux-mêmes adossés à dbt) pendent en
# mode dégradé et la code-location reste chargeable (asset orphelin).
_assets = [
    raw_snapshot,
    collab_manifest,
    researcher_embeddings,
    researchers_manifest,
    researchers_fts_manifest,
    researcher_vectors_manifest,
    work_vectors_manifest,
    index_load,
    # Modèle d'uplift FWCI EUNICoast (ADR 0067, lots 4/5) : dépend des assets dbt
    # marts_author_profiles + curated_pair_uplift_labels (via AssetKey) ; même run.
    pair_uplift_model,
    # Manifests des deux marts servis du modèle d'uplift (contrat ADR 0029).
    pair_uplift_predictions_manifest,
    author_recommendations_manifest,
    *_dbt_assets,
]
_jobs = [ingestion_job]

# Asset checks Great Expectations bloquants (étape 3.5a). Le check du brut s'applique
# à raw_snapshot (toujours présent) ; ceux des couches dbt (curated_edges,
# marts_collab_pairs) ne sont enregistrés QUE si les assets dbt existent — sinon leur
# clé cible n'est pas résolue en mode dégradé (dbt indisponible : lint/checkout neuf).
# ge_researcher_vectors cible l'asset PYTHON researcher_embeddings (toujours enregistré)
# → INCONDITIONNEL (ne pas copier le pattern conditionnel-dbt, sinon le check du vecteur
# disparaîtrait en mode dégradé). ge_marts_researchers cible la clé dbt marts_researchers
# → conditionnel comme les autres checks dbt.
# ge_index_load cible l'asset Python index_load (toujours enregistré) → inconditionnel
# (comme ge_researcher_vectors). Il vérifie count(researchers en base) == row_count
# attendu du manifest FTS pour la partition chargée.
# evidently_embedding_drift cible l'asset PYTHON researcher_embeddings (toujours
# enregistré) → INCONDITIONNEL comme ge_researcher_vectors. NON bloquant : il mesure le
# drift N vs N-1 (informatif, loggué MLflow), ne casse pas le run (cf. assets/drift.py).
# ge_pair_uplift_predictions / ge_author_recommendations ciblent l'asset PYTHON
# pair_uplift_model (toujours enregistré) → INCONDITIONNELS (comme ge_researcher_vectors).
_asset_checks = [
    ge_raw_contract,
    ge_researcher_vectors,
    ge_index_load,
    evidently_embedding_drift,
    evidently_uplift_drift,
    ge_pair_uplift_predictions,
    ge_author_recommendations,
]
if _dbt_assets:
    _asset_checks += [ge_curated_edges, ge_marts_collab, ge_marts_researchers]

# Le job de transformation n'est enregistré QUE si les assets dbt existent : un
# job dont la sélection ne résout aucun asset ferait échouer la construction des
# Definitions. En prod le manifest est packagé → les assets dbt sont présents. Le job
# enchaîne le mart dbt PUIS l'écriture du manifest (collab_manifest) dans un seul run.
if _dbt_assets:
    transform_job = define_asset_job(
        "transform_job",
        selection=(
            AssetSelection.assets(*_dbt_assets)
            | AssetSelection.assets("collab_manifest")
            | AssetSelection.assets("researcher_embeddings")
            | AssetSelection.assets("researchers_manifest")
            | AssetSelection.assets("researchers_fts_manifest")
            | AssetSelection.assets("researcher_vectors_manifest")
            | AssetSelection.assets("work_vectors_manifest")
            | AssetSelection.assets("index_load")
            | AssetSelection.assets("pair_uplift_model")
            | AssetSelection.assets("pair_uplift_predictions_manifest")
            | AssetSelection.assets("author_recommendations_manifest")
        ),
        # index_load écrit vers Postgres → ce job a besoin du Secret pg-role-pgvector.
        tags=_TRANSFORM_K8S_CONFIG,
    )
    _jobs.append(transform_job)

# ENTRAÎNEMENT CONTINU (CT, MLOps 1→2) : le transform_job (dbt → embeddings → index)
# se rejoue automatiquement, plus de re-trigger 100 % manuel. Statut STOPPED par défaut
# — l'opérateur l'arme dans l'UI Dagster (pas de re-training silencieux non voulu). Le
# drift mesuré par evidently_embedding_drift nourrit la décision d'ajuster cette cadence.
# Enregistré UNIQUEMENT si transform_job existe (assets dbt présents), comme le job.
#
# CADENCE = VALEUR D'INSTANCE (ADR 0062 : « le code PERMET la cadence ; activer le
# schedule et FIXER sa fréquence relèvent du DÉPLOYEUR — le code n'impose pas un rythme »).
# On NE fige donc PAS la fréquence dans le code générique : elle se lit de CITATION_CT_CRON
# (cron 5-champs), défaut QUOTIDIEN 02:00 UTC (heure creuse) = simple exemple. Un déployeur
# aligné sur le rythme des snapshots OpenAlex la met en MENSUEL (p. ex. « 0 2 1 * * » = le
# 1ᵉʳ du mois) sans toucher au code — ou surcharge directement la cadence à l'armement (UI).
_DEFAULT_CT_CRON = "0 2 * * *"


def _ct_cron(env: dict | None = None) -> str:
    """Cron du CT, lu de CITATION_CT_CRON (valeur d'instance), défaut quotidien (exemple)."""
    env = env if env is not None else os.environ
    return env.get("CITATION_CT_CRON") or _DEFAULT_CT_CRON


# INGESTION PÉRIODIQUE (étape 2) : rapatrie le snapshot OpenAlex vers raw/ et AVANCE le
# watermark. STOPPED par défaut (comme transform_daily) — le déployeur l'arme (ADR 0062).
# Armée AVEC le sensor transform_on_watermark_advance (ci-dessous), elle donne une chaîne
# MENSUELLE bout-en-bout : ingestion → watermark avancé → transform (dbt → embeddings →
# index). Inconditionnelle : ingestion_job existe toujours (raw_snapshot est un asset
# Python, sans dépendance dbt) — contrairement à transform_daily (gardé par _dbt_assets).
# CADENCE = VALEUR D'INSTANCE (ADR 0062) : lue de CITATION_INGEST_CRON, défaut MENSUEL
# (« 0 2 1 * * ») = rythme naturel des snapshots OpenAlex (ré-surchargeable par le déployeur).
_DEFAULT_INGEST_CRON = "0 2 1 * *"


def _ingest_cron(env: dict | None = None) -> str:
    """Cron de l'ingestion, lu de CITATION_INGEST_CRON (valeur d'instance), défaut mensuel."""
    env = env if env is not None else os.environ
    return env.get("CITATION_INGEST_CRON") or _DEFAULT_INGEST_CRON


def _ingest_run_config(env: dict | None = None) -> RunConfig | None:
    """RunConfig de bornage de l'ingestion — VALEUR D'INSTANCE (ADR 0023).

    Le défaut CODE de ``RawSnapshotConfig`` est **prod-complet** (0 = illimité) : la prod
    ne pose donc AUCUNE de ces variables et rapatrie tout. C'est le **banc** qui borne, via
    son overlay (``CITATION_INGEST_SAMPLE_SIZE`` / ``CITATION_INGEST_MAX_PARTITIONS`` /
    ``CITATION_INGEST_COHERENT``). Sans variable posée → ``None`` (pas de surcharge → défaut
    complet). Parse défensif : une valeur absente/invalide n'est simplement pas surchargée
    (jamais de crash de l'ingestion pour un env mal formé)."""
    env = env if env is not None else os.environ
    overrides: dict[str, object] = {}

    def _int(key: str) -> None:
        raw = env.get(key)
        if raw is None:
            return
        try:
            overrides[_ENV_TO_FIELD[key]] = int(raw)
        except (TypeError, ValueError):
            return  # env mal formé → on n'écrase pas le défaut complet

    _ENV_TO_FIELD = {
        "CITATION_INGEST_SAMPLE_SIZE": "sample_size",
        "CITATION_INGEST_MAX_PARTITIONS": "max_partitions",
    }
    for key in _ENV_TO_FIELD:
        _int(key)
    coherent = env.get("CITATION_INGEST_COHERENT")
    if coherent is not None:
        overrides["coherent_sample"] = coherent.strip().lower() in ("1", "true", "on", "yes")
    if not overrides:
        return None
    return RunConfig(ops={"raw_snapshot": RawSnapshotConfig(**overrides)})


_schedules = [
    # Ingestion périodique du snapshot OpenAlex (raw/ + avance le watermark). Inconditionnelle
    # (ingestion_job existe toujours) ; STOPPED par défaut, armée par le déployeur.
    # `run_config` = bornage d'INSTANCE : None en prod (défaut complet), borné au banc via
    # l'overlay. C'était la ligne MANQUANTE qui laissait la prod hériter des mini-défauts banc.
    ScheduleDefinition(
        name="ingest_snapshot",
        job=ingestion_job,
        cron_schedule=_ingest_cron(),
        execution_timezone="UTC",
        run_config=_ingest_run_config(),
        description="Ingestion périodique du snapshot OpenAlex (raw/ + avance le watermark).",
    )
]
if _dbt_assets:
    transform_daily = ScheduleDefinition(
        name="transform_daily",
        job=transform_job,
        cron_schedule=_ct_cron(),
        execution_timezone="UTC",
        description="Entraînement continu : rejoue transform_job (dbt → embeddings → index).",
    )
    _schedules.append(transform_daily)


# CT PAR SIGNAL (atlas#399) : un @sensor déclenche transform_job quand l'INGESTION a
# avancé — réentraîner sur de la donnée VRAIMENT neuve, pas seulement au calendrier
# (complète le @schedule mensuel d'instance ci-dessus). Le signal est l'avancée du
# watermark d'ingestion (raw/_watermark.json) : on compare l'état complet du watermark
# au curseur du sensor ; tout changement → un RunRequest. STOPPED par défaut comme le
# schedule (le code PERMET, le déployeur arme — ADR 0062/0031).


def evaluate_ct_sensor(state: dict, cursor: str | None) -> tuple[bool, str, str]:
    """Corps PUR (sans I/O ni Dagster) : décide si l'avancée du watermark déclenche un run.

    ``state`` : document watermark complet (``watermark.read_all``). ``cursor`` : sérialisé
    de l'état vu au dernier tick. Renvoie ``(should_run, run_key, new_cursor)`` :
    - ``new_cursor`` = état courant sérialisé (clés triées → déterministe) ;
    - ``should_run`` = l'état a changé ET n'est pas vide (rien à réentraîner sans donnée) ;
    - ``run_key`` = ce même sérialisé → **dédup Dagster** : un état déjà déclenché ne
      relance pas (idempotence ; pas de double-déclenchement sur re-éval du même état).
    """
    new_cursor = json.dumps(state, sort_keys=True)
    should_run = bool(state) and new_cursor != cursor
    return should_run, new_cursor, new_cursor


_sensors = []
if _dbt_assets:

    @sensor(
        name="transform_on_watermark_advance",
        job=transform_job,
        default_status=DefaultSensorStatus.STOPPED,  # le déployeur l'arme (ADR 0062/0031)
        minimum_interval_seconds=300,  # éval toutes les 5 min max (le watermark bouge lentement)
        description="CT par signal : déclenche transform_job à l'avancée du watermark.",
    )
    def transform_on_watermark_advance(context: SensorEvaluationContext):
        # Lecture best-effort du watermark (rclone.conf temporaire, comme les assets) :
        # sans accès S3 (dev/CI), le sensor SKIP proprement plutôt que d'échouer.
        try:
            target = ceph_target_from_env()
            with tempfile.TemporaryDirectory() as tmp:
                config_path = Path(tmp) / "rclone.conf"
                config_path.write_text(render_rclone_config(target))
                state = watermark.read_all(target.bucket, config_path)
        except Exception as exc:  # noqa: BLE001 — pas d'accès S3 : on n'échoue pas le sensor
            yield SkipReason(f"watermark illisible (accès S3 indisponible) : {exc}")
            return
        should_run, run_key, new_cursor = evaluate_ct_sensor(state, context.cursor)
        context.update_cursor(new_cursor)
        if should_run:
            # run_key = état du watermark → Dagster dédoublonne : un même état ne relance pas.
            yield RunRequest(run_key=run_key)
        else:
            yield SkipReason(
                "watermark inchangé depuis le dernier run (rien de neuf à réentraîner)"
            )

    _sensors.append(transform_on_watermark_advance)


# ── BOUCLE FERMÉE DÉRIVE → RÉENTRAÎNEMENT (CT autonome, ADR 0079) ─────────────
# Ferme la boucle MLOps niveau 2 : la DÉRIVE mesurée (evidently_embedding_drift,
# verdict persisté en S3 par assets/drift.py) déclenche AUTOMATIQUEMENT un
# réentraînement (transform_job). RUPTURE ASSUMÉE avec « le déployeur arme » : ce
# sensor est ACTIF PAR DÉFAUT (RUNNING), le déployeur OPT-OUT (≠ les autres sensors,
# STOPPED, qu'il arme). Vraie autonomie — actée par l'ADR 0079 (amende 0062/0031).
#
# GARDE-FOU ANTI-EMBALLEMENT (terminaison prouvée). Le drift est mesuré N vs N-1 EN
# AVAL de transform_job ; réentraîner sur la MÊME donnée ne le fait pas disparaître
# (le drift vient de la donnée NEUVE, pas du modèle). On ne réentraîne donc QUE si le
# watermark d'INGESTION a AVANCÉ depuis le dernier retrain. Comme le retrain ne
# ré-ingère pas (le watermark ne bouge pas), le run post-retrain re-mesure un drift
# sur le MÊME watermark → SKIP : POINT FIXE en 1 itération. Plus : dédup par run_id du
# verdict, et cooldown (ceinture-bretelles anti-flapping Evidently).


def _retrain_auto_enabled(env: dict | None = None) -> bool:
    """La boucle est-elle armée ? ACTIVE PAR DÉFAUT ; le déployeur DÉSARME via
    CITATION_RETRAIN_AUTO ∈ {off,0,false,no} (opt-out, ADR 0079)."""
    env = env if env is not None else os.environ
    return (env.get("CITATION_RETRAIN_AUTO") or "on").strip().lower() not in {
        "off",
        "0",
        "false",
        "no",
    }


_DEFAULT_RETRAIN_COOLDOWN_S = 6 * 3600  # 6 h — anti-flapping, valeur d'instance


def _retrain_cooldown_s(env: dict | None = None) -> int:
    """Cooldown minimal entre deux retrains auto, lu de CITATION_RETRAIN_COOLDOWN_S
    (valeur d'instance) ; défaut 6 h ; valeur invalide/négative → défaut."""
    env = env if env is not None else os.environ
    try:
        n = int(env.get("CITATION_RETRAIN_COOLDOWN_S"))
    except (TypeError, ValueError):
        return _DEFAULT_RETRAIN_COOLDOWN_S
    return n if n >= 0 else _DEFAULT_RETRAIN_COOLDOWN_S


def evaluate_drift_retrain(
    verdict: dict, cursor: str | None, cooldown_ok: bool
) -> tuple[bool, str, str]:
    """Corps PUR (sans I/O ni Dagster ni horloge) : décide si un verdict de dérive
    déclenche un réentraînement. Garantit la TERMINAISON (pas de boucle infinie).

    ``verdict`` : document lu en S3 (``read_drift_verdict``) — ``{run_id, drift_detected,
    watermark, …}``. ``cursor`` : sérialisé de ``{last_verdict_run, last_retrain_watermark}``
    vu au dernier tick. ``cooldown_ok`` : l'horloge autorise-t-elle un retrain (calculé hors
    du pur). Renvoie ``(should_retrain, run_key, new_cursor)``.

    SKIP (dans l'ordre) si : verdict vide/schéma inconnu ; même run_id que la dernière fois
    (dédup) ; pas de drift ; le watermark vu == celui du dernier retrain (ANTI-EMBALLEMENT :
    réentraîner sur la même donnée est inutile — c'est ce qui borne la boucle) ; cooldown KO.
    Sinon RETRAIN : ``run_key = drift-retrain:<run_id>`` (dédup Dagster), curseur mémorise le
    run_id et le watermark déclencheur."""
    prev = json.loads(cursor) if cursor else {}
    last_run = prev.get("last_verdict_run")
    last_wm = prev.get("last_retrain_watermark")

    run_id = verdict.get("run_id")
    seen_wm = json.dumps(verdict.get("watermark", {}), sort_keys=True)

    # Curseur inchangé tant qu'on ne retraine pas : on mémorise le dernier run vu pour la
    # dédup, mais on NE touche PAS last_retrain_watermark (seul un retrain effectif l'avance).
    def _cursor(retrain_wm: str | None) -> str:
        return json.dumps(
            {
                "last_verdict_run": run_id if run_id else last_run,
                "last_retrain_watermark": retrain_wm if retrain_wm is not None else last_wm,
            },
            sort_keys=True,
        )

    if not run_id or verdict.get("schema_version") != 1:
        return False, "", _cursor(None)
    if run_id == last_run:  # dédup : verdict déjà traité
        return False, "", _cursor(None)
    if not verdict.get("drift_detected"):  # pas de drift → rien à réentraîner
        return False, "", _cursor(None)
    if seen_wm == last_wm:  # ANTI-EMBALLEMENT : pas de donnée neuve depuis le dernier retrain
        return False, "", _cursor(None)
    if not cooldown_ok:  # ceinture-bretelles anti-flapping
        return False, "", _cursor(None)
    # Retrain : on avance last_retrain_watermark au watermark déclencheur (terminaison).
    return True, f"drift-retrain:{run_id}", _cursor(seen_wm)


if _dbt_assets and _retrain_auto_enabled():
    _retrain_cooldown = _retrain_cooldown_s()
    _last_retrain_at = {"ts": 0.0}  # horloge du cooldown, hors de la fonction pure

    @sensor(
        name="retrain_on_drift",
        job=transform_job,
        default_status=DefaultSensorStatus.RUNNING,  # ACTIF par défaut (ADR 0079, opt-out)
        minimum_interval_seconds=300,
        description="CT autonome : réentraîne quand la dérive est confirmée ET la donnée a avancé.",
    )
    def retrain_on_drift(context: SensorEvaluationContext):
        # Lecture best-effort du verdict de dérive persisté en S3 (rclone.conf temporaire,
        # comme les assets) : sans accès S3 (dev/CI), le sensor SKIP proprement.
        try:
            target = ceph_target_from_env()
            with tempfile.TemporaryDirectory() as tmp:
                config_path = Path(tmp) / "rclone.conf"
                config_path.write_text(render_rclone_config(target))
                verdict = read_drift_verdict(target.bucket, config_path)
        except Exception as exc:  # noqa: BLE001 — pas d'accès S3 : on n'échoue pas le sensor
            yield SkipReason(f"verdict de dérive illisible (accès S3 indisponible) : {exc}")
            return
        cooldown_ok = (time.monotonic() - _last_retrain_at["ts"]) >= _retrain_cooldown
        should_retrain, run_key, new_cursor = evaluate_drift_retrain(
            verdict, context.cursor, cooldown_ok
        )
        context.update_cursor(new_cursor)
        if should_retrain:
            _last_retrain_at["ts"] = time.monotonic()
            # run_key = drift-retrain:<run_id> → Dagster dédoublonne sur le verdict.
            yield RunRequest(run_key=run_key)
        else:
            yield SkipReason("pas de dérive confirmée sur de la donnée neuve (rien à réentraîner)")

    _sensors.append(retrain_on_drift)

defs = Definitions(
    assets=_assets,
    asset_checks=_asset_checks,
    jobs=_jobs,
    schedules=_schedules,
    sensors=_sensors,
    resources=_dbt_resources,
)
