"""Tests du drift du modèle de prévision des vues (ADR 0068/0097) — corps purs, hermétiques.

Pattern calqué sur mediawatch ``test_drift_forecast`` : on teste la porte de sécurité
(``evaluate_regression`` : seule predictive→descriptive bloque), le drift de distribution
(``compute_distribution_drift`` : stable vs décalé), le scan des partitions ingérées, la
construction du verdict, et le corps complet ``check_forecast_drift`` (lakehouse mocké,
subprocess mocké) — sans aucun I/O S3 ni MLflow.

Série MENSUELLE à saisonnalité annuelle : les DataFrames Evidently portent la colonne
``views_pred`` (contrat du mart servi), pas une série temporelle — le drift porte sur la
distribution des volumes prédits.
"""

from pathlib import Path

import numpy as np
import pandas as pd

from pageviews_dagster.assets import drift_forecast as d

_DUMMY_CONF = Path("/tmp/rclone.conf")  # jamais lu (subprocess monkeypatché)

# Variables d'env que ``_persist_verdict`` lit via ``ceph_target_from_env`` : on les efface
# pour que la persistance best-effort soit un no-op propre (MissingEnvError → False), sans
# toucher au stockage réel pendant ``check_forecast_drift``.
_CEPH_ENV = (
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "BUCKET_HOST",
    "BUCKET_PORT",
    "BUCKET_NAME",
)


def _summary(mode):
    return {"served_mode": mode}


# ── Porte de sécurité : seule predictive → descriptive bloque ────────────────


def test_regression_blocks_only_on_predictive_to_descriptive():
    reg = d.evaluate_regression(_summary("predictive"), _summary("descriptive"))
    assert reg["regressed"] is True
    assert reg["served_from"] == "predictive" and reg["served_to"] == "descriptive"
    assert "bloquant" in reg["verdict"]


def test_recovery_descriptive_to_predictive_does_not_block():
    reg = d.evaluate_regression(_summary("descriptive"), _summary("predictive"))
    assert reg["regressed"] is False
    assert "rétablissement" in reg["verdict"]


def test_stable_predictive_does_not_block():
    reg = d.evaluate_regression(_summary("predictive"), _summary("predictive"))
    assert reg["regressed"] is False
    assert "stable" in reg["verdict"]


def test_stable_descriptive_does_not_block():
    assert (
        d.evaluate_regression(_summary("descriptive"), _summary("descriptive"))["regressed"]
        is False
    )


# ── Drift de distribution (Evidently sur views_pred) ─────────────────────────


def _pred_df(loc, n=200, seed=0):
    rng = np.random.default_rng(seed)
    return pd.DataFrame({"views_pred": rng.normal(loc, 5.0, n)})


def test_distribution_stable_no_drift():
    out = d.compute_distribution_drift(_pred_df(50, seed=1), _pred_df(50, seed=2))
    assert out["drift_detected"] is False
    assert 0.0 <= out["drift_score"] <= 1.0
    assert out["method"] != "" and "html" in out


def test_distribution_shift_detected():
    out = d.compute_distribution_drift(_pred_df(50, seed=1), _pred_df(200, seed=2))
    assert out["drift_detected"] is True


# ── MLflow best-effort ───────────────────────────────────────────────────────


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


def test_log_to_mlflow_swallows_errors(monkeypatch):
    # URI posée mais import/connexion MLflow échoue → best-effort renvoie False sans lever.
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://mlflow.invalid:5000")

    import mlflow

    def _boom(*_a, **_k):
        raise RuntimeError("mlflow indisponible")

    monkeypatch.setattr(mlflow, "set_experiment", _boom)
    payload = {
        "served_from": "predictive",
        "served_to": "descriptive",
        "drift_score": 0.5,
        "drift_detected": True,
        "regressed": True,
        "html": "<html/>",
    }
    assert d._log_to_mlflow("run1", payload) is False


# ── Scan des partitions ingérées (garde-fou anti-emballement) ────────────────


def test_parse_lsjson_entries_empty_is_empty_list():
    assert d.parse_lsjson_entries("") == []
    assert d.parse_lsjson_entries("   \n") == []


