"""Point d'entrée de la code-location Dagster « scholar-network ».

Chargé par le serveur gRPC (``dagster api grpc -m scholar_network_dagster.definitions``)
que l'orchestrateur Dagster du cluster découvre via son workspace.

Chaîne des 5 assets (recompute intégral mensuel, ADR 0103 ; un seul ``ingestion_job``) :

- ``prefiltered_raw`` — brut pré-filtré (``≥2016 ∧ type=article``, projeté) + cache (lot 2) ;
- ``researchers`` — passe 1, table des chercheurs affiliés au réseau (lot 3) ;
- ``scholar_works`` — passe 2, semi-jointure → tous les articles ≥2016 des chercheurs (lot 4) ;
- ``scholar_profiles`` — embedding topics+keywords, moyenne + L2 par chercheur (lot 5) ;
- ``index_load`` — charge les profils dans l'index pgvector (lot 5c).
"""

from dagster import AssetSelection, Definitions, define_asset_job

from scholar_network_dagster.assets.index_load import index_load
from scholar_network_dagster.assets.passes import researchers, scholar_works
from scholar_network_dagster.assets.prefilter import prefiltered_raw
from scholar_network_dagster.assets.profiles import scholar_profiles

# Chaîne des 5 assets (recompute intégral mensuel, ADR 0103) : prefiltered_raw → researchers
# (passe 1) → scholar_works (passe 2) → scholar_profiles → index_load (pgvector). Les
# dépendances (deps=AssetKey) ordonnent l'exécution dans le run.
_assets = [
    prefiltered_raw,
    researchers,
    scholar_works,
    scholar_profiles,
    index_load,
]

# Un seul job enchaîne toute la chaîne dans un même run (même run_id → mêmes préfixes run=).
ingestion_job = define_asset_job("ingestion_job", selection=AssetSelection.all())

defs = Definitions(assets=_assets, jobs=[ingestion_job])
