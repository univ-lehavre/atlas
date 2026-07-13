"""Code-location Dagster « scholar-network » (ADR 0103, ADR 0055).

Cartographie un réseau de chercheurs (l'alliance EUNICoast, en description) par une
ingestion en deux passes sur un brut pré-filtré, puis profile chaque chercheur par un
embedding sémantique de sa production. Autonome et disjointe de `citation` (code réutilisé
= copié, jamais importé — ADR 0055). Point d'entrée gRPC : ``scholar_network_dagster.definitions``.
"""
