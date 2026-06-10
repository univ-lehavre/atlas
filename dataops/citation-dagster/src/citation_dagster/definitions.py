"""Point d'entrée de la code-location Dagster.

Chargé par le serveur gRPC (``dagster api grpc -m citation_dagster.definitions``)
que l'orchestrateur Dagster du cluster découvre via son workspace.
"""

from dagster import AssetSelection, Definitions, define_asset_job

from citation_dagster.assets import raw_snapshot

# Le pod de run (K8sRunLauncher) doit recevoir les accès S3 du lakehouse : on
# injecte le Secret citation-s3-access via les tags k8s au niveau du RUN (et non
# de l'op — en mode multiprocess, seule la config run-level configure le pod).
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

defs = Definitions(assets=[raw_snapshot], jobs=[ingestion_job])
