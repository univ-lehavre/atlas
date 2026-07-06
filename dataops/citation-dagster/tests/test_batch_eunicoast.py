"""Tests de l'asset de filtrage EUNICoast par lots (``mart_eunicoast``, ADR 0105).

- ``plan_batches`` : logique PURE de composition des lots (cumul ``num_rows``).
- ``_filter_sql`` : filtre EUNICoast + année sur un mini-graphe Parquet (DuckDB in-memory,
  aucun S3) — valide le double-unnest ``authorships → institutions → ror`` et la projection.
- anti-drift : la constante ``_EUNICOAST_ROR`` == le seed dbt ``ref_eunicoast.csv``.
"""

import duckdb

from citation_dagster.assets import batch_eunicoast as be

# ── plan_batches (pur) ───────────────────────────────────────────────────────


def test_plan_batches_cumule_num_rows():
    """Les lots accumulent les fichiers jusqu'au seuil de works (cumul num_rows)."""
    manifest = [("a", 3), ("b", 3), ("c", 3), ("d", 1)]
    batches = be.plan_batches(manifest, works_per_batch=6)
    # a+b = 6 (seuil atteint) → lot ; c+d = 4 → lot. Ordre préservé.
    assert batches == [["a", "b"], ["c", "d"]]


def test_plan_batches_fichier_geant_seul():
    """Un fichier dépassant à lui seul le seuil forme son propre lot (jamais scindé)."""
    manifest = [("small", 1), ("giant", 100), ("tail", 1)]
    batches = be.plan_batches(manifest, works_per_batch=10)
    # small (1) < 10 ; +giant (101) > 10 → clôt [small], puis giant seul dépasse → [giant] ;
    # tail rejoint un nouveau lot.
    assert batches == [["small"], ["giant"], ["tail"]]


def test_plan_batches_vide():
    """Manifest vide → aucun lot."""
    assert be.plan_batches([], works_per_batch=5) == []


# ── _filter_sql (DuckDB in-memory, mini-graphe) ──────────────────────────────


def _write_works(con, path, works):
    """Écrit un Parquet works minimal (schéma OpenAlex réduit) depuis des dicts inline."""
    con.execute("CREATE OR REPLACE TABLE w AS SELECT * FROM (SELECT NULL) WHERE false")
    con.register("works_df", _works_relation(con, works))
    con.execute(f"COPY (SELECT * FROM works_df) TO '{path}' (FORMAT PARQUET)")


def _works_relation(con, works):
    """Construit une relation DuckDB typée comme les works OpenAlex (colonnes utiles).

    On fabrique les structs via des littéraux SQL : chaque work porte id, année, title,
    authorships[].institutions[].ror, plus des colonnes lourdes (referenced_works,
    abstract_inverted_index) pour prouver qu'elles NE sont PAS projetées.
    """
    rows = []
    for w in works:
        insts = ", ".join(f"{{'ror': '{r}'}}" for r in w["rors"])
        ash = f"[{{'institutions': [{insts}]}}]" if w["rors"] else "[]"
        rows.append(
            f"SELECT '{w['id']}' AS id, {w['year']} AS publication_year, "
            f"'{w['title']}' AS title, {ash} AS authorships, "
            f"[] AS topics, [] AS keywords, "
            f"{w.get('fwci', 'NULL')} AS fwci, {w.get('cited', 0)} AS cited_by_count, "
            f"['ref1'] AS referenced_works, "
            f"{{'The': [0]}} AS abstract_inverted_index"
        )
    return con.sql(" UNION ALL ".join(rows))


_EUNI = "https://ror.org/05v509s40"  # Le Havre (dans le seed)
_OTHER = "https://ror.org/00rcxh774"  # hors EUNICoast


def test_eunicoast_filter_garde_les_bons_works(tmp_path):
    """Filtre : garde un work SSI ≥1 ROR EUNICoast ET année ≥ min_year."""
    con = duckdb.connect()
    path = str(tmp_path / "part.parquet")
    works = [
        {"id": "W_keep", "year": 2018, "title": "Keep", "rors": [_EUNI]},  # EUNICoast, ≥2016
        {"id": "W_old", "year": 2010, "title": "Old", "rors": [_EUNI]},  # EUNICoast MAIS <2016
        {"id": "W_other", "year": 2020, "title": "Other", "rors": [_OTHER]},  # ≥2016 mais hors
        {"id": "W_mix", "year": 2019, "title": "Mix", "rors": [_OTHER, _EUNI]},  # ≥1 EUNICoast
        {"id": "W_none", "year": 2021, "title": "None", "rors": []},  # aucune affiliation
    ]
    _write_works(con, path, works)
    sql = be._filter_sql([path], be._EUNICOAST_ROR, be._MIN_YEAR)
    kept = {r[0] for r in con.sql(sql).fetchall()}
    assert kept == {"W_keep", "W_mix"}


def test_filter_projette_work_id_et_exclut_colonnes_lourdes(tmp_path):
    """La projection renomme id→work_id et n'expose PAS referenced_works/abstract."""
    con = duckdb.connect()
    path = str(tmp_path / "part.parquet")
    _write_works(con, path, [{"id": "W1", "year": 2018, "title": "T", "rors": [_EUNI]}])
    sql = be._filter_sql([path], be._EUNICOAST_ROR, be._MIN_YEAR)
    cols = {d[0] for d in con.sql(sql).description}
    assert "work_id" in cols and "id" not in cols
    assert "title" in cols and "keywords" in cols and "topics" in cols
    # Colonnes lourdes JAMAIS projetées (hors périmètre, ADR 0105).
    assert "referenced_works" not in cols
    assert "abstract_inverted_index" not in cols


# ── anti-drift seed ↔ constante ──────────────────────────────────────────────


def test_ror_list_matches_seed():
    """La constante ``_EUNICOAST_ROR`` doit être identique au seed dbt (source de vérité)."""
    assert set(be._EUNICOAST_ROR) == be._seed_ror(), (
        "les 14 ROR de _EUNICOAST_ROR ont divergé de citation-dbt/seeds/ref_eunicoast.csv"
    )
