"""Point d'entrée de la code-location Dagster « mediawatch ».

Chargé par le serveur gRPC (``dagster api grpc -m mediawatch_dagster.definitions``)
que l'orchestrateur Dagster du cluster découvre via son workspace.

Lots livrés / à venir :
- ``raw_gkg`` + ``ingestion_job`` + GE du brut (PR 2, livré) ;
- modèles dbt (classification université) + GE curated (PR 3, livré) ;
- mart ``university_timeline`` + manifest + schedule (PR 4).

Le câblage K8s des pods de run (run workers) est commun à tous les lots : injection
du Secret S3 du lakehouse et des variables OpenLineage au niveau du RUN.
"""

from dagster import AssetSelection, Definitions, define_asset_job

from mediawatch_dagster.assets import raw_gkg
from mediawatch_dagster.assets.quality import ge_curated_universities, ge_raw_gkg
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

# Le job d'ingestion ne sélectionne que raw_gkg (le pull HTTP du flux GKG). Il
# porte le câblage K8s du run (Secret S3 + lineage).
ingestion_job = define_asset_job(
    "ingestion_job",
    selection=AssetSelection.assets("raw_gkg"),
    tags=RUN_K8S_CONFIG,
)

# Assets dbt + ressource CLI (ou [], {} si dbt indisponible — lint/checkout neuf).
_dbt_assets, _dbt_resources = dbt_components()

_assets = [raw_gkg, *_dbt_assets]
_jobs = [ingestion_job]

# Le check GE du curated cible les modèles dbt (clé curated_university_mentions) :
# enregistré UNIQUEMENT si les assets dbt existent, sinon sa cible n'est pas résolue
# en mode dégradé (dbt indisponible). Le check du brut, lui, est inconditionnel.
_asset_checks = [ge_raw_gkg]
if _dbt_assets:
    _asset_checks.append(ge_curated_universities)

# Le transform_job enchaîne les modèles dbt (staging → curated, classification). Il
# n'est enregistré QUE si les assets dbt existent : un job dont la sélection ne résout
# aucun asset ferait échouer la construction des Definitions. En prod le manifest est
# packagé → les assets dbt sont présents. Le mart + son manifest s'y ajouteront (PR 4).
if _dbt_assets:
    transform_job = define_asset_job(
        "transform_job",
        selection=AssetSelection.assets(*_dbt_assets),
        tags=RUN_K8S_CONFIG,
    )
    _jobs.append(transform_job)

defs = Definitions(
    assets=_assets,
    asset_checks=_asset_checks,
    jobs=_jobs,
    schedules=[],
    resources=_dbt_resources,
)