def test_parse_lsjson_entries_parses_json_array():
    doc = '[{"Path": "dt=202401"}, {"Path": "dt=202402/part.parquet"}]'
    out = d.parse_lsjson_entries(doc)
    assert [e["Path"] for e in out] == ["dt=202401", "dt=202402/part.parquet"]


def test_ingested_partitions_extracts_distinct_months():
    entries = [
        {"Path": "dt=202401"},
        {"Path": "dt=202401/data.parquet"},  # même partition → dédupliquée
        {"Path": "dt=202402/data.parquet"},
        {"Path": "not_a_partition/file"},  # ignoré (best-effort)
    ]
    assert d.ingested_partitions(entries) == {"202401", "202402"}


def test_ingested_partitions_empty_when_no_dt():
    assert d.ingested_partitions([{"Path": "raw/other/file"}, {}]) == set()


# ── check_forecast_drift (corps complet : lakehouse mocké) ───────────────────


class _FakeRel:
    def __init__(self, rows=None, df=None):
        self._rows = rows
        self._df = df

    def fetchall(self):
        return self._rows

    def df(self):
        return self._df


class _FakeCon:
    """``_list_runs`` (SELECT DISTINCT run) → runs ; ``_load_run_summary`` lit ``views_pred``
    (df) et ``served_mode`` (rows) du run retrouvé dans le glob ``run=<id>/``."""

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
        return _FakeRel(df=pd.DataFrame(columns=["views_pred"]))


def _patch(monkeypatch, runs, by_run):
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
    for var in _CEPH_ENV:
        monkeypatch.delenv(var, raising=False)  # _persist_verdict → no-op best-effort
    monkeypatch.setattr(d.lakehouse, "connect", lambda cfg=None: _FakeCon(runs, by_run))


def test_first_run_has_no_baseline(monkeypatch):
    _patch(
        monkeypatch, runs=["run1"], by_run={"run1": {"pred": _pred_df(50), "mode": "predictive"}}
    )
    res = d.check_forecast_drift("pageviews", "run1")
    assert res.passed is True
    assert "baseline absente" in res.metadata["drift"].value


def test_served_mode_regression_blocks(monkeypatch):
    by_run = {
        "run1": {"pred": _pred_df(50, seed=1), "mode": "predictive"},
        "run2": {"pred": _pred_df(50, seed=2), "mode": "descriptive"},
    }
    _patch(monkeypatch, runs=["run1", "run2"], by_run=by_run)
    res = d.check_forecast_drift("pageviews", "run2")
    assert res.passed is False  # bascule predictive→descriptive : bloquant
    assert res.metadata["served_mode_regressed"].value is True
    assert res.metadata["baseline_run"].value == "run1"


def test_distribution_shift_alone_is_informative(monkeypatch):
    # Décalage de distribution SANS bascule de mode → informatif (le run n'échoue pas).
    by_run = {
        "run1": {"pred": _pred_df(50, seed=1), "mode": "predictive"},
        "run2": {"pred": _pred_df(200, seed=2), "mode": "predictive"},
    }
    _patch(monkeypatch, runs=["run1", "run2"], by_run=by_run)
    res = d.check_forecast_drift("pageviews", "run2")
    assert res.passed is True  # pas de bascule → informatif
    assert res.metadata["forecast_distribution_drift"].value is True


def test_baseline_is_previous_run(monkeypatch):
    by_run = {
        "run1": {"pred": _pred_df(50, seed=1), "mode": "predictive"},
        "run2": {"pred": _pred_df(50, seed=2), "mode": "predictive"},
        "run3": {"pred": _pred_df(50, seed=3), "mode": "predictive"},
    }
    _patch(monkeypatch, runs=["run1", "run2", "run3"], by_run=by_run)
    res = d.check_forecast_drift("pageviews", "run3")
    assert res.metadata["baseline_run"].value == "run2"  # le précédent, pas le plus ancien


# ── Persistance du verdict (source lisible par le sensor, ADR 0082) ──────────


