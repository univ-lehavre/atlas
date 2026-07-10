"""Point d'entrée de la code-location Dagster « mediawatch ».

Chargé par le serveur gRPC (``dagster api grpc -m mediawatch_dagster.definitions``)
que l'orchestrateur Dagster du cluster découvre via son workspace.

Lots livrés / à venir :
- ``raw_gkg`` + ``ingestion_job`` + GE du brut (PR 2, livré) ;
- modèles dbt (classification université) + GE curated (PR 3, livré) ;
- ``raw_gkg`` partitionné par jour + schedule 15 min (PR 4, livré) ;
- mart ``university_timeline`` + manifest (PR 4) ;
- entraînement continu (CT) : schedule + sensor rejouant ``transform_job``
  (ADR 0062, parité avec citation), STOPPED par défaut.

Le câblage K8s des pods de run (run workers) est commun à tous les lots : injection
du Secret S3 du lakehouse et des variables OpenLineage au niveau du RUN.
"""

import json
import os
import tempfile
import time
from pathlib import Path

from dagster import (
    AssetSelection,
    DefaultScheduleStatus,
    DefaultSensorStatus,
    Definitions,
    RunRequest,
    ScheduleEvaluationContext,
    SensorEvaluationContext,
    SkipReason,
    define_asset_job,
    schedule,
    sensor,
)

from mediawatch_dagster.assets import (
    forecast_manifest,
    forecast_university_timeline,
    raw_gkg,
    raw_native_gkg,
    ref_universities_snapshot,
    timeline_manifest,
)
from mediawatch_dagster.assets.drift_forecast import (
    evidently_forecast_drift,
    read_drift_verdict,
)
from mediawatch_dagster.assets.manifest import _run_rclone, parse_lsjson_entries
from mediawatch_dagster.assets.quality import (
    ge_curated_universities,
    ge_marts_timeline,
    ge_raw_gkg,
    ge_raw_native_gkg,
)
from mediawatch_dagster.assets.raw_gkg import gkg_daily_partitions
from mediawatch_dagster.dbt import dbt_components
from mediawatch_dagster.partitions import ingested_partitions
from mediawatch_dagster.resources import ceph_target_from_env, render_rclone_config

# Le pod de run (K8sRunLauncher) doit recevoir les accès S3 du lakehouse : on
# injecte le Secret mediawatch-s3-access via les tags k8s au niveau du RUN (et non
# de l'op — en mode multiprocess, seule la config run-level configure le pod).
#
# Piège ADR 0086 (contrat cluster) : les variables posées sur le Deployment de la
# code-location gRPC (OPENLINEAGE_URL…) NE se propagent PAS aux pods de run du
# K8sRunLauncher. Sans les réinjecter ICI, l'émission de lineage (lineage.emit no-op
# si OPENLINEAGE_URL absent) tombe en no-op SILENCIEUX dans le run (run SUCCESS mais
# rien d'émis). On les déclare donc au niveau du run via container_config.env. Hosts
# en forme COURTE `<svc>.<ns>` (marquez.marquez) et NON le FQDN `…svc.cluster.local` :
# en prod, un search domain externe (resolv.conf, ndots:5) fait timeouter la
# résolution du FQDN complet côté pod de run (cf. univ-lehavre/cluster#458). Ces
# valeurs DOIVENT rester identiques à code-location.yaml (sinon Deployment gRPC ≠
# pods de run).
_RUN_ENV = [
    {"name": "OPENLINEAGE_URL", "value": "http://marquez.marquez:5000"},
    {"name": "OPENLINEAGE_ENDPOINT", "value": "api/v1/lineage"},
    {"name": "OPENLINEAGE_NAMESPACE", "value": "dagster"},
    # Suivi MLflow du modèle de prévision (ADR 0081) : comme OPENLINEAGE_URL, cette var
    # posée sur le Deployment gRPC NE se propage PAS aux pods de run (piège contrat
    # cluster) — on la réinjecte ICI au niveau du run, sinon le tracking tombe en no-op
    # silencieux dans le pod de run. Host en forme COURTE <svc>.<ns> (note DNS prod).
    {"name": "MLFLOW_TRACKING_URI", "value": "http://mlflow.mlflow:5000"},
]


