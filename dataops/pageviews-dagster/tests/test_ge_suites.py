"""Tests des suites Great Expectations « pageviews » + de la validation (hermétiques).

Module pur : ``validate_df`` monte un contexte GE ÉPHÉMÈRE (en mémoire, sans disque ni
réseau, télémétrie coupée) et valide un ``DataFrame`` pandas contre une suite. On vérifie
que la suite du brut mensuel (raw) et celle du mart de prévision servi (marts) PASSENT sur
des données conformes et ÉCHOUENT sur les violations attendues (format du mois, borne des
vues, domaine des labels/modes, unicité du grain via ``_unique_grain``).
"""

import pandas as pd

from pageviews_dagster import ge_suites

# ── Couche raw : série mensuelle des vues ────────────────────────────────────


def test_raw_suite_passes_on_good_df(good_raw_df) -> None:
    ok, meta = ge_suites.validate_df(
        good_raw_df, "raw_pageviews", ge_suites.raw_pageviews_expectations()
    )
    assert ok is True
    assert meta["failed"] == []
    assert meta["suite"] == "raw_pageviews"
    assert meta["evaluated"] > 0


def test_raw_suite_fails_on_bad_month_format(good_raw_df) -> None:
    bad = good_raw_df.copy()
    bad["month"] = ["2024-01", "2024-02", "2024-01"]  # tiret au lieu de AAAAMM
    ok, meta = ge_suites.validate_df(bad, "raw_pageviews", ge_suites.raw_pageviews_expectations())
    assert ok is False
    assert "expect_column_values_to_match_regex" in meta["failed"]


def test_raw_suite_fails_on_negative_views(good_raw_df) -> None:
    bad = good_raw_df.copy()
    bad["views"] = [-1, 10, 20]  # un compteur de vues ne peut être négatif
    ok, meta = ge_suites.validate_df(bad, "raw_pageviews", ge_suites.raw_pageviews_expectations())
    assert ok is False
    assert "expect_column_values_to_be_between" in meta["failed"]


def test_raw_suite_fails_on_null_university_id(good_raw_df) -> None:
    bad = good_raw_df.copy()
    bad["university_id"] = [None, "ror-x", "ror-y"]
    ok, meta = ge_suites.validate_df(bad, "raw_pageviews", ge_suites.raw_pageviews_expectations())
    assert ok is False
    assert "expect_column_values_to_not_be_null" in meta["failed"]


def test_raw_suite_fails_on_empty_table() -> None:
    empty = pd.DataFrame({"university_id": [], "month": [], "views": []})
    ok, meta = ge_suites.validate_df(empty, "raw_pageviews", ge_suites.raw_pageviews_expectations())
    assert ok is False
    assert "expect_table_row_count_to_be_between" in meta["failed"]


# ── Couche marts : mart de prévision servi ───────────────────────────────────


def test_marts_suite_passes_on_good_df(good_marts_df) -> None:
    ok, meta = ge_suites.validate_df(
        good_marts_df, "marts_views_forecast", ge_suites.marts_views_forecast_expectations()
    )
    assert ok is True
    assert meta["failed"] == []


def test_marts_suite_fails_on_negative_prediction(good_marts_df) -> None:
    bad = good_marts_df.copy()
    bad["views_pred"] = [-5.0, 3600.0, 14400.0]  # une prévision de vues ne peut être négative
    ok, meta = ge_suites.validate_df(
        bad, "marts_views_forecast", ge_suites.marts_views_forecast_expectations()
    )
    assert ok is False
    assert "expect_column_values_to_be_between" in meta["failed"]


def test_marts_suite_fails_on_unknown_horizon_label(good_marts_df) -> None:
    bad = good_marts_df.copy()
    bad["horizon_label"] = ["week_1", "month_3", "year_1"]  # week_1 hors domaine mensuel
    ok, meta = ge_suites.validate_df(
        bad, "marts_views_forecast", ge_suites.marts_views_forecast_expectations()
    )
    assert ok is False
    assert "expect_column_values_to_be_in_set" in meta["failed"]


def test_marts_suite_fails_on_unknown_served_mode(good_marts_df) -> None:
    bad = good_marts_df.copy()
    bad["served_mode"] = ["predictive", "descriptive", "hybrid"]  # hybrid hors domaine
    ok, meta = ge_suites.validate_df(
        bad, "marts_views_forecast", ge_suites.marts_views_forecast_expectations()
    )
    assert ok is False
    assert "expect_column_values_to_be_in_set" in meta["failed"]


def test_marts_suite_fails_on_duplicate_grain(good_marts_df) -> None:
    # Unicité composite (university_id, horizon_label) portée par la colonne dérivée booléenne
    # _unique_grain : un doublon la met à False → l'attente in_set([True]) échoue.
    bad = good_marts_df.copy()
    bad["_unique_grain"] = [False, True, True]
    ok, meta = ge_suites.validate_df(
        bad, "marts_views_forecast", ge_suites.marts_views_forecast_expectations()
    )
    assert ok is False
    assert "expect_column_values_to_be_in_set" in meta["failed"]


def test_marts_suite_fails_on_null_key(good_marts_df) -> None:
    bad = good_marts_df.copy()
    bad["university_id"] = [None, "ror-a", "ror-b"]
    ok, meta = ge_suites.validate_df(
        bad, "marts_views_forecast", ge_suites.marts_views_forecast_expectations()
    )
    assert ok is False
    assert "expect_column_values_to_not_be_null" in meta["failed"]


# ── Forme des builders (purs, sans contexte) ─────────────────────────────────


def test_builders_return_expectation_lists() -> None:
    raw = ge_suites.raw_pageviews_expectations()
    marts = ge_suites.marts_views_forecast_expectations()
    assert isinstance(raw, list) and len(raw) > 0
    assert isinstance(marts, list) and len(marts) > 0
