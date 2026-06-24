"""Tests des suites Great Expectations et de la validation (étape 3.5a).

Purs et hermétiques (contexte GE éphémère, aucun Docker, aucune I/O) : prouvent que
chaque suite passe sur une donnée conforme et ÉCHOUE sur une donnée non conforme
(garantie de la porte de qualité), et que la barre de progression GE ne fuit pas sur
stdout.
"""

import contextlib
import io

import pandas as pd

from citation_dagster import ge_suites as g


def test_raw_works_pass_and_fail():
    good = pd.DataFrame(
        {
            "id": ["https://openalex.org/W1"],
            "referenced_works": [[]],
            "authorships": [[]],
        }
    )
    ok, meta = g.validate_df(good, "raw_works", g.raw_works_expectations())
    assert ok and meta["failed"] == []

    # id au mauvais format → l'attente regex échoue.
    bad = good.copy()
    bad["id"] = ["ftp://wrong/W1"]
    ok2, meta2 = g.validate_df(bad, "raw_works", g.raw_works_expectations())
    assert not ok2
    assert "expect_column_values_to_match_regex" in meta2["failed"]


def test_raw_works_fail_on_missing_column():
    # Colonne attendue absente (le staging la consomme) → ExpectColumnToExist échoue.
    df = pd.DataFrame({"id": ["https://openalex.org/W1"]})
    ok, meta = g.validate_df(df, "raw_works", g.raw_works_expectations())
    assert not ok
    assert "expect_column_to_exist" in meta["failed"]


def test_raw_authors_pass_and_fail():
    good = pd.DataFrame({"id": ["https://openalex.org/A1"]})
    assert g.validate_df(good, "raw_authors", g.raw_authors_expectations())[0]
    bad = pd.DataFrame({"id": ["https://openalex.org/W1"]})  # W au lieu de A
    assert not g.validate_df(bad, "raw_authors", g.raw_authors_expectations())[0]


def test_curated_edges_pass_and_self_edge_fails():
    good = pd.DataFrame(
        {
            "citing_work_id": ["https://openalex.org/W101"],
            "cited_work_id": ["https://openalex.org/W201"],
            "_no_self_edge": [True],
        }
    )
    assert g.validate_df(good, "curated_edges", g.curated_edges_expectations())[0]

    # Auto-citation (citing == cited) → _no_self_edge False → échec.
    bad = good.copy()
    bad["_no_self_edge"] = [False]
    ok, meta = g.validate_df(bad, "curated_edges", g.curated_edges_expectations())
    assert not ok
    assert "expect_column_values_to_be_in_set" in meta["failed"]


def test_marts_pass_and_invariants_fail():
    good = pd.DataFrame(
        {
            "author_a": ["https://openalex.org/A1000000001"],
            "author_b": ["https://openalex.org/A1000000002"],
            "cross_citations": [3],
            "a_to_b": [2],
            "b_to_a": [1],
            "_sum_ok": [True],
        }
    )
    assert g.validate_df(good, "marts_collab", g.marts_collab_expectations())[0]

    # cross_citations=0 (borne >=1) ET somme incohérente → deux attentes échouent.
    bad = good.copy()
    bad["cross_citations"] = [0]
    bad["_sum_ok"] = [False]
    ok, meta = g.validate_df(bad, "marts_collab", g.marts_collab_expectations())
    assert not ok
    assert "expect_column_values_to_be_between" in meta["failed"]
    assert "expect_column_values_to_be_in_set" in meta["failed"]


def test_validate_df_does_not_leak_progress_bar_to_stdout():
    df = pd.DataFrame({"id": ["https://openalex.org/A1"]})
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        g.validate_df(df, "raw_authors", g.raw_authors_expectations())
    # La barre « Calculating Metrics » de GE ne doit pas polluer stdout (logs Dagster).
    assert "Calculating Metrics" not in buf.getvalue()


def test_pair_uplift_predictions_pass_and_fail():
    good = pd.DataFrame(
        {
            "author_a": ["A1"],
            "author_b": ["A2"],
            "uplift": [1.5],
            "_canonical": [True],
            "served_mode": ["predictive"],
        }
    )
    assert g.validate_df(good, "pred", g.pair_uplift_predictions_expectations())[0]
    bad = good.copy()
    bad["served_mode"] = ["bogus"]  # hors domaine {predictive, descriptive}
    assert not g.validate_df(bad, "pred", g.pair_uplift_predictions_expectations())[0]
    bad2 = good.copy()
    bad2["_canonical"] = [False]  # paire non canonique (a >= b)
    assert not g.validate_df(bad2, "pred", g.pair_uplift_predictions_expectations())[0]


def test_author_recommendations_pass_and_fail():
    good = pd.DataFrame(
        {"author_id": ["A1"], "partner_id": ["A2"], "_not_self": [True], "rank": [1]}
    )
    assert g.validate_df(good, "reco", g.author_recommendations_expectations())[0]
    bad = good.copy()
    bad["_not_self"] = [False]  # auto-recommandation interdite
    assert not g.validate_df(bad, "reco", g.author_recommendations_expectations())[0]
    bad2 = good.copy()
    bad2["rank"] = [0]  # rang doit être >= 1
    assert not g.validate_df(bad2, "reco", g.author_recommendations_expectations())[0]
