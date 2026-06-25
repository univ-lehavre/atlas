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
import re
import tempfile
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

from mediawatch_dagster.assets import raw_gkg, ref_universities_snapshot, timeline_manifest
from mediawatch_dagster.assets.manifest import _run_rclone, parse_lsjson_entries
from mediawatch_dagster.assets.quality import (
    ge_curated_universities,
    ge_marts_timeline,
    ge_raw_gkg,
)
from mediawatch_dagster.assets.raw_gkg import gkg_daily_partitions
from mediawatch_dagster.dbt import dbt_components
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

# Le job d'ingestion ne sélectionne que raw_gkg (le pull HTTP du flux GKG). Il
# porte le câblage K8s du run (Secret S3 + lineage) + le tag de concurrence.
# Partitionné par jour (la définition de partition vient de l'asset).
ingestion_job = define_asset_job(
    "ingestion_job",
    selection=AssetSelection.assets("raw_gkg"),
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
_assets = [raw_gkg, ref_universities_snapshot, timeline_manifest, *_dbt_assets]
_jobs = [ingestion_job, ref_job]

# Le check GE du curated cible les modèles dbt (clé curated_university_mentions) :
# enregistré UNIQUEMENT si les assets dbt existent, sinon sa cible n'est pas résolue
# en mode dégradé (dbt indisponible). Le check du brut, lui, est inconditionnel.
_asset_checks = [ge_raw_gkg]
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
            AssetSelection.assets(*_dbt_assets) | AssetSelection.assets("timeline_manifest")
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


# Une partition ingérée = un dossier `dt=YYYY-MM-DD` sous `raw/gkg/` (cf. raw_gkg :
# `raw/gkg/dt=<date>/run=<id>/…`). On capte le `dt=` même AVANT qu'un `run=` n'existe.
_DT_RE = re.compile(r"(?:^|/)dt=(\d{4}-\d{2}-\d{2})(?:/|$)")


def ingested_partitions(entries: list[dict]) -> set[str]:
    """Extrait les dates de partition (``dt=YYYY-MM-DD``) distinctes d'un lsjson de raw/gkg.

    ``entries`` = sortie ``rclone lsjson -R`` (champs ``Path`` relatif au préfixe listé).
    Best-effort : un chemin sans ``dt=`` conforme est ignoré (ne casse pas le scan).
    """
    found: set[str] = set()
    for entry in entries:
        match = _DT_RE.search(entry.get("Path", ""))
        if match:
            found.add(match.group(1))
    return found


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


defs = Definitions(
    assets=_assets,
    asset_checks=_asset_checks,
    jobs=_jobs,
    schedules=_schedules,
    sensors=_sensors,
    resources=_dbt_resources,
)
