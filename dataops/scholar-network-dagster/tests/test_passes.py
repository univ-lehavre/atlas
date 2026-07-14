"""Tests des passes 1 et 2 (passes.py, ADR 0103 §1.2/§1.3, lots 3-4).

SQL pur + anti-drift ROR ici ; la sémantique fine (grain auteur, hors-affiliation) est
prouvée sur MinIO dans ``test_passes_integration.py`` (structures ``authorships`` imbriquées).
"""

from scholar_network_dagster.assets.passes import (
    researchers_glob,
    researchers_sql,
    scholar_works_sql,
)
from scholar_network_dagster.ref_eunicoast import EUNICOAST_ROR, seed_ror


def test_ror_list_matches_seed():
    """Anti-drift (ADR 0057) : les 14 ROR de EUNICOAST_ROR == le seed dbt (source de vérité)."""
    assert set(EUNICOAST_ROR) == seed_ror(), (
        "EUNICOAST_ROR a divergé de citation-dbt/seeds/ref_eunicoast.csv"
    )


def test_researchers_sql_is_author_grained_and_deterministic():
    """Passe 1 : grain AUTEUR (UNNEST authorships), DISTINCT + ORDER BY (déterminisme)."""
    sql = researchers_sql("SELECT 1")
    assert "UNNEST" in sql
    assert "a.author.id" in sql
    assert "DISTINCT" in sql
    assert "ORDER BY author_id" in sql
    # Le ROR est testé au grain AUTEUR (ses institutions), pas au grain work.
    assert "list_transform(a.institutions, i -> i.ror)" in sql


def test_researchers_sql_uses_the_full_referential():
    """Les 14 ROR du référentiel sont injectés dans le filtre de la passe 1."""
    sql = researchers_sql("SELECT 1")
    for ror in EUNICOAST_ROR:
        assert ror in sql


def test_researchers_sql_composes_arbitrary_from():
    """La source est une expression FROM composable (cache OU sous-requête source)."""
    sql = researchers_sql("SELECT * FROM read_parquet('s3://b/prefiltered/*.parquet')")
    assert "FROM (SELECT * FROM read_parquet('s3://b/prefiltered/*.parquet')) AS w" in sql


def test_scholar_works_sql_semi_join_and_dedup():
    """Passe 2 : semi-jointure (JOIN researchers) + dédup par récence (row_number desc)."""
    sql = scholar_works_sql("SELECT 1", "SELECT 2")
    # Semi-jointure par hachage (INNER JOIN + DISTINCT, pas de SEMI JOIN corrélé).
    assert "JOIN researchers" in sql
    assert "DISTINCT wa.work_id" in sql
    # Dédup par récence (ADR 0099) : row_number ordonné par updated_date desc.
    assert "row_number() OVER" in sql
    assert "updated_date DESC" in sql
    assert "WHERE _rn = 1" in sql


def test_researchers_glob_is_stable_prefix():
    """La table des chercheurs a un préfixe STABLE (relu par la passe 2 du même run)."""
    assert (
        researchers_glob("scholar-network") == "s3://scholar-network/passes/researchers/*.parquet"
    )
