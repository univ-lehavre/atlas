"""Point d'entrée de la code-location Dagster « pageviews ».

Chargé par le serveur gRPC (``dagster api grpc -m pageviews_dagster.definitions``)
que l'orchestrateur Dagster du cluster découvre via son workspace.

Pipeline : PRÉVISION des VUES Wikipédia des établissements (ADR 0098). La source est
HTTP (dumps mensuels ``pageview_complete`` de Wikimedia + API REST Pageviews + SPARQL
Wikidata + API OpenAlex) : ces briques ne sont NOMMÉES qu'en prose ; les identifiants
d'objets restent neutres (« pageviews », ADR 0022/0035). La série est MENSUELLE (grain
``(university_id, month, views)``), à saisonnalité annuelle — pas de partition journalière.

Assets livrés :
- ``ref_universities`` (référentiel établissements → page Wikipédia, non partitionné) et
  ``raw_pageviews`` (collecte incrémentale des vues mensuelles, watermark) → ``ingestion_job`` ;
- modèles dbt (``staging`` → ``curated`` → ``marts/views_timeline``, partition MENSUELLE),
  ``forecast_views`` (modèle de prévision servi) puis ``forecast_manifest`` (contrat
  ADR 0029) → ``transform_job``.

Dégradation propre : ``dbt_components()`` renvoie ``([], {})`` si dbt/le manifest est
indisponible (checkout de travail où ``pageviews-dbt`` est encore vide, lint léger,
collecte pytest sans dbt). Les assets Python sont enregistrés INCONDITIONNELLEMENT ; ceux
qui CIBLENT dbt (le ``transform_job`` complet) le sont conditionnellement.

Le câblage K8s des pods de run (run workers) est commun à tous les lots : injection du
Secret S3 du lakehouse et des variables OpenLineage/MLflow AU NIVEAU DU RUN (piège
ADR 0086 : les variables posées sur le Deployment de la code-location gRPC NE se propagent
PAS aux pods de run du K8sRunLauncher).

NB : pas de ``from __future__ import annotations`` — ce module construit des Definitions
que Dagster introspecte (leçon drift D9).
"""

import os

from dagster import (
    AssetSelection,
    DefaultScheduleStatus,
    Definitions,
    ScheduleDefinition,
    define_asset_job,
)

from pageviews_dagster.assets.drift_forecast import evidently_forecast_drift
from pageviews_dagster.assets.forecast import forecast_views
from pageviews_dagster.assets.manifest import forecast_manifest
from pageviews_dagster.assets.quality import ge_marts_views_forecast, ge_raw_pageviews
from pageviews_dagster.assets.raw_pageviews import raw_pageviews
from pageviews_dagster.assets.ref_universities_snapshot import ref_universities
from pageviews_dagster.dbt import dbt_components

# Le pod de run (K8sRunLauncher) doit recevoir les accès S3 du lakehouse : on injecte le
# Secret pageviews-s3-access via les tags k8s au niveau du RUN (et non de l'op — en mode
# multiprocess, seule la config run-level configure le pod).
#
# Piège ADR 0086 (contrat cluster) : les variables posées sur le Deployment de la
# code-location gRPC (OPENLINEAGE_URL…, MLFLOW_TRACKING_URI) NE se propagent PAS aux pods
# de run du K8sRunLauncher. Sans les réinjecter ICI, l'émission de lineage (lineage.emit
# no-op si OPENLINEAGE_URL absent) et le tracking MLflow (tracking.log_run no-op si
# MLFLOW_TRACKING_URI absent) tombent en no-op SILENCIEUX dans le run (run SUCCESS mais
# rien d'émis/loggué). On les déclare donc au niveau du run via container_config.env. Hosts
# en forme COURTE `<svc>.<ns>` (marquez.marquez / mlflow.mlflow) et NON le FQDN
# `…svc.cluster.local` : en prod, un search domain externe (resolv.conf, ndots:5) fait
# timeouter la résolution du FQDN complet côté pod de run (cf. univ-lehavre/cluster#458).
# Ces valeurs DOIVENT rester identiques à code-location.yaml (sinon Deployment gRPC ≠ pods
# de run).
_RUN_ENV = [
    {"name": "OPENLINEAGE_URL", "value": "http://marquez.marquez:5000"},
    {"name": "OPENLINEAGE_ENDPOINT", "value": "api/v1/lineage"},
    {"name": "OPENLINEAGE_NAMESPACE", "value": "dagster"},
    # Suivi MLflow du modèle de prévision (ADR 0098) : comme OPENLINEAGE_URL, cette var
    # posée sur le Deployment gRPC NE se propage PAS aux pods de run (piège contrat cluster)
    # — on la réinjecte ICI au niveau du run, sinon le tracking tombe en no-op silencieux
    # dans le pod de run. Host en forme COURTE <svc>.<ns> (note DNS prod).
    {"name": "MLFLOW_TRACKING_URI", "value": "http://mlflow.mlflow:5000"},
]


