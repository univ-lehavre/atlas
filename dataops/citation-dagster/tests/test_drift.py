"""Tests de l'asset check de drift Evidently (MLOps 1→2, NON bloquant).

Pattern calqué sur ``test_quality.py`` : corps purs testés avec le loader DuckDB
monkeypatché (pas d'I/O S3, pas de Dagster). Couvre :
- ``compute_drift`` : deux distributions identiques → pas de drift ; décalées → drift ;
- ``check_embedding_drift`` : 1er run (baseline absente) ; run stable ; run dérivé ;
- ``_log_to_mlflow`` : no-op silencieux sans MLFLOW_TRACKING_URI.

Le vrai bout-en-bout (drift sur le Parquet servi) viendrait du smoke MinIO, comme GE.
"""

import numpy as np
import pandas as pd
import pytest
from dagster import AssetCheckResult

import citation_dagster.assets.drift as d
from citation_dagster import embedding


@pytest.fixture
def _no_mlflow(monkeypatch):
    """Garantit MLFLOW_TRACKING_URI absent → _log_to_mlflow no-op (mlflow_logged=False),
    pour que les tests de drift ne dépendent pas d'un serveur MLflow."""
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)


_DIM = embedding.EMBEDDING_DIM
_COLS = [f"e{i}" for i in range(_DIM)]


def _emb_df(n, loc, seed):
    """n lignes de vecteurs (_DIM colonnes) gaussiens centrés sur `loc` (graine fixe)."""
    rng = np.random.default_rng(seed)
    return pd.DataFrame(rng.normal(loc, 1.0, (n, _DIM)), columns=_COLS)


class _FakeRel:
    def __init__(self, rows=None, df=None):
        self._rows = rows
        self._df = df

    def fetchall(self):
        return self._rows

    def df(self):
        return self._df


class _FakeCon:
    """Connexion DuckDB factice : `_list_runs` (SELECT DISTINCT run) renvoie `runs` ;
    `_load_vectors_df` (SELECT … vector[i]) renvoie le DataFrame du run extrait du glob."""

    def __init__(self, runs, vectors_by_run):
        self._runs = runs
        self._vectors = vectors_by_run

    def sql(self, query):
        if "DISTINCT run" in query:
            return _FakeRel(rows=[(r,) for r in self._runs])
        # _load_vectors_df : retrouver le run dans le glob `run=<id>/`.
        for run_id, df in self._vectors.items():
            if f"run={run_id}/" in query:
                return _FakeRel(df=df)
        return _FakeRel(df=pd.DataFrame(columns=_COLS))


def _patch(monkeypatch, runs, vectors_by_run):
    monkeypatch.setattr(d.lakehouse, "connect", lambda cfg=None: _FakeCon(runs, vectors_by_run))


# ── compute_drift (pur, sans I/O) ─────────────────────────────────────────────


def test_compute_drift_stable_identical():
    # Deux jeux issus de la MÊME distribution → drift_score bas, pas de drift détecté.
    ref = _emb_df(60, 0.0, seed=1)
    cur = _emb_df(60, 0.0, seed=2)
    out = d.compute_drift(ref, cur)
    assert set(out) == {"drift_score", "drift_detected", "method"}
    assert out["drift_detected"] is False


def test_compute_drift_detects_shift():
    # Distribution nettement décalée → drift détecté.
    ref = _emb_df(60, 0.0, seed=1)
    cur = _emb_df(60, 3.0, seed=2)
    out = d.compute_drift(ref, cur)
    assert out["drift_detected"] is True
    assert out["drift_score"] > 0.0


# ── check_embedding_drift (corps complet, loader + mlflow monkeypatchés) ──────


def test_first_run_has_no_baseline(monkeypatch):
    # Un seul run consigné = le courant → pas de N-1 → check passé, baseline absente.
    _patch(monkeypatch, runs=["run1"], vectors_by_run={"run1": _emb_df(10, 0.0, 1)})
    res = d.check_embedding_drift("citation", "run1")
    assert isinstance(res, AssetCheckResult)
    assert res.passed is True
    # Dagster enrobe les valeurs de métadonnée (TextMetadataValue.text).
    assert "baseline absente" in res.metadata["drift"].text


