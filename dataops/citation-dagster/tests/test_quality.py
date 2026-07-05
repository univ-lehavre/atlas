"""Tests des asset checks Great Expectations bloquants (étape 3.5a).

- Corps purs (``check_marts``/``check_curated_edges``/``check_raw``) testés avec le
  loader DuckDB monkeypatché (pas d'I/O S3) → couvre la logique sans Docker.
- **Preuve du blocage** : un check bloquant en échec empêche l'aval de se
  matérialiser (``materialize`` avec un asset-stub portant la clé dbt).

Le vrai bout-en-bout (GE sur le Parquet servi par un dbt build réel) est prouvé par
le smoke MinIO (test_dbt_models / quality intégration).
"""

import json

import pandas as pd
from dagster import AssetCheckResult, AssetKey, asset, materialize

import citation_dagster.assets.quality as q
from citation_dagster.resources import CephTarget

_GOOD_MARTS = pd.DataFrame(
    {
        "author_a": ["https://openalex.org/A1000000001"],
        "author_b": ["https://openalex.org/A1000000002"],
        "cross_citations": [3],
        "a_to_b": [2],
        "b_to_a": [1],
        "_sum_ok": [True],
    }
)


class _FakeRel:
    def __init__(self, df, rows=None):
        self._df = df
        self._rows = rows

    def df(self):
        return self._df

    def fetchall(self):
        # Le glob() de _sample_raw_files renvoie des lignes (file,) via fetchall().
        return self._rows or []


class _FakeCon:
    """Connexion DuckDB factice : renvoie un DataFrame selon le contenu du SELECT.

    Distingue works / authors / autre via une sous-chaîne de la requête. ``check_raw``
    échantillonne : il fait d'abord un ``glob(...)`` (identifié par le param ``glob`` qui
    porte ``raw/works``/``raw/authors``) puis un ``read_json_auto($files)`` (identifié par
    le param ``files`` = la liste échantillonnée). On route sur ces deux paramètres.
    """

    def __init__(self, df, works=None, authors=None):
        self._df = df
        self._works = works
        self._authors = authors

    def sql(self, query, params=None):
        params = params or {}
        glob = params.get("glob", "")
        files = params.get("files", [])
        # 1) glob() de l'échantillonneur : renvoie des fichiers factices (déterministes).
        if "glob(" in query:
            entity = "works" if "raw/works" in glob else "authors"
            rows = [(f"s3://b/raw/{entity}/part_{i:04d}.gz",) for i in range(3)]
            return _FakeRel(None, rows=rows)
        # 2) read_json_auto($files) : route works/authors via le contenu de la liste bindée.
        joined = " ".join(files) if isinstance(files, list) else str(files)
        if self._works is not None and ("raw/works" in query or "raw/works" in joined):
            return _FakeRel(self._works)
        if self._authors is not None and ("raw/authors" in query or "raw/authors" in joined):
            return _FakeRel(self._authors)
        return _FakeRel(self._df)


def _patch_loader(monkeypatch, df=None, works=None, authors=None):
    monkeypatch.setattr(
        q.lakehouse, "connect", lambda cfg=None: _FakeCon(df, works=works, authors=authors)
    )


# ── Corps purs (loader monkeypatché) ─────────────────────────────────────────


def test_check_marts_passes_on_good_df(monkeypatch):
    _patch_loader(monkeypatch, _GOOD_MARTS)
    res = q.check_marts("citation", "run1")
    assert isinstance(res, AssetCheckResult)
    assert res.passed is True


def test_check_marts_fails_on_bad_df(monkeypatch):
    bad = _GOOD_MARTS.copy()
    bad["cross_citations"] = [0]
    bad["_sum_ok"] = [False]
    _patch_loader(monkeypatch, bad)
    res = q.check_marts("citation", "run1")
    assert res.passed is False


_GOOD_RESEARCHERS = pd.DataFrame(
    {
        "author_id": ["https://openalex.org/A1000000001"],
        "kind": ["topic"],
        "label_id": ["https://openalex.org/T20001"],
        "label": ["Magnetic confinement fusion research"],
        "weight": [1.9867],
        "freq": [2],
        "_weight_ok": [True],
    }
)


def test_check_researchers_passes_on_good_df(monkeypatch):
    _patch_loader(monkeypatch, _GOOD_RESEARCHERS)
    res = q.check_researchers("citation", "run1")
    assert isinstance(res, AssetCheckResult)
    assert res.passed is True


