"""Tests du point d'entrée : la code-location se charge avec raw_gkg (PR 2)."""

from dagster import AssetKey, Definitions

from mediawatch_dagster import definitions
from mediawatch_dagster.definitions import _s3_env_from


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
    # Le Secret S3 du lakehouse est injecté au niveau du RUN (pods de run). RUN_K8S_CONFIG
    # est figé à l'import : sans MEDIAWATCH_S3_* dans l'env (tests), c'est le défaut banc.
    assert cfg["env_from"] == [{"secret_ref": {"name": "mediawatch-s3-access"}}]
    # Le lineage est réinjecté au run (piège ADR 0086 : ne se propage pas du gRPC).
    names = {e["name"] for e in cfg["env"]}
    assert "OPENLINEAGE_URL" in names
    # Host en forme courte <svc>.<ns> (note DNS prod, cluster#458).
    url = next(e["value"] for e in cfg["env"] if e["name"] == "OPENLINEAGE_URL")
    assert url == "http://marquez.marquez:5000"


def test_s3_env_from_default_bench_secret_only(monkeypatch) -> None:
    # Sans MEDIAWATCH_S3_* (banc / checkout neuf / tests) : un seul secret_ref par
    # défaut (mediawatch-s3-access), AUCUN config_map_ref (le Secret unique du banc
    # porte déjà BUCKET_*).
    monkeypatch.delenv("MEDIAWATCH_S3_SECRET", raising=False)
    monkeypatch.delenv("MEDIAWATCH_S3_CONFIGMAP", raising=False)
    assert _s3_env_from() == [{"secret_ref": {"name": "mediawatch-s3-access"}}]


def test_s3_env_from_prod_obc_secret_and_configmap(monkeypatch) -> None:
    # Prod (ObjectBucketClaim Rook) : le Secret AWS_* ET le ConfigMap BUCKET_* sont
    # tous deux du nom de la claim. Les pods de RUN doivent recevoir LES DEUX (le
    # ConfigMap est requis en prod, sinon BUCKET_* absent). C'est le bug que le nom
    # codé en dur masquait : l'OBC ne crée pas `mediawatch-s3-access` en prod.
    monkeypatch.setenv("MEDIAWATCH_S3_SECRET", "mediawatch-datalake")
    monkeypatch.setenv("MEDIAWATCH_S3_CONFIGMAP", "mediawatch-datalake")
    env_from = _s3_env_from()
    assert {"secret_ref": {"name": "mediawatch-datalake"}} in env_from
    assert {"config_map_ref": {"name": "mediawatch-datalake"}} in env_from
    assert len(env_from) == 2


def test_s3_env_from_secret_without_configmap(monkeypatch) -> None:
    # Un overlay peut renommer le Secret sans déclarer de ConfigMap : on n'ajoute
    # config_map_ref QUE si MEDIAWATCH_S3_CONFIGMAP existe.
    monkeypatch.setenv("MEDIAWATCH_S3_SECRET", "custom-s3")
    monkeypatch.delenv("MEDIAWATCH_S3_CONFIGMAP", raising=False)
    assert _s3_env_from() == [{"secret_ref": {"name": "custom-s3"}}]


def test_transform_run_config_relays_dbt_env(monkeypatch) -> None:
    # Piège ADR 0086 : les vars de l'overlay (DBT_S3_USE_SSL, MEDIAWATCH_REF_SOURCE)
    # doivent être relayées aux pods de run. Présentes dans l'env → relayées.
    monkeypatch.setenv("DBT_S3_USE_SSL", "true")
    monkeypatch.setenv("MEDIAWATCH_REF_SOURCE", "ingested")
    cfg = definitions._transform_run_config()["dagster-k8s/config"]["container_config"]
    env = {e["name"]: e["value"] for e in cfg["env"]}
    assert env["DBT_S3_USE_SSL"] == "true"
    assert env["MEDIAWATCH_REF_SOURCE"] == "ingested"


def test_transform_run_config_omits_absent_env(monkeypatch) -> None:
    monkeypatch.delenv("DBT_S3_USE_SSL", raising=False)
    monkeypatch.delenv("MEDIAWATCH_REF_SOURCE", raising=False)
    cfg = definitions._transform_run_config()["dagster-k8s/config"]["container_config"]
    names = {e["name"] for e in cfg["env"]}
    # Au banc (vars absentes), rien à relayer → seules les vars de base présentes.
    assert "DBT_S3_USE_SSL" not in names
    assert "MEDIAWATCH_REF_SOURCE" not in names


def test_no_mlflow_or_postgres_env_in_v1() -> None:
    # Périmètre v1 « articles seulement » : pas de MLflow ni d'index Postgres.
    names = {
        e["name"]
        for e in definitions.RUN_K8S_CONFIG["dagster-k8s/config"]["container_config"]["env"]
    }
    assert not any(n.startswith("POSTGRES_") for n in names)
    assert "MLFLOW_TRACKING_URI" not in names
