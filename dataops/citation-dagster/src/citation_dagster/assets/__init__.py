"""Assets DataOps du pipeline de citations."""

from citation_dagster.assets.batch_eunicoast import mart_eunicoast
from citation_dagster.assets.index_load import index_load
from citation_dagster.assets.manifest import (
    MANIFEST_SCHEMA_VERSION,
    author_recommendations_manifest,
    collab_manifest,
    pair_uplift_predictions_manifest,
    researcher_vectors_manifest,
    researchers_fts_manifest,
    researchers_manifest,
    work_vectors_manifest,
)
from citation_dagster.assets.raw_snapshot import raw_snapshot
from citation_dagster.assets.researcher_embeddings import researcher_embeddings
from citation_dagster.assets.uplift import pair_uplift_model

__all__ = [
    "MANIFEST_SCHEMA_VERSION",
    "author_recommendations_manifest",
    "collab_manifest",
    "index_load",
    "mart_eunicoast",
    "pair_uplift_model",
    "pair_uplift_predictions_manifest",
    "raw_snapshot",
    "researcher_embeddings",
    "researcher_vectors_manifest",
    "researchers_fts_manifest",
    "researchers_manifest",
    "work_vectors_manifest",
]