def _s3_env_from() -> list[dict]:
    """`env_from` des pods de run pour les creds S3 (AWS_*/BUCKET_*), par profil.

    Le NOM des ressources S3 est une valeur d'INSTANCE, pas une constante : la SOURCE
    diffère selon le profil (comme l'envFrom du Deployment, cf. overlays) :
      - banc léger (SeaweedFS) : UN Secret unique porte AWS_* ET BUCKET_* ;
      - prod (ObjectBucketClaim Rook) : un Secret (AWS_*) ET un ConfigMap (BUCKET_*),
        tous deux du nom de la claim `mediawatch-datalake` (≠ `mediawatch-s3-access`).
    On lit donc les noms de l'env du pod gRPC (posés par chaque overlay via
    `MEDIAWATCH_S3_SECRET` / `MEDIAWATCH_S3_CONFIGMAP`) au lieu de les coder en dur :
    `MEDIAWATCH_S3_SECRET` (défaut `mediawatch-s3-access` au banc / tests) toujours en
    `secret_ref` ; `MEDIAWATCH_S3_CONFIGMAP` ajouté en `config_map_ref` UNIQUEMENT s'il
    est défini (prod : ConfigMap BUCKET_* de l'OBC ; banc : absent, le Secret unique
    porte déjà BUCKET_*). Sans ce paramétrage, le nom codé en dur ferait échouer le pod
    de run en prod (« Secret not found » : l'OBC ne crée pas `mediawatch-s3-access`).
    """
    secret = os.environ.get("MEDIAWATCH_S3_SECRET", "mediawatch-s3-access")
    env_from = [{"secret_ref": {"name": secret}}]
    configmap = os.environ.get("MEDIAWATCH_S3_CONFIGMAP")
    if configmap:
        env_from.append({"config_map_ref": {"name": configmap}})
    return env_from


RUN_K8S_CONFIG = {
    "dagster-k8s/config": {
        "container_config": {
            "env": _RUN_ENV,
            "env_from": _s3_env_from(),
        },
    },
}


def _transform_run_config() -> dict:
    """Config K8s du run de transformation : relaie les vars dbt aux pods de run.

    Piège ADR 0086 : les vars posées sur le Deployment gRPC (overlay prod :
    ``DBT_S3_USE_SSL``, ``MEDIAWATCH_REF_SOURCE``) NE se propagent PAS aux pods de
    run. Or dbt-duckdb (SSL) et ``build_dbt_vars`` (ref_source) les lisent DANS le
    pod de run. Ce module étant importé dans le Deployment gRPC, ``os.environ`` y
    porte les valeurs de l'overlay : on les RELAIE explicitement au niveau du run
    (valeurs absentes au banc → défauts ``false``/``seed``, inchangé).
    """
    relayed = [
        {"name": name, "value": os.environ[name]}
        for name in ("DBT_S3_USE_SSL", "MEDIAWATCH_REF_SOURCE")
        if name in os.environ
    ]
    return {
        "dagster-k8s/config": {
            "container_config": {
                "env": _RUN_ENV + relayed,
                "env_from": _s3_env_from(),
            },
        },
    }


# Tag de limite de CONCURRENCE du backfill (anti rate-limit GDELT, ADR 0064). Un
# backfill matérialise N partitions journalières ; sans borne, autant de pods de run
# tapent GDELT EN MÊME TEMPS → 429/bannissement de l'IP de sortie. On marque les runs
# d'ingestion d'un tag commun ; le déployeur fixe la limite (ex. 3-5 runs simultanés)
# côté instance Dagster (`run_queue.tag_concurrency_limits` du dagster.yaml, contrat
# cluster ADR 0033) — la VALEUR de la limite relève de l'infra, le TAG du code.
_INGEST_CONCURRENCY_TAG = {"mediawatch/ingest-source": "gdelt"}

# Le job d'ingestion sélectionne la couche NATIVE (pull HTTP du flux GKG) ET la couche
# PROJETÉE qui en dérive (ADR 0100) : raw_gkg dépend de raw_native_gkg, donc les deux
# sont matérialisés dans le MÊME run (même run_id → même préfixe dt=…/run=…, la
# projection lit exactement ce que la native vient d'écrire). Le job porte le câblage
# K8s du run (Secret S3 + lineage) + le tag de concurrence. Partitionné par jour (la
# définition de partition vient de l'asset).
ingestion_job = define_asset_job(
    "ingestion_job",
    selection=AssetSelection.assets("raw_native_gkg", "raw_gkg"),
    partitions_def=gkg_daily_partitions,
    tags={**RUN_K8S_CONFIG, **_INGEST_CONCURRENCY_TAG},
)

