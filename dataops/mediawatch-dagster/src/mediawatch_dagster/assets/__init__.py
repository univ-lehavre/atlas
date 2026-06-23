"""Assets DataOps de la code-location « mediawatch ».

Lots :
- ``raw_gkg`` — ingestion du brut GKG par pull HTTP incrémental (PR 2) ;
- modèles dbt ``staging`` → ``curated`` → ``marts`` (PR 3) ;
- ``timeline_manifest`` — contrat Parquet du mart servi (PR 4).
"""

from mediawatch_dagster.assets.raw_gkg import raw_gkg

__all__ = ["raw_gkg"]
