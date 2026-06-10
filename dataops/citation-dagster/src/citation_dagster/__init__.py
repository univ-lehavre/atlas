"""Code-location Dagster du pipeline de citations (ADR 0055).

Expose les assets DataOps (ingestion du snapshot OpenAlex, transformations) à
l'orchestrateur Dagster du cluster via un serveur gRPC. Point d'entrée :
``citation_dagster.definitions``.
"""