# Ingestion du référentiel d'universités : asset NON partitionné (instantané courant,
# évolue lentement). Job dédié, matérialisé ponctuellement (mensuel) par l'opérateur
# quand une nouvelle version du dump paraît — pas de schedule serré.
ref_job = define_asset_job(
    "ref_job",
    selection=AssetSelection.assets("ref_universities_snapshot"),
    tags=RUN_K8S_CONFIG,
)


# Ingestion QUASI TEMPS RÉEL (ADR 0064, PR 4) : toutes les 15 minutes on
# (re)matérialise la partition du JOUR COURANT, qui rapatrie les nouveaux fichiers
# 15 minutes du jour (idempotent — nouveau run=<id>). La cadence colle à la source
# (96 fichiers/jour). STOPPED par défaut : l'opérateur l'arme dans l'UI (pas
# d'ingestion silencieuse non voulue ; même posture que citation transform_daily).
# Le BACKFILL historique ne passe PAS par ce schedule : il se fait en matérialisant
# les partitions passées depuis l'UI (parallélisable, traçable).
@schedule(
    job=ingestion_job,
    cron_schedule="*/15 * * * *",
    default_status=DefaultScheduleStatus.STOPPED,
    execution_timezone="UTC",
    name="ingest_current_day",
)
def ingest_current_day(context: ScheduleEvaluationContext) -> RunRequest:
    """Matérialise la partition du jour courant (UTC) à chaque tick de 15 minutes."""
    partition_date = context.scheduled_execution_time.strftime("%Y-%m-%d")
    return RunRequest(partition_key=partition_date)


# Assets dbt + ressource CLI (ou [], {} si dbt indisponible — lint/checkout neuf).
_dbt_assets, _dbt_resources = dbt_components()

# timeline_manifest dépend du mart dbt marts_university_timeline (via AssetKey) : il
# s'exécute APRÈS le mart, dans le même run (même context.run_id → même préfixe
# dt=…/run=…). Ajouté inconditionnellement comme l'asset dbt : en mode dégradé (dbt
# absent), sa dépendance pend sur une clé externe non exécutable et la code-location
# reste chargeable (asset orphelin).
# forecast_university_timeline (ADR 0081) dépend du mart dbt marts_university_timeline ;
# forecast_manifest dépend de l'asset forecast. Ajoutés inconditionnellement comme
# timeline_manifest : en mode dégradé (dbt absent), leurs dépendances pendent et la
# code-location reste chargeable (assets orphelins).
_assets = [
    raw_native_gkg,
    raw_gkg,
    ref_universities_snapshot,
    timeline_manifest,
    forecast_university_timeline,
    forecast_manifest,
    *_dbt_assets,
]
_jobs = [ingestion_job, ref_job]

# Le check GE du curated cible les modèles dbt (clé curated_university_mentions) :
# enregistré UNIQUEMENT si les assets dbt existent, sinon sa cible n'est pas résolue
# en mode dégradé (dbt indisponible). Le check du brut, lui, est inconditionnel.
# evidently_forecast_drift cible l'asset Python forecast_university_timeline (toujours
# enregistré) → INCONDITIONNEL. Porte de sécurité bloquante sur la bascule served_mode
# (ADR 0081/0068).
_asset_checks = [ge_raw_native_gkg, ge_raw_gkg, evidently_forecast_drift]
if _dbt_assets:
    _asset_checks += [ge_curated_universities, ge_marts_timeline]

# Le transform_job enchaîne les modèles dbt (staging → curated, classification) PUIS
# l'écriture du manifest, dans un seul run. PARTITIONNÉ par jour (ADR 0064) : un run
# transforme exactement la partition du jour ingéré (event_day borne le scan du brut).
# Enregistré seulement si les assets dbt existent (sinon la sélection ne résout rien).
if _dbt_assets:
    transform_job = define_asset_job(
        "transform_job",
        selection=(
            AssetSelection.assets(*_dbt_assets)
            | AssetSelection.assets("timeline_manifest")
            | AssetSelection.assets("forecast_university_timeline")
            | AssetSelection.assets("forecast_manifest")
        ),
        partitions_def=gkg_daily_partitions,
        # Relaie DBT_S3_USE_SSL / MEDIAWATCH_REF_SOURCE aux pods de run (piège ADR 0086).
        tags=_transform_run_config(),
    )
    _jobs.append(transform_job)


