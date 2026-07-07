"""Tests de l'asset check GE « pageviews » (câblage : chargement → validation → verdict).

La logique pure des suites GE est testée dans ``test_ge_suites`` (contexte GE éphémère). Ici
on valide l'ORCHESTRATION des *asset checks* bloquants : le corps pur ``check_*`` charge la
donnée via ``lakehouse.connect`` puis délègue à ``ge_suites.validate_df`` et mappe le verdict
en ``AssetCheckResult`` ; les wrappers Dagster résolvent le run (``context.run.run_id`` — pas
``context.run_id``), délèguent au corps pur, puis republient le verdict dans MLflow
(best-effort). Tout est hermétique : DuckDB est remplacé par un ``_FakeCon`` (aucun S3), et
MLflow est neutralisé sauf test dédié (aucun serveur).

Le brut des vues est une série MENSUELLE : les ``DataFrame`` de contrat (fixtures
``good_raw_df`` / ``good_marts_df`` de conftest) portent un ``month`` au format AAAAMM.
"""

import sys
import types

import pandas as pd
import pytest

from pageviews_dagster.assets import quality as q
from pageviews_dagster.resources import CephTarget

# ── Doublures I/O : DuckDB factice (con.sql(...).df()) ───────────────────────


class _FakeRel:
    """Relation DuckDB factice : ne rend que le ``DataFrame`` injecté (``.df()``)."""

    def __init__(self, df: pd.DataFrame) -> None:
        self._df = df

    def df(self) -> pd.DataFrame:
        return self._df


class _FakeCon:
    """Connexion DuckDB factice : ``sql(query)`` mémorise la requête et sert le DF fixé.

    Le corps pur projette explicitement les colonnes (SELECT … , jamais SELECT *) : on capte
    la requête pour vérifier qu'elle ne matérialise pas de colonne lourde ni ``SELECT *``.
    """

    def __init__(self, df: pd.DataFrame) -> None:
        self._df = df
        self.queries: list[str] = []

    def sql(self, query: str) -> _FakeRel:
        self.queries.append(query)
        return _FakeRel(self._df)


def _patch_connect(monkeypatch, con: _FakeCon) -> None:
    monkeypatch.setattr(q.lakehouse, "connect", lambda cfg=None: con)


def _patch_ceph(monkeypatch) -> None:
    target = CephTarget("AK", "SK", "http://h:80", "pageviews")
    monkeypatch.setattr(q, "ceph_target_from_env", lambda env=None: target)


class _FakeCtx:
    """Contexte d'asset check minimal : expose ``run.run_id`` (et pas ``run_id`` directement).

    Reproduit la seule surface consommée par les wrappers — l'``AssetCheckExecutionContext``
    n'expose PAS ``run_id`` directement, contrairement à l'``AssetExecutionContext`` : le run
    est résolu par ``context.run.run_id``.
    """

    def __init__(self, run_id: str = "run-xyz") -> None:
        self.run = types.SimpleNamespace(run_id=run_id)


def _undecorated(check):
    """Fonction Python nue derrière un ``@asset_check`` (invocable avec un faux contexte)."""
    return check.op.compute_fn.decorated_fn


# ── _result : mapping verdict GE → AssetCheckResult ──────────────────────────


def _meta(res, key: str):
    """Valeur nue d'une métadonnée d'``AssetCheckResult`` (Dagster enveloppe en MetadataValue)."""
    return res.metadata[key].value


def test_result_maps_passed_and_metadata() -> None:
    meta = {"suite": "raw_pageviews", "evaluated": 5, "failed": []}
    res = q._result(True, meta)
    assert res.passed is True
    assert _meta(res, "suite") == "raw_pageviews"
    assert _meta(res, "evaluated") == 5
    # Aucune attente échouée → placeholder « — » (jamais une chaîne vide).
    assert _meta(res, "failed_expectations") == "—"


def test_result_joins_failed_expectations() -> None:
    meta = {
        "suite": "marts_views_forecast",
        "evaluated": 8,
        "failed": ["expect_column_values_to_be_between", "expect_column_values_to_be_in_set"],
    }
    res = q._result(False, meta)
    assert res.passed is False
    assert "expect_column_values_to_be_between" in _meta(res, "failed_expectations")
    assert "expect_column_values_to_be_in_set" in _meta(res, "failed_expectations")


# ── check_raw_pageviews : chargement + validation du brut mensuel ────────────


def test_check_raw_pageviews_passes_on_good_df(monkeypatch, good_raw_df) -> None:
    con = _FakeCon(good_raw_df)
    _patch_connect(monkeypatch, con)
    res = q.check_raw_pageviews("pageviews")
    assert res.passed is True
    assert _meta(res, "suite") == "raw_pageviews"
    assert _meta(res, "failed_expectations") == "—"


