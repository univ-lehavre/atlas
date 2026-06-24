"""Tests du suivi de dérive du modèle d'uplift (ADR 0068) — corps purs + check complet.

Loader S3, MLflow et Dagster monkeypatchés (pas d'I/O réelle). Couvre : le drift de
distribution (Evidently sur `uplift`), le verdict de bascule served_mode (le SEUL motif
bloquant), le 1er run sans baseline, la sélection du bon N-1, et le no-op MLflow.
"""

import numpy as np
import pandas as pd
import pytest
from dagster import AssetCheckResult

import citation_dagster.assets.drift_uplift as du


@pytest.fixture
def _no_mlflow(monkeypatch):
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)


def _uplift_df(n: int, shift: float, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    return pd.DataFrame({"uplift": rng.normal(shift, 1.0, n)})


class _FakeRel:
    def __init__(self, rows=None, df=None):
        self._rows = rows
        self._df = df

    def fetchall(self):
        return self._rows

    def df(self):
        return self._df


class _FakeCon:
    """`_list_runs` (DISTINCT run) → runs ; `_load_run_summary` lit `uplift` (df) et
    `served_mode` (rows) du run retrouvé dans le glob `run=<id>/`."""

    def __init__(self, runs, by_run):
        self._runs = runs
        self._by_run = by_run  # {run_id: {"uplift": df, "mode": "predictive"|"descriptive"}}

    def sql(self, query):
        if "DISTINCT run" in query:
            return _FakeRel(rows=[(r,) for r in self._runs])
        for run_id, data in self._by_run.items():
            if f"run={run_id}/" in query:
                if "DISTINCT served_mode" in query:
                    return _FakeRel(rows=[(data["mode"],)])
                return _FakeRel(df=data["uplift"])
        if "DISTINCT served_mode" in query:
            return _FakeRel(rows=[])
        return _FakeRel(df=pd.DataFrame(columns=["uplift"]))


def _patch(monkeypatch, runs, by_run):
    monkeypatch.setattr(du.lakehouse, "connect", lambda cfg=None: _FakeCon(runs, by_run))


# ── compute_distribution_drift (pur) ─────────────────────────────────────────


def test_distribution_drift_stable():
    ref, cur = _uplift_df(80, 0.0, 1), _uplift_df(80, 0.0, 2)
    out = du.compute_distribution_drift(ref, cur)
    assert set(out) == {"drift_score", "drift_detected", "method", "html"}
    assert out["drift_detected"] is False
    assert isinstance(out["html"], str) and "<html" in out["html"].lower()


def test_distribution_drift_detects_shift():
    ref, cur = _uplift_df(80, 0.0, 1), _uplift_df(80, 4.0, 2)
    out = du.compute_distribution_drift(ref, cur)
    assert out["drift_detected"] is True


# ── evaluate_regression (pur) : seule la bascule predictive→descriptive régresse ──


def test_regression_only_on_predictive_to_descriptive():
    reg = du.evaluate_regression({"served_mode": "predictive"}, {"served_mode": "descriptive"})
    assert reg["regressed"] is True
    assert "BASCULE" in reg["verdict"]


def test_no_regression_when_mode_stable():
    for mode in ("predictive", "descriptive"):
        reg = du.evaluate_regression({"served_mode": mode}, {"served_mode": mode})
        assert reg["regressed"] is False


def test_recovery_is_not_a_regression():
    reg = du.evaluate_regression({"served_mode": "descriptive"}, {"served_mode": "predictive"})
    assert reg["regressed"] is False
    assert "rétablissement" in reg["verdict"]


# ── check_uplift_drift (corps complet) ───────────────────────────────────────


def test_first_run_has_no_baseline(monkeypatch):
    _patch(
        monkeypatch,
        runs=["run1"],
        by_run={"run1": {"uplift": _uplift_df(10, 0.0, 1), "mode": "predictive"}},
    )
    res = du.check_uplift_drift("citation", "run1")
    assert isinstance(res, AssetCheckResult)
    assert res.passed is True
    assert "baseline absente" in res.metadata["drift"].text


def test_served_mode_regression_blocks(monkeypatch, _no_mlflow):
    # N-1 prédictif, N descriptif → bascule grave → check ÉCHOUE (bloquant, ADR 0068).
    by_run = {
        "run1": {"uplift": _uplift_df(60, 0.0, 1), "mode": "predictive"},
        "run2": {"uplift": _uplift_df(60, 0.0, 2), "mode": "descriptive"},
    }
    _patch(monkeypatch, runs=["run1", "run2"], by_run=by_run)
    res = du.check_uplift_drift("citation", "run2")
    assert res.passed is False
    assert res.metadata["served_mode_regressed"].value is True


def test_distribution_shift_alone_is_informative(monkeypatch, _no_mlflow):
    # Décalage de distribution MAIS served_mode stable → check PASSÉ (informatif, pas bloquant).
    by_run = {
        "run1": {"uplift": _uplift_df(60, 0.0, 1), "mode": "predictive"},
        "run2": {"uplift": _uplift_df(60, 4.0, 2), "mode": "predictive"},
    }
    _patch(monkeypatch, runs=["run1", "run2"], by_run=by_run)
    res = du.check_uplift_drift("citation", "run2")
    assert res.passed is True  # pas de bascule → ne bloque pas
    assert res.metadata["uplift_distribution_drift"].value is True  # mais le drift est rapporté


def test_baseline_is_previous_not_oldest(monkeypatch, _no_mlflow):
    # 3 runs : le N-1 de run3 est run2 (le plus proche), pas run1.
    by_run = {
        "run1": {"uplift": _uplift_df(60, 0.0, 1), "mode": "predictive"},
        "run2": {"uplift": _uplift_df(60, 0.0, 2), "mode": "predictive"},
        "run3": {"uplift": _uplift_df(60, 0.0, 3), "mode": "predictive"},
    }
    _patch(monkeypatch, runs=["run1", "run2", "run3"], by_run=by_run)
    res = du.check_uplift_drift("citation", "run3")
    assert res.metadata["baseline_run"].text == "run2"


def _payload(**over):
    base = {
        "drift_score": 0.1,
        "drift_detected": False,
        "regressed": False,
        "served_from": "predictive",
        "served_to": "predictive",
    }
    base.update(over)
    return base


def test_log_to_mlflow_noop_without_uri(monkeypatch):
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
    assert du._log_to_mlflow("run1", _payload()) is False


def test_log_to_mlflow_success(monkeypatch):
    # URI posée + MLflow stubé → logge params/métriques + HTML, renvoie True.
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://mlflow.local:5000")
    import contextlib

    import mlflow

    logged = {"params": {}, "metrics": {}, "texts": {}}
    monkeypatch.setattr(mlflow, "set_experiment", lambda name: None)
    monkeypatch.setattr(mlflow, "start_run", lambda **k: contextlib.nullcontext())
    monkeypatch.setattr(mlflow, "log_param", lambda k, v: logged["params"].__setitem__(k, v))
    monkeypatch.setattr(mlflow, "log_metric", lambda k, v: logged["metrics"].__setitem__(k, v))
    monkeypatch.setattr(mlflow, "log_text", lambda t, p: logged["texts"].__setitem__(p, t))
    ok = du._log_to_mlflow(
        "runX",
        _payload(
            drift_score=0.42,
            drift_detected=True,
            regressed=True,
            served_to="descriptive",
            html="<html>r</html>",
        ),
    )
    assert ok is True
    assert logged["params"]["served_to"] == "descriptive"
    assert logged["metrics"]["uplift_drift_score"] == 0.42
    assert logged["metrics"]["served_mode_regressed"] == 1
    assert logged["texts"]["evidently_uplift_drift_report.html"] == "<html>r</html>"


def test_log_to_mlflow_handles_failure(monkeypatch):
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://mlflow.local:5000")
    import mlflow

    def _boom(*a, **k):
        raise RuntimeError("unreachable")

    monkeypatch.setattr(mlflow, "set_experiment", _boom)
    assert du._log_to_mlflow("runX", _payload()) is False
