"""Tests du drift du modèle de prévision (ADR 0081/0068) — corps purs, hermétiques.

Pattern calqué sur citation test_drift_uplift : on teste la porte de sécurité
(evaluate_regression : seule predictive→descriptive bloque) et le drift de distribution
(compute_distribution_drift : stable vs décalé) sans I/O S3.
"""

from pathlib import Path

import numpy as np
import pandas as pd

from mediawatch_dagster.assets import drift_forecast as d

_DUMMY_CONF = Path("/tmp/rclone.conf")  # jamais lu (subprocess monkeypatché)


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


# ── check_forecast_drift (corps complet : mock lakehouse) ────────────────────


class _FakeRel:
    def __init__(self, rows=None, df=None):
        self._rows = rows
        self._df = df

    def fetchall(self):
        return self._rows

    def df(self):
        return self._df


class _FakeCon:
    """`_list_runs` (DISTINCT run) → runs ; `_load_run_summary` lit n_articles_pred (df)
    et served_mode (rows) du run retrouvé dans le glob `run=<id>/`."""

    def __init__(self, runs, by_run):
        self._runs = runs
        self._by_run = by_run  # {run_id: {"pred": df, "mode": "predictive"|"descriptive"}}

    def sql(self, query):
        if "DISTINCT run" in query:
            return _FakeRel(rows=[(r,) for r in self._runs])
        for run_id, data in self._by_run.items():
            if f"run={run_id}/" in query:
                if "DISTINCT served_mode" in query:
                    return _FakeRel(rows=[(data["mode"],)])
                return _FakeRel(df=data["pred"])
        if "DISTINCT served_mode" in query:
            return _FakeRel(rows=[])
        return _FakeRel(df=pd.DataFrame(columns=["n_articles_pred"]))


def _patch(monkeypatch, runs, by_run):
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
    monkeypatch.setattr(d.lakehouse, "connect", lambda cfg=None: _FakeCon(runs, by_run))


def test_first_run_has_no_baseline(monkeypatch):
    _patch(
        monkeypatch, runs=["run1"], by_run={"run1": {"pred": _pred_df(50), "mode": "predictive"}}
    )
    res = d.check_forecast_drift("mediawatch", "run1")
    assert res.passed is True
    assert "baseline absente" in res.metadata["drift"].value


def test_served_mode_regression_blocks(monkeypatch):
    by_run = {
        "run1": {"pred": _pred_df(50, seed=1), "mode": "predictive"},
        "run2": {"pred": _pred_df(50, seed=2), "mode": "descriptive"},
    }
    _patch(monkeypatch, runs=["run1", "run2"], by_run=by_run)
    res = d.check_forecast_drift("mediawatch", "run2")
    assert res.passed is False  # bascule predictive→descriptive : bloquant
    assert res.metadata["served_mode_regressed"].value is True


def test_distribution_shift_alone_is_informative(monkeypatch):
    # Décalage de distribution SANS bascule de mode → informatif (le run n'échoue pas).
    by_run = {
        "run1": {"pred": _pred_df(50, seed=1), "mode": "predictive"},
        "run2": {"pred": _pred_df(200, seed=2), "mode": "predictive"},
    }
    _patch(monkeypatch, runs=["run1", "run2"], by_run=by_run)
    res = d.check_forecast_drift("mediawatch", "run2")
    assert res.passed is True  # pas de bascule → informatif
    assert res.metadata["forecast_distribution_drift"].value is True


def test_baseline_is_previous_run(monkeypatch):
    by_run = {
        "run1": {"pred": _pred_df(50, seed=1), "mode": "predictive"},
        "run2": {"pred": _pred_df(50, seed=2), "mode": "predictive"},
        "run3": {"pred": _pred_df(50, seed=3), "mode": "predictive"},
    }
    _patch(monkeypatch, runs=["run1", "run2", "run3"], by_run=by_run)
    res = d.check_forecast_drift("mediawatch", "run3")
    assert res.metadata["baseline_run"].value == "run2"  # le précédent, pas le plus ancien


# ── Persistance du verdict (source lisible par le sensor, ADR 0082) ──────────


def test_build_drift_verdict_is_deterministic_and_embeds_partitions():
    # Le verdict embarque les partitions GKG ingérées (clé du garde-fou anti-emballement),
    # triées ; drift_detected = décalage de distribution OU bascule de mode.
    v = d.build_drift_verdict(
        "run2",
        "run1",
        {"drift_detected": True, "drift_score": 0.87654},
        {"regressed": False},
        ["2024-06-03", "2024-06-01", "2024-06-02"],
    )
    assert v["run_id"] == "run2"
    assert v["baseline_run"] == "run1"
    assert v["drift_detected"] is True
    assert v["drift_score"] == 0.8765
    assert v["partitions"] == ["2024-06-01", "2024-06-02", "2024-06-03"]  # trié
    assert v["schema_version"] == d.DRIFT_VERDICT_SCHEMA_VERSION
    assert "produced_at" not in v  # injecté par l'I/O, pas par le pur


def test_build_drift_verdict_detects_on_mode_switch():
    # Bascule de mode SANS décalage de distribution → drift_detected quand même (régime changé).
    v = d.build_drift_verdict(
        "run2", "run1", {"drift_detected": False, "drift_score": 0.5}, {"regressed": True}, []
    )
    assert v["drift_detected"] is True
    assert v["served_mode_regressed"] is True


def test_read_drift_verdict_absent_returns_empty(monkeypatch):
    import subprocess as sp

    monkeypatch.setattr(sp, "run", lambda *a, **k: sp.CompletedProcess(a, 0, stdout="", stderr=""))
    assert d.read_drift_verdict("mediawatch", _DUMMY_CONF) == {}


def test_read_drift_verdict_parses_json(monkeypatch):
    import subprocess as sp

    doc = '{"run_id": "run2", "drift_detected": true, "partitions": ["2024-06-01"]}'
    monkeypatch.setattr(sp, "run", lambda *a, **k: sp.CompletedProcess(a, 0, stdout=doc, stderr=""))
    out = d.read_drift_verdict("mediawatch", _DUMMY_CONF)
    assert out["run_id"] == "run2" and out["drift_detected"] is True


def test_read_drift_verdict_malformed_returns_empty(monkeypatch):
    import subprocess as sp

    monkeypatch.setattr(
        sp, "run", lambda *a, **k: sp.CompletedProcess(a, 0, stdout="{bad", stderr="")
    )
    assert d.read_drift_verdict("mediawatch", _DUMMY_CONF) == {}


def test_write_drift_verdict_returns_status(monkeypatch):
    import subprocess as sp

    monkeypatch.setattr(sp, "run", lambda *a, **k: sp.CompletedProcess(a, 0, stdout="", stderr=""))
    assert d.write_drift_verdict({"run_id": "r"}, "mediawatch", _DUMMY_CONF) is True
    monkeypatch.setattr(sp, "run", lambda *a, **k: sp.CompletedProcess(a, 1, stdout="", stderr="x"))
    assert d.write_drift_verdict({"run_id": "r"}, "mediawatch", _DUMMY_CONF) is False
