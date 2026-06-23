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
