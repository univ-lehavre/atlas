"""Code-location Dagster de la veille médiatique (ADR 0055, ADR 0064).

Expose les assets DataOps de la collecte « mediawatch » (ingestion du GKG v2 de
GDELT, transformations, mart du chronogramme par université) à l'orchestrateur
Dagster du cluster via un serveur gRPC. Point d'entrée :
``mediawatch_dagster.definitions``.
"""
