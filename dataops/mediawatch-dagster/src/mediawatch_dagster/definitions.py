"""Point d'entrée de la code-location Dagster « mediawatch ».

Chargé par le serveur gRPC (``dagster api grpc -m mediawatch_dagster.definitions``)
que l'orchestrateur Dagster du cluster découvre via son workspace.

Lots livrés / à venir :
- ``raw_gkg`` + ``ingestion_job`` + GE du brut (PR 2, livré) ;
- modèles dbt (classification université) + GE curated (PR 3, livré) ;
- ``raw_gkg`` partitionné par jour + schedule 15 min (PR 4, livré) ;
- mart ``university_timeline`` + manifest (PR 4).

Le câblage K8s des pods de run (run workers) est commun à tous les lots : injection
du Secret S3 du lakehouse et des variables OpenLineage au niveau du RUN.
"""

import os

from dagster import (
    AssetSelection,
    DefaultScheduleStatus,
    Definitions,
    RunRequest,
    ScheduleEvaluationContext,
    define_asset_job,
    schedule,
)

from mediawatch_dagster.assets import raw_gkg, ref_universities_snapshot, timeline_manifest
from mediawatch_dagster.assets.quality import (
    ge_curated_universities,
    ge_marts_timeline,
    ge_raw_gkg,
)
from mediawatch_dagster.assets.raw_gkg import gkg_daily_partitions
from mediawatch_dagster.dbt import dbt_components

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
RUN_K8S_CONFIG = {
    "dagster-k8s/config": {
        "container_config": {
            "env": _RUN_ENV,
            "env_from": [{"secret_ref": {"name": "mediawatch-s3-access"}}],
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
                "env_from": [{"secret_ref": {"name": "mediawatch-s3-access"}}],
            },
        },
    }


# Le job d'ingestion ne sélectionne que raw_gkg (le pull HTTP du flux GKG). Il
# porte le câblage K8s du run (Secret S3 + lineage). Partitionné par jour (la
# définition de partition vient de l'asset).
ingestion_job = define_asset_job(
    "ingestion_job",
    selection=AssetSelection.assets("raw_gkg"),
    partitions_def=gkg_daily_partitions,
    tags=RUN_K8S_CONFIG,
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

# Le transform_job enchaîne les modèles dbt (staging → curated, classification). Il
# n'est enregistré QUE si les assets dbt existent : un job dont la sélection ne résout
# aucun asset ferait échouer la construction des Definitions. En prod le manifest est
# packagé → les assets dbt sont présents. Le mart + son manifest s'y ajouteront (PR 4).
if _dbt_assets:
    transform_job = define_asset_job(
        "transform_job",
        # Enchaîne les modèles dbt PUIS l'écriture du manifest (sentinelle servie),
        # dans un seul run (même préfixe dt=…/run=…).
        selection=(
            AssetSelection.assets(*_dbt_assets) | AssetSelection.assets("timeline_manifest")
        ),
        # Relaie DBT_S3_USE_SSL / MEDIAWATCH_REF_SOURCE aux pods de run (piège ADR 0086).
        tags=_transform_run_config(),
    )
    _jobs.append(transform_job)

defs = Definitions(
    assets=_assets,
    asset_checks=_asset_checks,
    jobs=_jobs,
    schedules=[ingest_current_day],
    resources=_dbt_resources,
)