# ── ENTRAÎNEMENT CONTINU (CT, MLOps 1→2 — ADR 0062) ──────────────────────────
# Le transform_job (dbt → manifest) se rejoue automatiquement, plus de re-trigger
# 100 % manuel. À PARITÉ avec citation, mais adapté à la STRUCTURE de mediawatch :
# le transform_job est PARTITIONNÉ par jour (gkg_daily_partitions) et il n'y a PAS
# de watermark — la partition `dt=YYYY-MM-DD` EST le curseur. Deux déclencheurs,
# tous deux STOPPED par défaut (le code PERMET la cadence, le déployeur l'ARME —
# ADR 0062/0031) et enregistrés UNIQUEMENT si transform_job existe (assets dbt) :
#   - un @schedule calendaire (transform_daily) qui rejoue la partition du JOUR ;
#   - un @sensor par signal (avancée des partitions ingérées) — CT sur de la donnée
#     VRAIMENT neuve, pas seulement au calendrier (même esprit qu'atlas#399).

# CADENCE = VALEUR D'INSTANCE (ADR 0062 : « le code PERMET la cadence ; activer le
# schedule et FIXER sa fréquence relèvent du DÉPLOYEUR »). On NE fige donc PAS la
# fréquence : elle se lit de MEDIAWATCH_CT_CRON (cron 5 champs), défaut QUOTIDIEN
# 03:00 UTC (heure creuse, décalé du 02:00 de citation pour étaler la charge) =
# simple exemple. Le déployeur la surcharge sans toucher au code (ou à l'armement).
_DEFAULT_CT_CRON = "0 3 * * *"


def _ct_cron(env: dict | None = None) -> str:
    """Cron du CT, lu de MEDIAWATCH_CT_CRON (valeur d'instance), défaut quotidien (exemple)."""
    env = env if env is not None else os.environ
    return env.get("MEDIAWATCH_CT_CRON") or _DEFAULT_CT_CRON


# GARDE-FOU ANTI-RAFALE. Au 1ᵉʳ armement après un gros backfill, des CENTAINES de
# partitions sont « nouvelles » d'un coup : sans borne, le sensor émettrait autant de
# RunRequest simultanés. On ne déclenche que les N partitions les PLUS RÉCENTES par
# tick (le reste suivra aux ticks d'après). N = valeur d'instance, défaut 7.
_DEFAULT_CT_MAX_PARTITIONS = 7


def _ct_max_partitions(env: dict | None = None) -> int:
    """Borne de partitions déclenchées par tick, lue de MEDIAWATCH_CT_MAX_PARTITIONS_PER_TICK.

    Valeur d'instance ; un défaut sain (7) ; toute valeur non entière ou ≤ 0 retombe sur
    le défaut (pas de borne nulle/négative qui figerait ou ferait diverger le sensor).
    """
    env = env if env is not None else os.environ
    raw = env.get("MEDIAWATCH_CT_MAX_PARTITIONS_PER_TICK")
    try:
        n = int(raw)
    except (TypeError, ValueError):
        return _DEFAULT_CT_MAX_PARTITIONS
    return n if n > 0 else _DEFAULT_CT_MAX_PARTITIONS


# `ingested_partitions` (signal de donnée neuve = dossiers `dt=YYYY-MM-DD` sous
# `raw/gkg/`) vit dans `partitions.py` — module neutre partagé avec drift_forecast
# (garde-fou anti-emballement de la boucle drift→retrain), pour éviter une dépendance
# circulaire definitions ↔ drift_forecast (ADR 0082).


def evaluate_ct_partitions(
    current: set[str], cursor: str | None, max_n: int
) -> tuple[list[str], str]:
    """Corps PUR (sans I/O ni Dagster) : décide quelles partitions (re)transformer.

    ``current`` : partitions ingérées observées au tick. ``cursor`` : sérialisé des
    partitions vues au dernier tick. Renvoie ``(à_lancer, new_cursor)`` :
    - ``new_cursor`` = ``current`` sérialisé (liste triée → déterministe, dédup) ;
    - ``à_lancer`` = partitions NOUVELLES (``current`` − ``cursor``), bornées aux ``max_n``
      PLUS RÉCENTES (anti-rafale ; le reste suivra aux ticks d'après), rendues en ordre
      CHRONOLOGIQUE (les plus anciennes d'abord) pour des RunRequest lisibles.
    - vide si rien de neuf (curseur inchangé) ou aucune partition (rien à transformer).
    """
    previous = set(json.loads(cursor)) if cursor else set()
    new_cursor = json.dumps(sorted(current))
    fresh = current - previous
    recent = sorted(fresh, reverse=True)[:max_n]
    return sorted(recent), new_cursor


