"""Assets DataOps de la code-location « mediawatch ».

Lots :
- ``raw_gkg`` — ingestion du brut GKG par pull HTTP partitionné (PR 2/4) ;
- ``ref_universities_snapshot`` — ingestion du référentiel d'universités (PR 4) ;
- modèles dbt ``staging`` → ``curated`` → ``marts`` (PR 3/4) ;
- ``timeline_manifest`` — contrat Parquet du mart servi (PR 4).
"""

from mediawatch_dagster.assets.manifest import timeline_manifest
from mediawatch_dagster.assets.raw_gkg import raw_gkg
from mediawatch_dagster.assets.ref_universities_snapshot import ref_universities_snapshot

__all__ = ["raw_gkg", "ref_universities_snapshot", "timeline_manifest"]
