"""Tests du point d'entrée de la code-location (definitions)."""

import json

from citation_dagster.definitions import defs, ingestion_job


def test_defs_exposes_raw_snapshot_asset():
    keys = {k.to_user_string() for k in defs.resolve_asset_graph().get_all_asset_keys()}
    assert "raw_snapshot" in keys


def test_ingestion_job_injects_s3_secret_into_run_pod():
    # Les tags k8s au niveau run propagent le Secret S3 au pod de run.
    # Dagster sérialise la valeur du tag en chaîne JSON.
    raw = ingestion_job.tags["dagster-k8s/config"]
    config = raw if isinstance(raw, dict) else json.loads(raw)
    env_from = config["container_config"]["env_from"]
    assert {"secret_ref": {"name": "citation-s3-access"}} in env_from
