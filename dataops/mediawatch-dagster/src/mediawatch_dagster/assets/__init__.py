"""Assets DataOps de la code-location « mediawatch ».

Lots :
- ``raw_gkg`` — ingestion du brut GKG par pull HTTP partitionné (PR 2/4) ;
- modèles dbt ``staging`` → ``curated`` → ``marts`` (PR 3/4) ;
- ``timeline_manifest`` — contrat Parquet du mart servi (PR 4).
"""

from mediawatch_dagster.assets.manifest import timeline_manifest
from mediawatch_dagster.assets.raw_gkg import raw_gkg

__all__ = ["raw_gkg", "timeline_manifest"]
