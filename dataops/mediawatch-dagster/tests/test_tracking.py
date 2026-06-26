"""Tests de l'instrumentation MLflow mediawatch (best-effort, no-op sans serveur)."""

from mediawatch_dagster import tracking as t


def test_config_none_without_uri():
    # Sans MLFLOW_TRACKING_URI : pas de config → instrumentation no-op (dev/CI hermétique).
    assert t.mlflow_config_from_env({}) is None


def test_config_from_uri_with_default_experiment():
    cfg = t.mlflow_config_from_env({"MLFLOW_TRACKING_URI": "http://mlflow:5000"})
    assert cfg is not None
    assert cfg.tracking_uri == "http://mlflow:5000"
    assert cfg.experiment == t.EXPERIMENT_FORECAST


def test_config_experiment_overridable():
    cfg = t.mlflow_config_from_env(
        {"MLFLOW_TRACKING_URI": "http://mlflow:5000", "MLFLOW_EXPERIMENT": "custom"}
    )
    assert cfg.experiment == "custom"


def test_log_run_noop_without_config():
    # config None → log_run renvoie None sans toucher à MLflow (jamais d'échec).
    assert t.log_run("r", "e", "2024-01", {"m": 1.0}, {"p": "x"}, None) is None