def test_stable_run_passes(monkeypatch, _no_mlflow):
    # N-1 et N tirés de la même distribution → Evidently ne détecte pas de drift → passed.
    runs = ["run1", "run2"]
    vectors = {"run1": _emb_df(60, 0.0, 1), "run2": _emb_df(60, 0.0, 2)}
    _patch(monkeypatch, runs=runs, vectors_by_run=vectors)
    res = d.check_embedding_drift("citation", "run2")
    assert res.passed is True
    assert res.metadata["drift_detected"].value is False
    assert res.metadata["baseline_run"].text == "run1"
    assert res.metadata["mlflow_logged"].value is False  # MLFLOW_TRACKING_URI absent


def test_drifted_run_flags_detected(monkeypatch, _no_mlflow):
    # N nettement décalé vs N-1 → Evidently détecte le drift → passed False (informatif,
    # NON bloquant : le wrapper @asset_check porte blocking=False).
    runs = ["run1", "run2"]
    vectors = {"run1": _emb_df(60, 0.0, 1), "run2": _emb_df(60, 5.0, 2)}
    _patch(monkeypatch, runs=runs, vectors_by_run=vectors)
    res = d.check_embedding_drift("citation", "run2")
    assert res.passed is False
    assert res.metadata["drift_detected"].value is True
    assert "ré-entraînement" in res.metadata["verdict"].text


def test_baseline_is_previous_not_oldest(monkeypatch, _no_mlflow):
    # Avec 3 runs, la baseline du dernier est l'AVANT-DERNIER (N-1), pas le plus ancien.
    runs = ["run1", "run2", "run3"]
    vectors = {
        "run1": _emb_df(60, 0.0, 1),
        "run2": _emb_df(60, 0.0, 2),
        "run3": _emb_df(60, 0.0, 3),
    }
    _patch(monkeypatch, runs=runs, vectors_by_run=vectors)
    res = d.check_embedding_drift("citation", "run3")
    assert res.metadata["baseline_run"].text == "run2"


# ── _log_to_mlflow (best-effort) ──────────────────────────────────────────────


def test_log_to_mlflow_noop_without_uri(monkeypatch):
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
    assert d._log_to_mlflow("run1", {"drift_score": 0.1, "drift_detected": False}) is False


def test_log_to_mlflow_handles_failure(monkeypatch):
    # URI posée mais MLflow injoignable → best-effort, renvoie False sans lever.
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://127.0.0.1:1/unreachable")

    import mlflow

    def _boom(*a, **k):
        raise RuntimeError("unreachable")

    monkeypatch.setattr(mlflow, "set_experiment", _boom)
    assert d._log_to_mlflow("run1", {"drift_score": 0.1, "drift_detected": False}) is False


def test_log_to_mlflow_success(monkeypatch):
    # URI posée + MLflow stubé joignable → logge params/métriques, renvoie True.
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://mlflow.local:5000")
    import contextlib

    import mlflow

    logged = {"params": {}, "metrics": {}}
    monkeypatch.setattr(mlflow, "set_experiment", lambda name: None)
    monkeypatch.setattr(mlflow, "start_run", lambda **k: contextlib.nullcontext())
    monkeypatch.setattr(mlflow, "log_param", lambda k, v: logged["params"].__setitem__(k, v))
    monkeypatch.setattr(mlflow, "log_metric", lambda k, v: logged["metrics"].__setitem__(k, v))
    ok = d._log_to_mlflow("runX", {"drift_score": 0.42, "drift_detected": True})
    assert ok is True
    assert logged["params"]["run_id"] == "runX"
    assert logged["metrics"]["drift_score"] == 0.42
    assert logged["metrics"]["drift_detected"] == 1
