"""Tests de la suite GE du brut GKG + de l'asset check bloquant (hermétiques)."""

import pandas as pd

from mediawatch_dagster import ge_suites
from mediawatch_dagster.assets import quality as q

_GOOD = pd.DataFrame(
    {
        "record_id": ["20260101120000-1"],
        "date": ["20260101120000"],
        "organization": ["Harvard University"],
        "source_common_name": ["example.com"],
        "document_identifier": ["http://example.com/a"],
        "translated": [False],
    }
)


def test_raw_gkg_suite_passes_on_good_df() -> None:
    ok, meta = ge_suites.validate_df(_GOOD, "raw_gkg", ge_suites.raw_gkg_expectations())
    assert ok is True
    assert meta["failed"] == []


def test_raw_gkg_suite_fails_on_bad_date_format() -> None:
    bad = _GOOD.copy()
    bad["date"] = ["2026-01-01"]  # tiret au lieu de YYYYMMDDHHMMSS
    ok, meta = ge_suites.validate_df(bad, "raw_gkg", ge_suites.raw_gkg_expectations())
    assert ok is False
    assert "expect_column_values_to_match_regex" in meta["failed"]


def test_raw_gkg_suite_fails_on_empty_organization() -> None:
    bad = _GOOD.copy()
    bad["organization"] = [""]
    ok, meta = ge_suites.validate_df(bad, "raw_gkg", ge_suites.raw_gkg_expectations())
    assert ok is False


class _FakeRel:
    def __init__(self, df: pd.DataFrame) -> None:
        self._df = df

    def df(self) -> pd.DataFrame:
        return self._df


class _FakeCon:
    def __init__(self, df: pd.DataFrame) -> None:
        self._df = df

    def sql(self, _query: str) -> _FakeRel:
        return _FakeRel(self._df)


def test_check_raw_gkg_passes(monkeypatch) -> None:
    monkeypatch.setattr(q.lakehouse, "connect", lambda cfg=None: _FakeCon(_GOOD))
    res = q.check_raw_gkg("mediawatch")
    assert res.passed is True


def test_check_raw_gkg_fails_on_bad_data(monkeypatch) -> None:
    bad = _GOOD.copy()
    bad["record_id"] = [None]
    monkeypatch.setattr(q.lakehouse, "connect", lambda cfg=None: _FakeCon(bad))
    res = q.check_raw_gkg("mediawatch")
    assert res.passed is False


# ── Curated (mentions qualifiées « université ») ─────────────────────────────

_GOOD_CURATED = pd.DataFrame(
    {
        "record_id": ["20260101120000-1"],
        "event_date": ["2026-01-01"],
        "university_id": ["ror-03vek6s52"],
        "university_name": ["Harvard University"],
    }
)


def test_curated_university_suite_passes() -> None:
    ok, meta = ge_suites.validate_df(
        _GOOD_CURATED,
        "curated_university_mentions",
        ge_suites.curated_university_mentions_expectations(),
    )
    assert ok is True
    assert meta["failed"] == []


def test_curated_university_suite_fails_on_null_university_id() -> None:
    bad = _GOOD_CURATED.copy()
    bad["university_id"] = [None]
    ok, _ = ge_suites.validate_df(
        bad,
        "curated_university_mentions",
        ge_suites.curated_university_mentions_expectations(),
    )
    assert ok is False


def test_check_curated_universities_passes(monkeypatch) -> None:
    monkeypatch.setattr(q.lakehouse, "connect", lambda cfg=None: _FakeCon(_GOOD_CURATED))
    res = q.check_curated_universities("mediawatch", "run1")
    assert res.passed is True


# ── Mart timeline (chronogramme servi) ───────────────────────────────────────

_GOOD_TIMELINE = pd.DataFrame(
    {
        "university_id": ["ror-03vek6s52"],
        "university_name": ["Harvard University"],
        "event_date": ["2026-01-01"],
        "n_articles": [3],
    }
)


def test_timeline_suite_passes() -> None:
    ok, meta = ge_suites.validate_df(
        _GOOD_TIMELINE,
        "marts_university_timeline",
        ge_suites.marts_university_timeline_expectations(),
    )
    assert ok is True
    assert meta["failed"] == []


def test_timeline_suite_fails_on_zero_articles() -> None:
    bad = _GOOD_TIMELINE.copy()
    bad["n_articles"] = [0]  # un jour listé a au moins 1 article
    ok, _ = ge_suites.validate_df(
        bad,
        "marts_university_timeline",
        ge_suites.marts_university_timeline_expectations(),
    )
    assert ok is False


def test_check_marts_timeline_passes(monkeypatch) -> None:
    monkeypatch.setattr(q.lakehouse, "connect", lambda cfg=None: _FakeCon(_GOOD_TIMELINE))
    res = q.check_marts_timeline("mediawatch", "run1")
    assert res.passed is True
