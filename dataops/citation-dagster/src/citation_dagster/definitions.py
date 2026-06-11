"""Point d'entrée de la code-location Dagster.

Chargé par le serveur gRPC (``dagster api grpc -m citation_dagster.definitions``)
que l'orchestrateur Dagster du cluster découvre via son workspace.

Deux familles d'assets :
- ``raw_snapshot`` — ingestion du brut OpenAlex (étape 2) ;
- les modèles dbt ``staging`` → ``curated`` (étape 3.2), exposés via
  ``dagster-dbt`` (``citation_dagster.dbt``).
"""

from dagster import AssetSelection, Definitions, define_asset_job

from citation_dagster.assets import raw_snapshot
from citation_dagster.dbt import dbt_components

# Le pod de run (K8sRunLauncher) doit recevoir les accès S3 du lakehouse : on
# injecte le Secret citation-s3-access via les tags k8s au niveau du RUN (et non
# de l'op — en mode multiprocess, seule la config run-level configure le pod).
# Le job de transformation dbt en a besoin AUSSI : dbt-duckdb crée son secret S3
# depuis l'environnement (profiles.yml + env_var) à l'ouverture de session.
_RUN_K8S_CONFIG = {
    "dagster-k8s/config": {
        "container_config": {
            "env_from": [{"secret_ref": {"name": "citation-s3-access"}}],
        },
    },
}

ingestion_job = define_asset_job(
    "ingestion_job",
    selection=AssetSelection.assets("raw_snapshot"),
    tags=_RUN_K8S_CONFIG,
)

# Assets dbt + ressource CLI (ou [], {} si dbt indisponible — lint/checkout neuf).
_dbt_assets, _dbt_resources = dbt_components()

_assets = [raw_snapshot, *_dbt_assets]
_jobs = [ingestion_job]

# Le job de transformation n'est enregistré QUE si les assets dbt existent : un
# job dont la sélection ne résout aucun asset ferait échouer la construction des
# Definitions. En prod le manifest est packagé → les assets dbt sont présents.
if _dbt_assets:
    transform_job = define_asset_job(
        "transform_job",
        selection=AssetSelection.assets(*_dbt_assets),
        tags=_RUN_K8S_CONFIG,
    )
    _jobs.append(transform_job)

defs = Definitions(assets=_assets, jobs=_jobs, resources=_dbt_resources)
