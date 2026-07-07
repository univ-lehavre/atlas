"""Tests de l'instrumentation MLflow de pageviews (best-effort, no-op sans serveur).

Hermétiques (MLflow stubé, aucun réseau) : couvre la lecture d'env
(``mlflow_config_from_env`` → ``None`` sans ``MLFLOW_TRACKING_URI``), et ``log_run``
générique (no-op sans config, succès avec MLflow stubé, échec avalé). Comme le lineage
lit ``OPENLINEAGE_URL``, le suivi lit ``MLFLOW_TRACKING_URI`` : hors cluster, tout est
no-op silencieux (asset matérialisable, ADR 0057). Aucune PII (ADR 0030).
"""

import contextlib

import pytest

from pageviews_dagster import tracking as t

# ── mlflow_config_from_env ───────────────────────────────────────────────────


def test_config_none_without_uri() -> None:
    # Sans MLFLOW_TRACKING_URI : pas de config → instrumentation no-op (dev/CI hermétique).
    assert t.mlflow_config_from_env({}) is None


def test_config_blank_uri_is_none() -> None:
    # Une valeur vide compte comme absente (pas de tracking_uri vide qui casserait MLflow).
    assert t.mlflow_config_from_env({"MLFLOW_TRACKING_URI": ""}) is None


def test_config_from_uri_with_default_experiment() -> None:
    cfg = t.mlflow_config_from_env({"MLFLOW_TRACKING_URI": "http://mlflow:5000"})
    assert cfg is not None
    assert cfg.tracking_uri == "http://mlflow:5000"
    # Experiment DÉDIÉ, convention neutre `pageviews_*` (jamais une marque, ADR 0022).
    assert cfg.experiment == t.EXPERIMENT_FORECAST == "pageviews_views_forecast"


def test_config_experiment_overridable() -> None:
    # Le nom d'experiment est surchargeable par instance (MLFLOW_EXPERIMENT).
    cfg = t.mlflow_config_from_env(
        {"MLFLOW_TRACKING_URI": "http://mlflow:5000", "MLFLOW_EXPERIMENT": "custom"}
    )
    assert cfg is not None
    assert cfg.experiment == "custom"


def test_config_reads_process_env_when_omitted(monkeypatch) -> None:
    # env=None → lecture de os.environ.
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
    assert t.mlflow_config_from_env() is None
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://mlflow.env:5000")
    monkeypatch.delenv("MLFLOW_EXPERIMENT", raising=False)
    cfg = t.mlflow_config_from_env()
    assert cfg is not None and cfg.tracking_uri == "http://mlflow.env:5000"


# ── log_run (best-effort) ─────────────────────────────────────────────────────


def test_log_run_noop_without_config() -> None:
    # config None (MLFLOW_TRACKING_URI absent) → no-op, renvoie None, aucun import MLflow.
    assert t.log_run("r", "e", "2024-01", {"m": 1.0}, {"p": "x"}, None) is None


class _FakeRun:
    class info:  # noqa: N801 — mimique l'attribut MLflow run.info.run_id
        run_id = "mlflow-abc"


@pytest.fixture
def _mlflow_stub(monkeypatch):
    """Stube mlflow (aucun réseau) → succès offline, capture uri/experiment/params/métriques."""
    import mlflow

    captured = {"params": {}, "metrics": {}, "experiment": None, "uri": None, "run_name": None}
    monkeypatch.setattr(mlflow, "set_tracking_uri", lambda u: captured.__setitem__("uri", u))
    monkeypatch.setattr(mlflow, "set_experiment", lambda n: captured.__setitem__("experiment", n))
    monkeypatch.setattr(
        mlflow,
        "start_run",
        lambda **k: (
            (captured.__setitem__("run_name", k.get("run_name")))
            or contextlib.nullcontext(_FakeRun())
        ),
    )
    monkeypatch.setattr(mlflow, "log_params", lambda d: captured["params"].update(d))
    monkeypatch.setattr(mlflow, "log_metric", lambda k, v: captured["metrics"].__setitem__(k, v))
    return captured


def test_log_run_success_logs_params_and_metrics(_mlflow_stub) -> None:
    # config présente → run loggué : uri posée, experiment PASSÉ prime, params + métriques.
    cfg = t.MlflowConfig("http://mlflow.local:5000", "ignored_config_experiment")
    out = t.log_run(
        run_name="forecast:runX",
        experiment=t.EXPERIMENT_FORECAST,
        dt="2024-06",
        metrics={"r2": 0.87, "mae": 12.0},
        params={"served_mode": "predictive"},
        config=cfg,
    )
    assert out == "runs:/mlflow-abc"
    assert _mlflow_stub["uri"] == "http://mlflow.local:5000"
    # L'experiment PASSÉ prime sur config.experiment.
    assert _mlflow_stub["experiment"] == "pageviews_views_forecast"
    assert _mlflow_stub["run_name"] == "forecast:runX"
    assert _mlflow_stub["params"]["served_mode"] == "predictive"
    assert _mlflow_stub["metrics"]["r2"] == 0.87
    assert _mlflow_stub["metrics"]["mae"] == 12.0


def test_log_run_handles_failure(monkeypatch) -> None:
    # MLflow lève → best-effort : renvoie None sans propager (l'asset ne DÉPEND pas de MLflow).
    import mlflow

    def _boom(*a, **k):
        raise RuntimeError("unreachable")

    monkeypatch.setattr(mlflow, "set_tracking_uri", _boom)
    cfg = t.MlflowConfig("http://127.0.0.1:1/unreachable", t.EXPERIMENT_FORECAST)
    out = t.log_run("forecast:runX", t.EXPERIMENT_FORECAST, "2024-06", {"r2": 0.5}, {}, cfg)
    assert out is None
