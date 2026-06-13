"""Tests des asset checks Great Expectations bloquants (étape 3.5a).

- Corps purs (``check_marts``/``check_curated_edges``/``check_raw``) testés avec le
  loader DuckDB monkeypatché (pas d'I/O S3) → couvre la logique sans Docker.
- **Preuve du blocage** : un check bloquant en échec empêche l'aval de se
  matérialiser (``materialize`` avec un asset-stub portant la clé dbt).

Le vrai bout-en-bout (GE sur le Parquet servi par un dbt build réel) est prouvé par
le smoke MinIO (test_dbt_models / quality intégration).
"""

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
    def __init__(self, df):
        self._df = df

    def df(self):
        return self._df


class _FakeCon:
    """Connexion DuckDB factice : renvoie un DataFrame selon le contenu du SELECT.

    Distingue works / authors / autre via une sous-chaîne de la requête, pour que
    ``check_raw`` (deux SELECT distincts) reçoive la bonne table.
    """

    def __init__(self, df, works=None, authors=None):
        self._df = df
        self._works = works
        self._authors = authors

    def sql(self, query):
        if self._works is not None and "raw/works" in query:
            return _FakeRel(self._works)
        if self._authors is not None and "raw/authors" in query:
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
