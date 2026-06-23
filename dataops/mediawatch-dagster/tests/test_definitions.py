"""Tests du point d'entrée : la code-location se charge avec raw_gkg (PR 2)."""

from dagster import AssetKey, Definitions

from mediawatch_dagster import definitions


def test_definitions_loads_with_raw_gkg() -> None:
    # Le serveur gRPC importe ce module : il doit être chargeable.
    assert isinstance(definitions.defs, Definitions)
    keys = list(definitions.defs.resolve_asset_graph().get_all_asset_keys())
    assert AssetKey(["raw_gkg"]) in keys


def test_ingestion_job_selects_raw_gkg() -> None:
    job = definitions.defs.get_job_def("ingestion_job")
    assert job is not None


def test_raw_gkg_is_daily_partitioned() -> None:
    # raw_gkg est partitionné par jour (la partition est le curseur, PR 4).
    keys = definitions.gkg_daily_partitions.get_partition_keys()
    # Les clés sont des dates YYYY-MM-DD ; la première est la date de départ.
    assert keys[0] == "2015-02-19"


def test_schedule_targets_current_day_partition_every_15min() -> None:
    sched = definitions.ingest_current_day
    assert sched.cron_schedule == "*/15 * * * *"
    # STOPPED par défaut : l'opérateur l'arme (pas d'ingestion silencieuse).
    from dagster import DefaultScheduleStatus

    assert sched.default_status == DefaultScheduleStatus.STOPPED


def test_run_k8s_config_injects_s3_secret_and_lineage_env() -> None:
    cfg = definitions.RUN_K8S_CONFIG["dagster-k8s/config"]["container_config"]
    # Le Secret S3 du lakehouse est injecté au niveau du RUN (pods de run).
    assert cfg["env_from"] == [{"secret_ref": {"name": "mediawatch-s3-access"}}]
    # Le lineage est réinjecté au run (piège ADR 0086 : ne se propage pas du gRPC).
    names = {e["name"] for e in cfg["env"]}
    assert "OPENLINEAGE_URL" in names
    # Host en forme courte <svc>.<ns> (note DNS prod, cluster#458).
    url = next(e["value"] for e in cfg["env"] if e["name"] == "OPENLINEAGE_URL")
    assert url == "http://marquez.marquez:5000"


def test_no_mlflow_or_postgres_env_in_v1() -> None:
    # Périmètre v1 « articles seulement » : pas de MLflow ni d'index Postgres.
    names = {
        e["name"]
        for e in definitions.RUN_K8S_CONFIG["dagster-k8s/config"]["container_config"]["env"]
    }
    assert not any(n.startswith("POSTGRES_") for n in names)
    assert "MLFLOW_TRACKING_URI" not in names
