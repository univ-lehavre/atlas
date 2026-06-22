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


def _job_by_name(name):
    from citation_dagster.definitions import defs

    return defs.get_job_def(name)


def test_transform_job_injects_all_postgres_env_into_run_pod():
    # RÉGRESSION (cluster#458 audit) : index_load (transform_job) appelle
    # postgres_target_from_env qui EXIGE POSTGRES_HOST/DB/USER/PASSWORD ; ils DOIVENT
    # atteindre le pod de run. L'ancien `env_from: pg-role-pgvector` brut ne fournissait
    # ni ces noms (clés username/password) ni le bon namespace → MissingEnvError au run.
    cfg = _run_container_config(_job_by_name("transform_job"))
    env = {e["name"]: e for e in cfg["env"]}
    # host/db/port en littéraux NOM COURT (note DNS du contrat, cluster#458).
    assert env["POSTGRES_HOST"]["value"] == "pg-rw.postgres"  # pas le FQDN
    assert env["POSTGRES_DB"]["value"] == "pgvector"
    assert env["POSTGRES_PORT"]["value"] == "5432"
    # user/password via secretKeyRef vers le dérivé pgvector-pg-auth (ns dagster).
    for var, key in (("POSTGRES_USER", "username"), ("POSTGRES_PASSWORD", "password")):
        ref = env[var]["value_from"]["secret_key_ref"]
        assert ref == {"name": "pgvector-pg-auth", "key": key}
    # on n'injecte PLUS le Secret brut pg-role-pgvector (mauvaises clés + mauvais ns).
    assert {"secret_ref": {"name": "pg-role-pgvector"}} not in cfg.get("env_from", [])