def _s3_env_from() -> list[dict]:
    """`env_from` des pods de run pour les creds S3 (AWS_*/BUCKET_*), par profil.

    Le NOM des ressources S3 est une valeur d'INSTANCE, pas une constante : la SOURCE diffère
    selon le profil (comme l'envFrom du Deployment, cf. overlays) :
      - banc léger (SeaweedFS) : UN Secret unique porte AWS_* ET BUCKET_* ;
      - prod (ObjectBucketClaim Rook) : un Secret (AWS_*) ET un ConfigMap (BUCKET_*), tous
        deux du nom de la claim `pageviews-datalake` (≠ `pageviews-s3-access`).
    On lit donc les noms de l'env du pod gRPC (posés par chaque overlay via
    `PAGEVIEWS_S3_SECRET` / `PAGEVIEWS_S3_CONFIGMAP`) au lieu de les coder en dur :
    `PAGEVIEWS_S3_SECRET` (défaut `pageviews-s3-access` au banc / tests) toujours en
    `secret_ref` ; `PAGEVIEWS_S3_CONFIGMAP` ajouté en `config_map_ref` UNIQUEMENT s'il est
    défini (prod : ConfigMap BUCKET_* de l'OBC ; banc : absent, le Secret unique porte déjà
    BUCKET_*). Sans ce paramétrage, le nom codé en dur ferait échouer le pod de run en prod
    (« Secret not found » : l'OBC ne crée pas `pageviews-s3-access`).
    """
    secret = os.environ.get("PAGEVIEWS_S3_SECRET", "pageviews-s3-access")
    env_from = [{"secret_ref": {"name": secret}}]
    configmap = os.environ.get("PAGEVIEWS_S3_CONFIGMAP")
    if configmap:
        env_from.append({"config_map_ref": {"name": configmap}})
    return env_from


