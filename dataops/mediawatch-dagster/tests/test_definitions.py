"""Tests du point d'entrée : la code-location reste chargeable au scaffold (PR 1)."""

from dagster import Definitions

from mediawatch_dagster import definitions


def test_definitions_loads_and_is_empty_at_scaffold() -> None:
    # Le serveur gRPC importe ce module : il doit être chargeable même sans asset.
    assert isinstance(definitions.defs, Definitions)
    # Scaffold : aucune définition d'asset/job/schedule encore livrée (PR 2+).
    assert list(definitions.defs.resolve_asset_graph().get_all_asset_keys()) == []


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