def test_check_researchers_fails_on_zero_weight(monkeypatch):
    bad = _GOOD_RESEARCHERS.copy()
    bad["weight"] = [0.0]  # weight strictement > 0 exigé
    bad["_weight_ok"] = [False]
    _patch_loader(monkeypatch, bad)
    assert q.check_researchers("citation", "run1").passed is False


def test_check_researchers_fails_on_bad_kind(monkeypatch):
    bad = _GOOD_RESEARCHERS.copy()
    bad["kind"] = ["concept"]  # hors {topic, keyword}
    _patch_loader(monkeypatch, bad)
    assert q.check_researchers("citation", "run1").passed is False


def test_check_researcher_vectors_passes_normalised(monkeypatch):
    # Vecteur de norme 1 (auteur normal) → _norm_ok True, _dim_ok True.
    df = pd.DataFrame(
        {
            "author_id": ["https://openalex.org/A1000000001"],
            "vector": [[0.1] * 384],
            "_dim_ok": [True],
            "_norm_ok": [True],
        }
    )
    _patch_loader(monkeypatch, df)
    assert q.check_researcher_vectors("citation", "run1").passed is True


def test_check_researcher_vectors_passes_null_vector(monkeypatch):
    # Vecteur NUL légitime (auteur sans publication vectorisable) → norme 0 tolérée.
    df = pd.DataFrame(
        {
            "author_id": ["https://openalex.org/A1000000009"],
            "vector": [[0.0] * 384],
            "_dim_ok": [True],
            "_norm_ok": [True],  # 0.0 ∈ {0, ≈1}
        }
    )
    _patch_loader(monkeypatch, df)
    assert q.check_researcher_vectors("citation", "run1").passed is True


def test_check_researcher_vectors_fails_on_wrong_dim(monkeypatch):
    df = pd.DataFrame(
        {
            "author_id": ["https://openalex.org/A1000000001"],
            "vector": [[0.1] * 100],
            "_dim_ok": [False],  # dimension != 384
            "_norm_ok": [True],
        }
    )
    _patch_loader(monkeypatch, df)
    assert q.check_researcher_vectors("citation", "run1").passed is False


def test_check_curated_edges_passes(monkeypatch):
    df = pd.DataFrame(
        {
            "citing_work_id": ["https://openalex.org/W101"],
            "cited_work_id": ["https://openalex.org/W201"],
            "_no_self_edge": [True],
        }
    )
    _patch_loader(monkeypatch, df)
    assert q.check_curated_edges("citation", "run1").passed is True


def test_check_raw_passes(monkeypatch):
    works = pd.DataFrame(
        {"id": ["https://openalex.org/W1"], "referenced_works": [[]], "authorships": [[]]}
    )
    authors = pd.DataFrame({"id": ["https://openalex.org/A1"]})
    _patch_loader(monkeypatch, works=works, authors=authors)
    assert q.check_raw("citation").passed is True


def _raw_key(i):
    return f"s3://b/raw/works/updated_date=2020-{i:02d}-01/part.gz"


class _GlobCon:
    """Con factice qui ne sert QUE le glob() de _sample_raw_files (N fichiers en entrée)."""

    def __init__(self, n_files):
        self._files = [_raw_key(i) for i in range(n_files)]

    def sql(self, query, params=None):
        return _FakeRel(None, rows=[(f,) for f in self._files])


def test_sample_raw_files_is_bounded_deterministic_and_spread():
    # < N fichiers : renvoie tout (rien à échantillonner).
    assert len(q._sample_raw_files(_GlobCon(5), "b", "raw/works", 24)) == 5
    # > N fichiers : borné à N, déterministe (2 appels identiques), et RÉPARTI (pas les N
    # premiers lexicographiques — un pas régulier couvre toute la plage de partitions).
    con = _GlobCon(240)
    s1 = q._sample_raw_files(con, "b", "raw/works", 24)
    s2 = q._sample_raw_files(con, "b", "raw/works", 24)
    assert len(s1) == 24
    assert s1 == s2  # déterministe
    assert s1 != sorted(_raw_key(i) for i in range(24))  # pas les 24 premiers
    # le dernier échantillon vient de la fin de la plage (répartition, pas les 24 premiers)
    assert int(s1[-1].split("2020-")[1][:2]) >= 20


def test_check_raw_fails_on_bad_author_id(monkeypatch):
    works = pd.DataFrame(
        {"id": ["https://openalex.org/W1"], "referenced_works": [[]], "authorships": [[]]}
    )
    bad_authors = pd.DataFrame({"id": ["https://openalex.org/W9"]})  # W au lieu de A
    _patch_loader(monkeypatch, works=works, authors=bad_authors)
    assert q.check_raw("citation").passed is False


# ── Preuve du BLOCAGE (un check en échec empêche l'aval) ─────────────────────


