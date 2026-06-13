"""Assets DataOps du pipeline de citations."""

from citation_dagster.assets.manifest import (
    MANIFEST_SCHEMA_VERSION,
    collab_manifest,
    researcher_vectors_manifest,
    researchers_manifest,
    work_vectors_manifest,
)
from citation_dagster.assets.raw_snapshot import raw_snapshot
from citation_dagster.assets.researcher_embeddings import researcher_embeddings

__all__ = [
    "MANIFEST_SCHEMA_VERSION",
    "collab_manifest",
    "raw_snapshot",
    "researcher_embeddings",
    "researcher_vectors_manifest",
    "researchers_manifest",
    "work_vectors_manifest",
]