def test_build_drift_verdict_is_deterministic_and_embeds_partitions():
    # Le verdict embarque les partitions de vues ingérées (clé du garde-fou anti-emballement),
    # triées ; drift_detected = décalage de distribution OU bascule de mode.
    v = d.build_drift_verdict(
        "run2",
        "run1",
        {"drift_detected": True, "drift_score": 0.87654},
        {"regressed": False},
        ["202403", "202401", "202402"],
    )
    assert v["run_id"] == "run2"
    assert v["baseline_run"] == "run1"
    assert v["drift_detected"] is True
    assert v["drift_score"] == 0.8765
    assert v["partitions"] == ["202401", "202402", "202403"]  # trié
    assert v["schema_version"] == d.DRIFT_VERDICT_SCHEMA_VERSION
    assert "produced_at" not in v  # injecté par l'I/O, pas par le pur


def test_build_drift_verdict_detects_on_mode_switch():
    # Bascule de mode SANS décalage de distribution → drift_detected quand même (régime changé).
    v = d.build_drift_verdict(
        "run2", "run1", {"drift_detected": False, "drift_score": 0.5}, {"regressed": True}, []
    )
    assert v["drift_detected"] is True
    assert v["served_mode_regressed"] is True
    assert v["partitions"] == []


def test_read_drift_verdict_absent_returns_empty(monkeypatch):
    import subprocess as sp

    monkeypatch.setattr(sp, "run", lambda *a, **k: sp.CompletedProcess(a, 0, stdout="", stderr=""))
    assert d.read_drift_verdict("pageviews", _DUMMY_CONF) == {}


def test_read_drift_verdict_nonzero_returncode_returns_empty(monkeypatch):
    import subprocess as sp

    doc = '{"run_id": "run2"}'
    monkeypatch.setattr(
        sp, "run", lambda *a, **k: sp.CompletedProcess(a, 1, stdout=doc, stderr="x")
    )
    assert d.read_drift_verdict("pageviews", _DUMMY_CONF) == {}


def test_read_drift_verdict_parses_json(monkeypatch):
    import subprocess as sp

    doc = '{"run_id": "run2", "drift_detected": true, "partitions": ["202401"]}'
    monkeypatch.setattr(sp, "run", lambda *a, **k: sp.CompletedProcess(a, 0, stdout=doc, stderr=""))
    out = d.read_drift_verdict("pageviews", _DUMMY_CONF)
    assert out["run_id"] == "run2" and out["drift_detected"] is True
    assert out["partitions"] == ["202401"]


def test_read_drift_verdict_strips_bom(monkeypatch):
    import subprocess as sp

    doc = "﻿" + '{"run_id": "run2"}'  # BOM UTF-8 en tête (rclone/RGW)
    monkeypatch.setattr(sp, "run", lambda *a, **k: sp.CompletedProcess(a, 0, stdout=doc, stderr=""))
    assert d.read_drift_verdict("pageviews", _DUMMY_CONF)["run_id"] == "run2"


def test_read_drift_verdict_malformed_returns_empty(monkeypatch):
    import subprocess as sp

    monkeypatch.setattr(
        sp, "run", lambda *a, **k: sp.CompletedProcess(a, 0, stdout="{bad", stderr="")
    )
    assert d.read_drift_verdict("pageviews", _DUMMY_CONF) == {}


def test_read_drift_verdict_non_dict_json_returns_empty(monkeypatch):
    import subprocess as sp

    # JSON valide mais pas un objet (liste) → {} (garde-fou de forme).
    monkeypatch.setattr(
        sp, "run", lambda *a, **k: sp.CompletedProcess(a, 0, stdout="[1,2]", stderr="")
    )
    assert d.read_drift_verdict("pageviews", _DUMMY_CONF) == {}


def test_write_drift_verdict_returns_status(monkeypatch):
    import subprocess as sp

    monkeypatch.setattr(sp, "run", lambda *a, **k: sp.CompletedProcess(a, 0, stdout="", stderr=""))
    assert d.write_drift_verdict({"run_id": "r"}, "pageviews", _DUMMY_CONF) is True
    monkeypatch.setattr(sp, "run", lambda *a, **k: sp.CompletedProcess(a, 1, stdout="", stderr="x"))
    assert d.write_drift_verdict({"run_id": "r"}, "pageviews", _DUMMY_CONF) is False
