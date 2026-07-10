"""Tests de l'asset de filtrage EUNICoast par lots (``mart_eunicoast``, ADR 0105).

- ``plan_batches`` : logique PURE de composition des lots (cumul ``num_rows``).
- ``_filter_sql`` : filtre EUNICoast + année sur un mini-graphe Parquet (DuckDB in-memory,
  aucun S3) — valide le double-unnest ``authorships → institutions → ror`` et la projection.
- ``mart_eunicoast`` : l'asset de bout en bout, avec ``lakehouse.connect``/``ceph_target``
  monkeypatchés (loader factice, aucun S3 ni Docker) → couvre l'orchestration hermétiquement.
- anti-drift : la constante ``_EUNICOAST_ROR`` == le seed dbt ``ref_eunicoast.csv``.
"""

import duckdb

from citation_dagster.assets import batch_eunicoast as be
from citation_dagster.resources import CephTarget

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
        upd = w.get("updated", "2020-01-01")
        rows.append(
            f"SELECT '{w['id']}' AS id, {w['year']} AS publication_year, "
            f"'{w['title']}' AS title, {ash} AS authorships, "
            f"[] AS topics, [] AS keywords, "
            f"{w.get('fwci', 'NULL')} AS fwci, {w.get('cited', 0)} AS cited_by_count, "
            f"DATE '{upd}' AS updated_date, "
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
    # updated_date projetée : clé de déduplication par récence (ADR 0099).
    assert "updated_date" in cols
    # Colonnes lourdes JAMAIS projetées (hors périmètre, ADR 0105).
    assert "referenced_works" not in cols
    assert "abstract_inverted_index" not in cols


# ── _dedup_sql (dédup globale par récence, ADR 0099) ─────────────────────────


def _write_filtered(con, path, rows):
    """Écrit un fragment filtré minimal (work_id, updated_date, fwci, cited_by_count)."""
    sql = " UNION ALL ".join(
        f"SELECT '{r['work_id']}' AS work_id, DATE '{r['updated']}' AS updated_date, "
        f"{r.get('fwci', 'NULL')} AS fwci, {r.get('cited', 0)} AS cited_by_count"
        for r in rows
    )
    con.execute(f"COPY ({sql}) TO '{path}' (FORMAT PARQUET)")


def test_dedup_garde_la_version_la_plus_recente(tmp_path):
    """Un work_id en plusieurs versions → on garde celle d'``updated_date`` maximale."""
    con = duckdb.connect()
    p = str(tmp_path / "part-00000.parquet")
    _write_filtered(
        con,
        p,
        [
            {"work_id": "W1", "updated": "2020-01-01", "fwci": 9.0},  # ancienne, FWCI élevé
            {"work_id": "W1", "updated": "2024-06-01", "fwci": 2.0},  # RÉCENTE, FWCI bas
            {"work_id": "W2", "updated": "2019-03-03", "fwci": 1.0},  # unique
        ],
    )
    rows = con.sql(be._dedup_sql(p)).fetchall()
    got = {r[0]: r[1] for r in rows}  # work_id -> updated_date
    assert set(got) == {"W1", "W2"}  # unicité par work_id
    # W1 : la version 2024 gagne malgré son FWCI plus bas (récence prime sur FWCI, ADR 0099).
    assert str(got["W1"]) == "2024-06-01"


def test_dedup_globale_cross_fragments(tmp_path):
    """La dédup est GLOBALE : deux versions d'un work dans DEUX fragments (lots) distincts."""
    con = duckdb.connect()
    _write_filtered(
        con, str(tmp_path / "part-00000.parquet"), [{"work_id": "W1", "updated": "2021-01-01"}]
    )
    _write_filtered(
        con, str(tmp_path / "part-00001.parquet"), [{"work_id": "W1", "updated": "2023-01-01"}]
    )
    rows = con.sql(be._dedup_sql(str(tmp_path / "*.parquet"))).fetchall()
    assert len(rows) == 1  # un seul W1 malgré deux fragments
    assert str(rows[0][1]) == "2023-01-01"  # le plus récent, tous fragments confondus


# ── anti-drift seed ↔ constante ──────────────────────────────────────────────


def test_ror_list_matches_seed():
    """La constante ``_EUNICOAST_ROR`` doit être identique au seed dbt (source de vérité)."""
    assert set(be._EUNICOAST_ROR) == be._seed_ror(), (
        "les 14 ROR de _EUNICOAST_ROR ont divergé de citation-dbt/seeds/ref_eunicoast.csv"
    )


# ── Lineage + lecture manifest (purs) ────────────────────────────────────────


def test_lineage_io_datasets():
    """L'I/O lineage lit raw/works + manifest, écrit le mart (noms techniques, pas de PII)."""
    inputs, outputs = be._lineage_io()
    in_names = {d.name for d in inputs}
    out_names = {d.name for d in outputs}
    assert in_names == {"raw/works", "raw/manifest_works"}
    assert out_names == {"mart_eunicoast"}


class _FakeRel:
    """Relation DuckDB factice : sert `.fetchall()` (manifest) et `.fetchone()` (count)."""

    def __init__(self, rows):
        self._rows = rows

    def fetchall(self):
        return self._rows

    def fetchone(self):
        return self._rows[0]


class _FakeCon:
    """Connexion DuckDB factice pour l'asset : route manifest / COPY / count sans S3.

    - `read_parquet('.../manifest_works.parquet')` → le manifest injecté ;
    - `COPY (...)` → no-op (pas d'écriture réelle), mémorisé dans `copies` ;
    - `count(*)` sur un fragment `_parts/` (passe 1) → `count_per_batch` (works du lot) ;
    - `count(*)` sur le mart final (passe 2) → `dedup_count` (works après dédup globale).
    """

    def __init__(self, manifest_rows, count_per_batch, dedup_count):
        self._manifest = manifest_rows
        self._count = count_per_batch
        self._dedup = dedup_count
        self.copies = []

    def sql(self, query):
        if "manifest_works" in query:
            return _FakeRel(self._manifest)
        # Le count de la passe 2 vise le mart final (hors `_parts/`) ; les autres, un lot.
        if "_parts" not in query:
            return _FakeRel([(self._dedup,)])
        return _FakeRel([(self._count,)])

    def execute(self, query):
        # COPY (...) TO '...' : on mémorise, sans écrire.
        self.copies.append(query)


def _patch_asset(monkeypatch, manifest_rows, count_per_batch, dedup_count=0):
    """Monkeypatch lakehouse.connect + ceph_target_from_env pour l'asset (aucun S3)."""
    con = _FakeCon(manifest_rows, count_per_batch, dedup_count)
    monkeypatch.setattr(be.lakehouse, "connect", lambda cfg=None: con)
    monkeypatch.setattr(
        be, "ceph_target_from_env", lambda env=None: CephTarget("k", "s", "http://h:1", "citation")
    )
    return con


def test_mart_eunicoast_orchestration(monkeypatch):
    """L'asset filtre par lots sous _parts/, puis déduplique globalement vers le mart final.

    Hermétique : aucun S3, aucun Docker. Manifest de 3 fichiers (5M+3M+1M works) avec
    works_per_batch=5M → 2 lots ([a] car a=5M seul, puis [b,c]). On vérifie : un COPY par lot
    PLUS un COPY de dédup, la sortie finale déduplique (eunicoast_works = dedup_count) et le
    compte de doublons retirés est cohérent."""
    manifest = [("a.parquet", 5_000_000), ("b.parquet", 3_000_000), ("c.parquet", 1_000_000)]
    # count_per_batch=7 works/lot filtré ; dedup_count=10 works après dédup globale.
    con = _patch_asset(monkeypatch, manifest, count_per_batch=7, dedup_count=10)
    res = be.mart_eunicoast()
    batches = be.plan_batches(manifest)
    # Passe 1 : un COPY par lot (destination sous _parts/) ; passe 2 : un COPY de dédup
    # (destination = le mart final, hors _parts/). On discrimine sur la DESTINATION `TO '...'`,
    # pas sur toute la requête (le SQL de dédup référence _parts/ en SOURCE).
    assert len(con.copies) == len(batches) + 1
    dests = [q.split("TO '")[1].split("'")[0] for q in con.copies]
    part_copies = [d for d in dests if "/_parts/" in d]
    dedup_copies = [d for d in dests if "/_parts/" not in d]
    assert len(part_copies) == len(batches)
    assert len(dedup_copies) == 1
    assert all("FORMAT PARQUET" in q for q in con.copies)
    assert res.metadata["batches"].value == len(batches)
    assert res.metadata["source_files"].value == 3
    assert res.metadata["min_year"].value == be._MIN_YEAR
    # eunicoast_works = compte APRÈS dédup (mart final), pas la somme des lots.
    assert res.metadata["eunicoast_works"].value == 10
    # doublons retirés = works filtrés (7 × lots) − works dédupliqués (10).
    assert res.metadata["duplicates_removed"].value == 7 * len(batches) - 10


def test_mart_eunicoast_empty_manifest(monkeypatch):
    """Manifest vide → aucun lot, aucun COPY (ni filtrage ni dédup), 0 work (run idempotent)."""
    con = _patch_asset(monkeypatch, manifest_rows=[], count_per_batch=0)
    res = be.mart_eunicoast()
    assert con.copies == []  # passe 2 court-circuitée : pas de fragments à dédupliquer
    assert res.metadata["batches"].value == 0
    assert res.metadata["eunicoast_works"].value == 0
    assert res.metadata["source_files"].value == 0
