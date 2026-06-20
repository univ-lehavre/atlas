"""Tests du point d'entrée de la code-location (definitions)."""

import json

from citation_dagster.definitions import defs, ingestion_job


def _run_container_config(job):
    """container_config des tags dagster-k8s/config d'un job (valeur dict ou JSON)."""
    raw = job.tags["dagster-k8s/config"]
    config = raw if isinstance(raw, dict) else json.loads(raw)
    return config["container_config"]


def test_defs_exposes_raw_snapshot_asset():
    keys = {k.to_user_string() for k in defs.resolve_asset_graph().get_all_asset_keys()}
    assert "raw_snapshot" in keys


def test_ingestion_job_injects_s3_secret_into_run_pod():
    # Les tags k8s au niveau run propagent le Secret S3 au pod de run.
    # Dagster sérialise la valeur du tag en chaîne JSON.
    env_from = _run_container_config(ingestion_job)["env_from"]
    assert {"secret_ref": {"name": "citation-s3-access"}} in env_from


def test_ingestion_job_injects_lineage_and_mlflow_env_into_run_pod():
    # Piège ADR 0086 : OPENLINEAGE_URL / MLFLOW_TRACKING_URI doivent atteindre le
    # POD DE RUN (pas seulement la code-location), sinon lineage + MLflow no-op
    # silencieux. On vérifie qu'ils sont déclarés au niveau run.
    env = _run_container_config(ingestion_job)["env"]
    names = {e["name"] for e in env}
    assert "OPENLINEAGE_URL" in names
    assert "MLFLOW_TRACKING_URI" in names