_schedules = [ingest_current_day]
_sensors = []
if _dbt_assets:
    # CT calendaire : rejoue la partition du JOUR COURANT à chaque tick du cron
    # d'instance. Parité avec ingest_current_day (même cible : partition du jour).
    @schedule(
        job=transform_job,
        cron_schedule=_ct_cron(),
        default_status=DefaultScheduleStatus.STOPPED,
        execution_timezone="UTC",
        name="transform_daily",
    )
    def transform_daily(context: ScheduleEvaluationContext) -> RunRequest:
        """Entraînement continu : rejoue transform_job sur la partition du jour (UTC)."""
        partition_date = context.scheduled_execution_time.strftime("%Y-%m-%d")
        return RunRequest(partition_key=partition_date)

    _schedules.append(transform_daily)

    # CT par SIGNAL : un @sensor déclenche transform_job pour les partitions
    # FRAÎCHEMENT INGÉRÉES — réentraîner sur de la donnée vraiment neuve, pas
    # seulement au calendrier. Le signal est le listing des `dt=` sous `raw/gkg/` ;
    # on compare au curseur et on déclenche les nouvelles, bornées par tick.
    @sensor(
        name="transform_on_ingestion_advance",
        job=transform_job,
        default_status=DefaultSensorStatus.STOPPED,  # le déployeur l'arme (ADR 0062/0031)
        minimum_interval_seconds=300,  # éval 5 min max (les partitions bougent lentement)
        description="CT par signal : déclenche transform_job sur les partitions ingérées.",
    )
    def transform_on_ingestion_advance(context: SensorEvaluationContext):
        # Lecture best-effort du brut (rclone.conf temporaire, comme les assets) : sans
        # accès S3 (dev/CI), le sensor SKIP proprement plutôt que d'échouer.
        try:
            target = ceph_target_from_env()
            with tempfile.TemporaryDirectory() as tmp:
                config_path = Path(tmp) / "rclone.conf"
                config_path.write_text(render_rclone_config(target))
                proc = _run_rclone(
                    ["lsjson", "-R", "--dirs-only", f"ceph:{target.bucket}/raw/gkg"],
                    config_path,
                )
            if proc.returncode != 0:
                yield SkipReason(f"raw/gkg illisible (rclone) : {proc.stderr.strip()}")
                return
            current = ingested_partitions(parse_lsjson_entries(proc.stdout))
        except Exception as exc:  # noqa: BLE001 — pas d'accès S3 : on n'échoue pas le sensor
            yield SkipReason(f"partitions illisibles (accès S3 indisponible) : {exc}")
            return
        to_run, new_cursor = evaluate_ct_partitions(current, context.cursor, _ct_max_partitions())
        context.update_cursor(new_cursor)
        if to_run:
            for partition_date in to_run:
                # run_key = la partition → Dagster dédoublonne : un même jour ne relance pas.
                yield RunRequest(partition_key=partition_date, run_key=f"ingest-{partition_date}")
        else:
            yield SkipReason("aucune partition neuve depuis le dernier tick (rien à réentraîner)")

    _sensors.append(transform_on_ingestion_advance)


# ── BOUCLE FERMÉE DÉRIVE → RÉENTRAÎNEMENT (CT autonome mediawatch, ADR 0082) ──
# Généralise à mediawatch le patron de l'ADR 0079 (citation), maintenant que le modèle
# de prévision (ADR 0081) fournit un signal de dérive. La dérive mesurée par
# evidently_forecast_drift (verdict persisté en S3) déclenche AUTOMATIQUEMENT un
# réentraînement (transform_job). RUNNING par défaut (le déployeur OPT-OUT via
# MEDIAWATCH_RETRAIN_AUTO=off), comme citation — rupture avec « le déployeur arme ».
#
# GARDE-FOU ANTI-EMBALLEMENT (terminaison prouvée). Réentraîner sur la MÊME donnée ne
# dissipe pas la dérive (elle vient de la donnée neuve). On ne réentraîne donc QUE si
# les PARTITIONS GKG ingérées ont AVANCÉ depuis le dernier retrain. Le retrain ne
# ré-ingère pas → le run post-retrain re-mesure la dérive sur les MÊMES partitions →
# SKIP : point fixe en 1 itération. Plus : dédup par run_id du verdict, et cooldown.