def test_blocking_check_halts_downstream(monkeypatch):
    # ceph_target_from_env est importé DANS quality → patcher le nom du module quality.
    monkeypatch.setattr(
        q, "ceph_target_from_env", lambda env=None: CephTarget("k", "s", "http://h:1", "citation")
    )
    # Force le check marts à ÉCHOUER.
    monkeypatch.setattr(
        q,
        "check_marts",
        lambda bucket, run_id: AssetCheckResult(
            passed=False, metadata={"suite": "x", "evaluated": 1, "failed_expectations": "forced"}
        ),
    )

    @asset(name="marts_collab_pairs")
    def stub_mart():
        return 1

    @asset(deps=[AssetKey(["marts_collab_pairs"])])
    def downstream():
        return 2

    res = materialize([stub_mart, downstream, q.ge_marts_collab], raise_on_error=False)
    assert res.success is False
    materialized = {tuple(e.asset_key.path) for e in res.get_asset_materialization_events()}
    # L'aval n'est PAS matérialisé : le check bloquant a coupé la chaîne.
    assert ("downstream",) not in materialized
    assert ("marts_collab_pairs",) in materialized


def test_blocking_check_passes_allows_downstream(monkeypatch):
    monkeypatch.setattr(
        q, "ceph_target_from_env", lambda env=None: CephTarget("k", "s", "http://h:1", "citation")
    )
    monkeypatch.setattr(
        q,
        "check_marts",
        lambda bucket, run_id: AssetCheckResult(passed=True, metadata={}),
    )

    @asset(name="marts_collab_pairs")
    def stub_mart():
        return 1

    @asset(deps=[AssetKey(["marts_collab_pairs"])])
    def downstream():
        return 2

    res = materialize([stub_mart, downstream, q.ge_marts_collab], raise_on_error=False)
    assert res.success is True
    materialized = {tuple(e.asset_key.path) for e in res.get_asset_materialization_events()}
    assert ("downstream",) in materialized


# ── _log_ge_to_mlflow (best-effort, atlas#431) ────────────────────────────────


def test_log_ge_noop_without_uri(monkeypatch):
    # MLFLOW_TRACKING_URI absent (CI/dev hermétique) → no-op, renvoie False.
    monkeypatch.delenv("MLFLOW_TRACKING_URI", raising=False)
    result = AssetCheckResult(passed=True, metadata={"suite": "raw_works", "evaluated": 4})
    assert q._log_ge_to_mlflow("ge_raw_contract", "run1", result) is False


def test_log_ge_logs_result_artifact(monkeypatch):
    # URI posée + MLflow stubé → logge le verdict (param/metric) et le JSON du résultat.
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://mlflow.local:5000")
    import contextlib

    import mlflow

    logged = {"params": {}, "metrics": {}, "texts": {}}
    monkeypatch.setattr(mlflow, "set_experiment", lambda name: None)
    monkeypatch.setattr(mlflow, "start_run", lambda **k: contextlib.nullcontext())
    monkeypatch.setattr(mlflow, "log_param", lambda k, v: logged["params"].__setitem__(k, v))
    monkeypatch.setattr(mlflow, "log_metric", lambda k, v: logged["metrics"].__setitem__(k, v))
    monkeypatch.setattr(
        mlflow, "log_text", lambda text, path: logged["texts"].__setitem__(path, text)
    )

    result = AssetCheckResult(
        passed=False,
        metadata={"suite": "marts_collab", "evaluated": 6, "failed_expectations": "weight > 0"},
    )
    assert q._log_ge_to_mlflow("ge_marts_collab", "runX", result) is True
    assert logged["params"]["check"] == "ge_marts_collab"
    assert logged["metrics"]["passed"] == 0  # passed=False → 0
    # Le résultat est publié comme artefact JSON nommé d'après le check.
    payload = json.loads(logged["texts"]["ge_marts_collab.json"])
    assert payload["check"] == "ge_marts_collab"
    assert payload["passed"] is False
    assert payload["suite"] == "marts_collab"


def test_log_ge_handles_failure(monkeypatch):
    # URI posée mais MLflow injoignable → best-effort, renvoie False sans lever.
    monkeypatch.setenv("MLFLOW_TRACKING_URI", "http://127.0.0.1:1/unreachable")
    import mlflow

    def _boom(*a, **k):
        raise RuntimeError("unreachable")

    monkeypatch.setattr(mlflow, "set_experiment", _boom)
    result = AssetCheckResult(passed=True, metadata={"suite": "raw_works"})
    assert q._log_ge_to_mlflow("ge_raw_contract", "run1", result) is False