def test_check_raw_pageviews_projects_columns_not_select_star(monkeypatch, good_raw_df) -> None:
    # Contrat de forme : la requête projette explicitement les colonnes (jamais SELECT *),
    # neutralise les colonnes Hive fantômes (hive_partitioning=false) et vise le brut mensuel.
    con = _FakeCon(good_raw_df)
    _patch_connect(monkeypatch, con)
    q.check_raw_pageviews("pageviews")
    (query,) = con.queries
    assert "SELECT university_id, month, views" in query
    assert "SELECT *" not in query
    assert "hive_partitioning=false" in query
    assert "raw/pageviews" in query


def test_check_raw_pageviews_fails_on_bad_month_format(monkeypatch, good_raw_df) -> None:
    bad = good_raw_df.copy()
    bad["month"] = ["2024-01", "2024-02", "2024-01"]  # tiret au lieu de AAAAMM
    _patch_connect(monkeypatch, _FakeCon(bad))
    res = q.check_raw_pageviews("pageviews")
    assert res.passed is False
    assert "expect_column_values_to_match_regex" in _meta(res, "failed_expectations")


def test_check_raw_pageviews_fails_on_negative_views(monkeypatch, good_raw_df) -> None:
    bad = good_raw_df.copy()
    bad["views"] = [-1, 10, 20]  # un compteur de vues ne peut être négatif
    _patch_connect(monkeypatch, _FakeCon(bad))
    res = q.check_raw_pageviews("pageviews")
    assert res.passed is False
    assert "expect_column_values_to_be_between" in _meta(res, "failed_expectations")


def test_check_raw_pageviews_fails_on_null_university_id(monkeypatch, good_raw_df) -> None:
    bad = good_raw_df.copy()
    bad["university_id"] = [None, "ror-x", "ror-y"]
    _patch_connect(monkeypatch, _FakeCon(bad))
    res = q.check_raw_pageviews("pageviews")
    assert res.passed is False
    assert "expect_column_values_to_not_be_null" in _meta(res, "failed_expectations")


# ── check_marts_views_forecast : chargement + validation du mart servi ───────


def test_check_marts_views_forecast_passes_on_good_df(monkeypatch, good_marts_df) -> None:
    con = _FakeCon(good_marts_df)
    _patch_connect(monkeypatch, con)
    res = q.check_marts_views_forecast("pageviews", "run-42")
    assert res.passed is True
    assert _meta(res, "suite") == "marts_views_forecast"
    assert _meta(res, "failed_expectations") == "—"


def test_check_marts_views_forecast_filters_by_run(monkeypatch, good_marts_df) -> None:
    # Le mart est partitionné par JOUR d'exécution : on ne reconstruit pas le jour, on lit
    # toutes les partitions dt=* filtrées par le run={run_id} courant, et on calcule la
    # colonne dérivée _unique_grain en SQL (unicité composite du grain).
    con = _FakeCon(good_marts_df)
    _patch_connect(monkeypatch, con)
    q.check_marts_views_forecast("pageviews", "run-42")
    (query,) = con.queries
    assert "dt=*/run=run-42" in query
    assert "_unique_grain" in query
    assert "marts/views_forecast" in query
    assert "SELECT *" not in query


def test_check_marts_forecast_fails_on_negative_prediction(monkeypatch, good_marts_df) -> None:
    bad = good_marts_df.copy()
    bad["views_pred"] = [-5.0, 3600.0, 14400.0]  # une prévision de vues ne peut être négative
    _patch_connect(monkeypatch, _FakeCon(bad))
    res = q.check_marts_views_forecast("pageviews", "run-42")
    assert res.passed is False
    assert "expect_column_values_to_be_between" in _meta(res, "failed_expectations")


def test_check_marts_views_forecast_fails_on_duplicate_grain(monkeypatch, good_marts_df) -> None:
    # _unique_grain=False (doublon (university_id, horizon_label)) → in_set([True]) échoue.
    bad = good_marts_df.copy()
    bad["_unique_grain"] = [False, True, True]
    _patch_connect(monkeypatch, _FakeCon(bad))
    res = q.check_marts_views_forecast("pageviews", "run-42")
    assert res.passed is False
    assert "expect_column_values_to_be_in_set" in _meta(res, "failed_expectations")


def test_check_marts_forecast_fails_on_unknown_served_mode(monkeypatch, good_marts_df) -> None:
    bad = good_marts_df.copy()
    bad["served_mode"] = ["predictive", "descriptive", "hybrid"]  # hybrid hors domaine
    _patch_connect(monkeypatch, _FakeCon(bad))
    res = q.check_marts_views_forecast("pageviews", "run-42")
    assert res.passed is False
    assert "expect_column_values_to_be_in_set" in _meta(res, "failed_expectations")


# ── Wrappers @asset_check : résolution du run (context.run.run_id) + délégation ──


