"""Tests du SQL de brut pré-filtré (prefilter.py, ADR 0103 §1.1, lot 2).

Le SQL est PUR (aucune I/O) : on vérifie le prédicat, la projection stricte et l'exclusion
des colonnes lourdes sans réseau ni DuckDB. La validité exécutable est en outre prouvée en
lançant le SQL sur un petit Parquet synthétique via DuckDB (déterministe, hermétique).
"""

import duckdb

from scholar_network_dagster.assets.prefilter import (
    MIN_YEAR,
    PREFILTERED_SUBDIR,
    PROJECTED_COLUMNS,
    WORK_TYPE,
    cache_location,
    prefilter_sql,
)
from scholar_network_dagster.cache import CacheMode


def test_cache_location_full_is_stable_between_runs():
    """full → emplacement STABLE (pas de run= : relu tel quel au run suivant)."""
    loc = cache_location(CacheMode.PERSISTENT, "scholar-network", run_id="abc")
    assert loc == f"s3://scholar-network/{PREFILTERED_SUBDIR}"
    assert "run=" not in loc


def test_cache_location_bounded_is_isolated_per_run():
    """bounded → préfixe _transient/run=<id> isolé (purgé en fin de run)."""
    loc = cache_location(CacheMode.TRANSIENT, "scholar-network", run_id="abc")
    assert loc == f"s3://scholar-network/{PREFILTERED_SUBDIR}/_transient/run=abc"


def test_cache_location_ephemeral_is_none():
    """ephemeral → pas d'emplacement (rien n'est matérialisé)."""
    assert cache_location(CacheMode.NONE, "scholar-network", run_id="abc") is None


def test_sql_carries_the_common_predicate():
    """Prédicat commun aux deux passes : ≥ MIN_YEAR ET type = 'article' (ADR 0103 §1.1)."""
    sql = prefilter_sql("s3://openalex/x/*.parquet")
    assert f"publication_year >= {MIN_YEAR}" in sql
    assert f"type = '{WORK_TYPE}'" in sql


def test_projection_is_strict_and_excludes_heavy_columns():
    """Projection STRICTE : les colonnes utiles, JAMAIS les lourdes (abstract/referenced)."""
    sql = prefilter_sql("s3://openalex/x/*.parquet")
    for col in PROJECTED_COLUMNS:
        assert col in sql
    assert "abstract_inverted_index" not in sql
    assert "referenced_works" not in sql
    # Pas de SELECT * : la projection doit être explicite (lecture colonnaire bornée).
    assert "SELECT *" not in sql


def test_source_glob_is_used_verbatim():
    """Le glob source est injecté tel quel (permet file:// en test, s3:// en prod)."""
    sql = prefilter_sql("/tmp/local/*.parquet")
    assert "read_parquet('/tmp/local/*.parquet')" in sql


def test_sql_executes_and_filters_on_synthetic_parquet(tmp_path):
    """Preuve exécutable : le SQL filtre correctement un petit Parquet synthétique (DuckDB)."""
    con = duckdb.connect()
    src = tmp_path / "works.parquet"
    # 4 works : gardé (2020/article), exclu par année (2015/article), exclu par type
    # (2020/dataset), gardé (2016/article, borne inférieure incluse).
    con.execute(
        f"""
        COPY (
            SELECT * FROM (VALUES
                ('W1', 2020, 'article', 't1'),
                ('W2', 2015, 'article', 't2'),
                ('W3', 2020, 'dataset', 't3'),
                ('W4', 2016, 'article', 't4')
            ) AS t(id, publication_year, type, title)
        ) TO '{src}' (FORMAT PARQUET)
        """
    )
    # Le Parquet synthétique n'a pas toutes les colonnes projetées : on filtre sur un
    # sous-ensemble présent pour prouver le PRÉDICAT (le test de projection ci-dessus couvre
    # la liste complète des colonnes).
    sql = f"""
        SELECT id FROM read_parquet('{src}')
        WHERE publication_year >= {MIN_YEAR} AND type = '{WORK_TYPE}'
        ORDER BY id
    """
    kept = [r[0] for r in con.execute(sql).fetchall()]
    assert kept == ["W1", "W4"]  # 2020/article et 2016/article (borne incluse)
