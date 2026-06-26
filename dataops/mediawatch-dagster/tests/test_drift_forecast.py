"""Tests du drift du modèle de prévision (ADR 0081/0068) — corps purs, hermétiques.

Pattern calqué sur citation test_drift_uplift : on teste la porte de sécurité
(evaluate_regression : seule predictive→descriptive bloque) et le drift de distribution
(compute_distribution_drift : stable vs décalé) sans I/O S3.
"""

import numpy as np
import pandas as pd

from mediawatch_dagster.assets import drift_forecast as d


def _summary(mode):
    return {"served_mode": mode}


# ── Porte de sécurité : seule predictive → descriptive bloque ────────────────


def test_regression_blocks_only_on_predictive_to_descriptive():
    reg = d.evaluate_regression(_summary("predictive"), _summary("descriptive"))
    assert reg["regressed"] is True
    assert reg["served_from"] == "predictive" and reg["served_to"] == "descriptive"


def test_recovery_descriptive_to_predictive_does_not_block():
    reg = d.evaluate_regression(_summary("descriptive"), _summary("predictive"))
    assert reg["regressed"] is False


def test_stable_predictive_does_not_block():
    assert (
        d.evaluate_regression(_summary("predictive"), _summary("predictive"))["regressed"] is False
    )


def test_stable_descriptive_does_not_block():
    assert (
        d.evaluate_regression(_summary("descriptive"), _summary("descriptive"))["regressed"]
        is False
    )


# ── Drift de distribution (Evidently) ────────────────────────────────────────


def _pred_df(loc, n=200, seed=0):
    rng = np.random.default_rng(seed)
    return pd.DataFrame({"n_articles_pred": rng.normal(loc, 5.0, n)})


def test_distribution_stable_no_drift():
    out = d.compute_distribution_drift(_pred_df(50, seed=1), _pred_df(50, seed=2))
    assert out["drift_detected"] is False


def test_distribution_shift_detected():
    out = d.compute_distribution_drift(_pred_df(50, seed=1), _pred_df(200, seed=2))
    assert out["drift_detected"] is True


def test_log_to_mlflow_noop_without_uri(monkeypatch):
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
    payload = {
        "served_from": "predictive",
        "served_to": "predictive",
        "drift_score": 0.1,
        "drift_detected": False,
        "regressed": False,
    }
    assert d._log_to_mlflow("run1", payload) is False
