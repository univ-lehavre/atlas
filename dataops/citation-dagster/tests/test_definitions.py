"""Tests du point d'entrée de la code-location (definitions)."""

import json

from citation_dagster.definitions import (
    _DEFAULT_CT_CRON,
    _ct_cron,
    _s3_env_from,
    defs,
    evaluate_ct_sensor,
    ingestion_job,
)


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
    # Dagster sérialise la valeur du tag en chaîne JSON. Sans env d'overlay, le
    # défaut est le Secret unique du banc (citation-s3-access), sans ConfigMap.
    env_from = _run_container_config(ingestion_job)["env_from"]
    assert {"secret_ref": {"name": "citation-s3-access"}} in env_from


def test_s3_env_from_default_bench_secret_only(monkeypatch):
    # Sans CITATION_S3_* (banc / checkout neuf / tests) : un seul secret_ref par
    # défaut (citation-s3-access), AUCUN config_map_ref (le Secret unique du banc
    # porte déjà BUCKET_*).
    monkeypatch.delenv("CITATION_S3_SECRET", raising=False)
    monkeypatch.delenv("CITATION_S3_CONFIGMAP", raising=False)
    env_from = _s3_env_from()
    assert env_from == [{"secret_ref": {"name": "citation-s3-access"}}]


def test_s3_env_from_prod_obc_secret_and_configmap(monkeypatch):
    # Prod (ObjectBucketClaim Rook) : le Secret AWS_* ET le ConfigMap BUCKET_* sont
    # tous deux du nom de la claim. Les pods de RUN doivent recevoir LES DEUX (le
    # ConfigMap est requis en prod, à la différence du banc) — sinon BUCKET_* absent.
    monkeypatch.setenv("CITATION_S3_SECRET", "atlas-datalake")
    monkeypatch.setenv("CITATION_S3_CONFIGMAP", "atlas-datalake")
    env_from = _s3_env_from()
    assert {"secret_ref": {"name": "atlas-datalake"}} in env_from
    assert {"config_map_ref": {"name": "atlas-datalake"}} in env_from
    assert len(env_from) == 2


def test_s3_env_from_secret_without_configmap(monkeypatch):
    # Un overlay peut renommer le Secret sans déclarer de ConfigMap (ex. banc à
    # creds custom) : on n'ajoute config_map_ref QUE si CITATION_S3_CONFIGMAP existe.
    monkeypatch.setenv("CITATION_S3_SECRET", "custom-s3")
    monkeypatch.delenv("CITATION_S3_CONFIGMAP", raising=False)
    env_from = _s3_env_from()
    assert env_from == [{"secret_ref": {"name": "custom-s3"}}]


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


# ── CT par signal : @sensor watermark → transform_job (atlas#399) ─────────────


def test_ct_sensor_registered_when_dbt_present():
    # En présence des assets dbt (manifest packagé), le sensor de CT est enregistré.
    names = {s.name for s in defs.sensors}
    assert "transform_on_watermark_advance" in names


def test_ct_sensor_stopped_by_default():
    # Le code PERMET, le déployeur ARME (ADR 0062/0031) : sensor STOPPED par défaut.
    from dagster import DefaultSensorStatus

    s = next(s for s in defs.sensors if s.name == "transform_on_watermark_advance")
    assert s.default_status == DefaultSensorStatus.STOPPED


def test_evaluate_ct_sensor_first_state_triggers():
    # Premier watermark observé (curseur None) et non vide → déclenche, curseur = état.
    state = {"works": "2024-01-05", "authors": "2024-01-04"}
    should_run, run_key, new_cursor = evaluate_ct_sensor(state, None)
    assert should_run is True
    assert run_key == new_cursor == json.dumps(state, sort_keys=True)


def test_evaluate_ct_sensor_unchanged_skips():
    # État identique au curseur → pas de re-déclenchement (dédup, pas de double-run).
    state = {"works": "2024-01-05"}
    cursor = json.dumps(state, sort_keys=True)
    should_run, run_key, new_cursor = evaluate_ct_sensor(state, cursor)
    assert should_run is False
    assert new_cursor == cursor


def test_evaluate_ct_sensor_advance_triggers_new_run_key():
    # Le watermark avance → déclenche, et le run_key CHANGE (Dagster ne dédupe pas l'ancien).
    old = {"works": "2024-01-05"}
    cursor = json.dumps(old, sort_keys=True)
    new = {"works": "2024-02-10"}
    should_run, run_key, _ = evaluate_ct_sensor(new, cursor)
    assert should_run is True
    assert run_key == json.dumps(new, sort_keys=True)
    assert run_key != cursor


def test_evaluate_ct_sensor_empty_state_skips():
    # Watermark vide (aucune ingestion encore) → rien à réentraîner, pas de déclenchement.
    should_run, _, new_cursor = evaluate_ct_sensor({}, None)
    assert should_run is False
    assert new_cursor == json.dumps({}, sort_keys=True)


def test_evaluate_ct_sensor_key_order_insensitive():
    # Le sérialisé est trié → un même état à clés permutées ne re-déclenche pas (déterminisme).
    cursor = json.dumps({"authors": "2024-01-04", "works": "2024-01-05"}, sort_keys=True)
    should_run, _, _ = evaluate_ct_sensor({"works": "2024-01-05", "authors": "2024-01-04"}, cursor)
    assert should_run is False


# ── Cadence du CT = valeur d'instance (ADR 0062, atlas#399) ───────────────────


def test_ct_cron_default_when_env_absent():
    # Sans CITATION_CT_CRON : défaut quotidien (exemple) — le code ne fige PAS la cadence.
    assert _ct_cron({}) == _DEFAULT_CT_CRON


def test_ct_cron_overridable_by_instance():
    # Le déployeur fixe la cadence (ex. mensuel) par env, sans toucher au code générique.
    assert _ct_cron({"CITATION_CT_CRON": "0 2 1 * *"}) == "0 2 1 * *"


def test_ct_cron_blank_falls_back_to_default():
    # Une valeur vide retombe sur le défaut (pas de cron vide qui casserait le schedule).
    assert _ct_cron({"CITATION_CT_CRON": ""}) == _DEFAULT_CT_CRON


def test_transform_daily_uses_default_cron_in_ci():
    # En CI (env absent), le schedule enregistré porte bien le cron par défaut.
    sched = next((s for s in defs.schedules if s.name == "transform_daily"), None)
    assert sched is not None
    assert sched.cron_schedule == _DEFAULT_CT_CRON