def _run_k8s_config() -> dict:
    """Config K8s des pods de run : accès S3 + RELAIS des vars d'env de l'overlay prod.

    Piège ADR 0086 : les vars posées sur le Deployment gRPC (overlay prod :
    ``DBT_S3_USE_SSL``, ``PAGEVIEWS_REF_SOURCE``) NE se propagent PAS aux pods de run. Or
    dbt-duckdb (SSL) ET ``raw_pageviews``/``build_dbt_vars`` (ref_source) les lisent DANS
    le pod de run. Ce module étant importé dans le Deployment gRPC, ``os.environ`` y porte
    les valeurs de l'overlay : on les RELAIE explicitement au niveau du run (valeurs
    absentes au banc → défauts ``false``/``seed``, inchangé).

    Utilisé par les DEUX jobs : ``ingestion_job`` (``raw_pageviews`` lit
    ``PAGEVIEWS_REF_SOURCE`` pour trouver le référentiel INGÉRÉ — drift D25 : l'ancien
    ``ingestion_job`` utilisait une config SANS relais → le run retombait sur ``seed`` et ne
    trouvait pas le référentiel écrit sous ``source=ingested``) ET ``transform_job`` (dbt).
    """
    relayed = [
        {"name": name, "value": os.environ[name]}
        for name in ("DBT_S3_USE_SSL", "PAGEVIEWS_REF_SOURCE")
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


# Le job d'ingestion matérialise le référentiel PUIS le brut des vues, dans un seul run :
# ``ref_universities`` (référentiel établissements → page Wikipédia) et ``raw_pageviews``
# (collecte incrémentale des vues mensuelles, qui DÉPEND du référentiel). Tous deux sont
# NON partitionnés Dagster (le référentiel est un instantané courant ; le brut est piloté
# par WATERMARK, pas par partition — le mois collecté est un curseur interne, cf.
# ``months_to_collect``). Le job porte le câblage K8s du run (Secret S3 + lineage/MLflow).
ingestion_job = define_asset_job(
    "ingestion_job",
    selection=AssetSelection.assets("ref_universities", "raw_pageviews"),
    # Relaie PAGEVIEWS_REF_SOURCE au pod de run : raw_pageviews en a besoin pour lire le
    # référentiel INGÉRÉ (source=ingested), sinon défaut seed → « No files found » (drift D25).
    tags=_run_k8s_config(),
)


# Assets dbt + ressource CLI (ou [], {} si dbt indisponible — lint / checkout neuf où
# ``pageviews-dbt`` est encore vide).
_dbt_assets, _dbt_resources = dbt_components()

# Assets Python enregistrés INCONDITIONNELLEMENT (la code-location reste chargeable même
# sans dbt : leurs dépendances sur les clés dbt pendent alors comme clés externes non
# exécutables — assets orphelins). forecast_views dépend du mart dbt marts_views_timeline
# (via AssetKey) ; forecast_manifest dépend de forecast_views. Les assets dbt s'ajoutent
# quand ils existent.
_assets = [
    ref_universities,
    raw_pageviews,
    forecast_views,
    forecast_manifest,
    *_dbt_assets,
]
_jobs = [ingestion_job]

# Asset checks GE + drift. Tous CIBLENT des assets Python (raw_pageviews / forecast_views)
# toujours enregistrés → INCONDITIONNELS (aucun ne cible un modèle dbt, donc aucune cible
# non résolue en mode dégradé) :
#   - ge_raw_pageviews : porte bloquante du brut de la série mensuelle des vues ;
#   - ge_marts_views_forecast : porte bloquante du mart de prévision servi ;
#   - evidently_forecast_drift : porte de sécurité sur la bascule served_mode (ADR 0098/0068).
_asset_checks = [ge_raw_pageviews, ge_marts_views_forecast, evidently_forecast_drift]

# Le transform_job enchaîne les modèles dbt (staging → curated → mart views_timeline) PUIS
# la prévision (forecast_views) et l'écriture du manifest (forecast_manifest), dans un seul
# run. Enregistré SEULEMENT si les assets dbt existent (sinon la sélection des modèles dbt
# ne résout rien). PARTITIONNÉ par MOIS (la série est mensuelle, ADR 0098) : la définition
# de partition mensuelle vient des assets dbt (pageviews_monthly_partitions) ; forecast_views
# et forecast_manifest ne sont pas partitionnés Dagster mais s'exécutent dans le même run,
# en aval du mart, via leurs dépendances de clé.
if _dbt_assets:
    transform_job = define_asset_job(
        "transform_job",
        selection=(
            AssetSelection.assets(*_dbt_assets)
            | AssetSelection.assets("forecast_views")
            | AssetSelection.assets("forecast_manifest")
        ),
        # Relaie DBT_S3_USE_SSL / PAGEVIEWS_REF_SOURCE aux pods de run (piège ADR 0086).
        tags=_run_k8s_config(),
    )
    _jobs.append(transform_job)


# ── INGESTION CALENDAIRE MENSUELLE ───────────────────────────────────────────
# La source publie les vues au grain MENSUEL : un run par mois suffit (le brut est
# incrémental et idempotent — le watermark ne recollecte pas un mois déjà pris). CADENCE =
# VALEUR D'INSTANCE (ADR 0062 : « le code PERMET la cadence ; activer le schedule et FIXER
# sa fréquence relèvent du DÉPLOYEUR ») : on NE fige pas la fréquence, elle se lit de
# PAGEVIEWS_INGEST_CRON (cron 5 champs), défaut le 3 du mois à 04:00 UTC (heure creuse,
# après publication du dump du mois révolu) = simple exemple. STOPPED par défaut :
# l'opérateur l'arme dans l'UI (pas d'ingestion silencieuse non voulue).
_DEFAULT_INGEST_CRON = "0 4 3 * *"


def _ingest_cron(env: dict | None = None) -> str:
    """Cron de l'ingestion, lu de PAGEVIEWS_INGEST_CRON (valeur d'instance), défaut mensuel."""
    env = env if env is not None else os.environ
    return env.get("PAGEVIEWS_INGEST_CRON") or _DEFAULT_INGEST_CRON


# ScheduleDefinition (et non @schedule) : ni partition ni logique de RunRequest à porter
# (le job d'ingestion n'est pas partitionné), un simple déclencheur calendaire suffit.
ingest_monthly = ScheduleDefinition(
    name="ingest_monthly",
    job=ingestion_job,
    cron_schedule=_ingest_cron(),
    default_status=DefaultScheduleStatus.STOPPED,  # le déployeur l'arme (ADR 0062/0031)
    execution_timezone="UTC",
)

_schedules = [ingest_monthly]
_sensors = []


defs = Definitions(
    assets=_assets,
    asset_checks=_asset_checks,
    jobs=_jobs,
    schedules=_schedules,
    sensors=_sensors,
    resources=_dbt_resources,
)