def test_ge_raw_pageviews_wrapper_passes(monkeypatch, good_raw_df) -> None:
    # MLflow neutralisé (no-op) : pas de tracking URI en test.
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
    con = _FakeCon(good_raw_df)
    _patch_connect(monkeypatch, con)
    _patch_ceph(monkeypatch)
    res = _undecorated(q.ge_raw_pageviews)(_FakeCtx("run-abc"))
    assert res.passed is True
    # Le bucket vient bien de ceph_target_from_env (chemin raw ciblé).
    assert any("raw/pageviews" in query for query in con.queries)


def test_ge_raw_pageviews_wrapper_fails_on_bad_data(monkeypatch, good_raw_df) -> None:
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
    bad = good_raw_df.copy()
    bad["views"] = [-1, 10, 20]
    _patch_connect(monkeypatch, _FakeCon(bad))
    _patch_ceph(monkeypatch)
    res = _undecorated(q.ge_raw_pageviews)(_FakeCtx("run-abc"))
    assert res.passed is False


def test_ge_marts_views_forecast_wrapper_passes_and_uses_run_id(monkeypatch, good_marts_df) -> None:
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
    con = _FakeCon(good_marts_df)
    _patch_connect(monkeypatch, con)
    _patch_ceph(monkeypatch)
    res = _undecorated(q.ge_marts_views_forecast)(_FakeCtx("run-777"))
    assert res.passed is True
    # Le wrapper résout le run via context.run.run_id et le passe au glob de lecture.
    assert any("run=run-777" in query for query in con.queries)


# ── _log_ge_to_mlflow : best-effort (no-op sans URI, jamais bloquant) ────────


def _sample_result():
    return q._result(True, {"suite": "raw_pageviews", "evaluated": 5, "failed": []})


def test_log_ge_to_mlflow_noop_without_uri(monkeypatch) -> None:
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
    assert q._log_ge_to_mlflow("ge_raw_pageviews", "run1", _sample_result()) is False


def test_log_ge_to_mlflow_logs_when_configured(monkeypatch) -> None:
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
    calls: dict = {}
    fake = types.ModuleType("mlflow")
    fake.set_experiment = lambda exp: calls.setdefault("experiment", exp)

    class _RunCtx:
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    fake.start_run = lambda run_name=None: _RunCtx()
    fake.log_param = lambda *a, **k: calls.setdefault("params", []).append(a)
    fake.log_metric = lambda name, value: calls.setdefault("metrics", {}).update({name: value})
    fake.log_text = lambda text, artifact_file: calls.setdefault("artifact", artifact_file)
    monkeypatch.setitem(sys.modules, "mlflow", fake)

    ok = q._log_ge_to_mlflow("ge_raw_pageviews", "run1", _sample_result())
    assert ok is True
    assert calls["experiment"] == q._QUALITY_EXPERIMENT
    assert calls["metrics"]["passed"] == 1  # verdict True → 1
    assert calls["artifact"] == "ge_raw_pageviews.json"


def test_log_ge_to_mlflow_swallows_errors(monkeypatch) -> None:
    # Best-effort : MLflow injoignable/en erreur ne DOIT jamais faire échouer la porte GE.
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
    fake = types.ModuleType("mlflow")

    def _boom(*a, **k):
        raise RuntimeError("mlflow down")

    fake.set_experiment = _boom
    fake.start_run = _boom
    monkeypatch.setitem(sys.modules, "mlflow", fake)
    assert q._log_ge_to_mlflow("ge_raw_pageviews", "run1", _sample_result()) is False


def test_wrapper_still_returns_verdict_when_mlflow_down(monkeypatch, good_raw_df) -> None:
    # Le wrapper renvoie le verdict GE même si la republication MLflow échoue (découplage).
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
    fake = types.ModuleType("mlflow")

    def _boom(*a, **k):
        raise RuntimeError("mlflow down")

    fake.set_experiment = _boom
    monkeypatch.setitem(sys.modules, "mlflow", fake)
    _patch_connect(monkeypatch, _FakeCon(good_raw_df))
    _patch_ceph(monkeypatch)
    res = _undecorated(q.ge_raw_pageviews)(_FakeCtx("run-abc"))
    assert res.passed is True


@pytest.mark.parametrize("check_name", ["ge_raw_pageviews", "ge_marts_views_forecast"])
def test_log_ge_to_mlflow_names_artifact_per_check(monkeypatch, check_name) -> None:
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
    seen: dict = {}
    fake = types.ModuleType("mlflow")
    fake.set_experiment = lambda exp: None

    class _RunCtx:
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    fake.start_run = lambda run_name=None: _RunCtx()
    fake.log_param = lambda *a, **k: None
    fake.log_metric = lambda *a, **k: None
    fake.log_text = lambda text, artifact_file: seen.setdefault("file", artifact_file)
    monkeypatch.setitem(sys.modules, "mlflow", fake)
    q._log_ge_to_mlflow(check_name, "run1", _sample_result())
    assert seen["file"] == f"{check_name}.json"
