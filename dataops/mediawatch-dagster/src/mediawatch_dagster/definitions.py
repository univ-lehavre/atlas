"""Point d'entrée de la code-location Dagster « mediawatch ».

Chargé par le serveur gRPC (``dagster api grpc -m mediawatch_dagster.definitions``)
que l'orchestrateur Dagster du cluster découvre via son workspace.

Au scaffold (ADR 0064, PR 1), aucune définition d'asset n'est encore livrée : les
``Definitions`` sont volontairement **vides** mais la code-location reste
**chargeable** (le serveur gRPC démarre, la location apparaît dans l'UI). Les
assets, jobs, asset checks et schedules sont ajoutés par lots :
- ``raw_gkg`` + ``ingestion_job`` + GE du brut (PR 2) ;
- modèles dbt + classification université + GE (PR 3) ;
- mart ``university_timeline`` + manifest + schedule (PR 4).

Le câblage K8s des pods de run (run workers) est déjà posé ici car il est commun à
tous les lots : injection du Secret S3 du lakehouse et des variables OpenLineage au
niveau du RUN.
"""

from dagster import Definitions

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

defs = Definitions(
    assets=[],
    asset_checks=[],
    jobs=[],
    schedules=[],
)