def _retrain_auto_enabled(env: dict | None = None) -> bool:
    """La boucle est-elle armée ? ACTIVE PAR DÉFAUT ; le déployeur DÉSARME via
    MEDIAWATCH_RETRAIN_AUTO ∈ {off,0,false,no} (opt-out, ADR 0082)."""
    env = env if env is not None else os.environ
    return (env.get("MEDIAWATCH_RETRAIN_AUTO") or "on").strip().lower() not in {
        "off",
        "0",
        "false",
        "no",
    }


_DEFAULT_RETRAIN_COOLDOWN_S = 6 * 3600  # 6 h — anti-flapping, valeur d'instance


def _retrain_cooldown_s(env: dict | None = None) -> int:
    """Cooldown minimal entre deux retrains auto, lu de MEDIAWATCH_RETRAIN_COOLDOWN_S
    (valeur d'instance) ; défaut 6 h ; valeur invalide/négative → défaut."""
    env = env if env is not None else os.environ
    try:
        n = int(env.get("MEDIAWATCH_RETRAIN_COOLDOWN_S"))
    except (TypeError, ValueError):
        return _DEFAULT_RETRAIN_COOLDOWN_S
    return n if n >= 0 else _DEFAULT_RETRAIN_COOLDOWN_S


def evaluate_drift_retrain(
    verdict: dict, cursor: str | None, cooldown_ok: bool
) -> tuple[bool, str, str]:
    """Corps PUR (sans I/O ni Dagster ni horloge) : décide si un verdict de dérive du
    modèle de prévision déclenche un réentraînement. Garantit la TERMINAISON.

    ``verdict`` : document lu en S3 (``read_drift_verdict``) — ``{run_id, drift_detected,
    partitions, …}``. ``cursor`` : sérialisé de ``{last_verdict_run, last_retrain_parts}``.
    ``cooldown_ok`` : l'horloge autorise-t-elle un retrain. Renvoie
    ``(should_retrain, run_key, new_cursor)``.

    SKIP (dans l'ordre) : verdict vide/schéma inconnu ; même run_id (dédup) ; pas de dérive ;
    partitions vues == celles du dernier retrain (ANTI-EMBALLEMENT — pas de donnée neuve) ;
    cooldown KO. Sinon RETRAIN : ``run_key = drift-retrain:<run_id>``, curseur mémorise le
    run_id et les partitions déclencheuses."""
    prev = json.loads(cursor) if cursor else {}
    last_run = prev.get("last_verdict_run")
    last_parts = prev.get("last_retrain_parts")

    run_id = verdict.get("run_id")
    seen_parts = json.dumps(sorted(verdict.get("partitions", [])))

    def _cursor(retrain_parts: str | None) -> str:
        return json.dumps(
            {
                "last_verdict_run": run_id if run_id else last_run,
                "last_retrain_parts": retrain_parts if retrain_parts is not None else last_parts,
            },
            sort_keys=True,
        )

    if not run_id or verdict.get("schema_version") != 1:
        return False, "", _cursor(None)
    if run_id == last_run:  # dédup : verdict déjà traité
        return False, "", _cursor(None)
    if not verdict.get("drift_detected"):  # pas de dérive → rien à réentraîner
        return False, "", _cursor(None)
    if seen_parts == last_parts:  # ANTI-EMBALLEMENT : pas de donnée neuve depuis le dernier retrain
        return False, "", _cursor(None)
    if not cooldown_ok:  # ceinture-bretelles anti-flapping
        return False, "", _cursor(None)
    # Retrain : on avance last_retrain_parts aux partitions déclencheuses (terminaison).
    return True, f"drift-retrain:{run_id}", _cursor(seen_parts)


if _dbt_assets and _retrain_auto_enabled():
    _retrain_cooldown = _retrain_cooldown_s()
    _last_retrain_at = {"ts": 0.0}  # horloge du cooldown, hors de la fonction pure

    @sensor(
        name="retrain_on_drift",
        job=transform_job,
        default_status=DefaultSensorStatus.RUNNING,  # ACTIF par défaut (ADR 0082, opt-out)
        minimum_interval_seconds=300,
        description="CT autonome : réentraîne quand la dérive est confirmée ET la donnée a avancé.",
    )
    def retrain_on_drift(context: SensorEvaluationContext):
        # Lecture best-effort du verdict de dérive persisté en S3 (rclone.conf temporaire) :
        # sans accès S3 (dev/CI), le sensor SKIP proprement.
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
