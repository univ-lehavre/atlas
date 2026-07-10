#!/usr/bin/env python3
"""Génère la fixture DÉTERMINISTE du MART EUNICoast (Parquet), pour les tests
hermétiques du pipeline citation (ADR 0057, ADR 0105).

La fixture n'est PLUS le brut JSONL.gz : c'est directement le **mart EUNICoast**
produit en amont par l'asset ``mart_eunicoast`` (ADR 0105). Le mart est déjà FILTRÉ
(works ayant ≥1 auteur affilié EUNICoast ET publiés depuis 2016) et projeté en
colonnes strictes : ``work_id, publication_year, title, authorships, topics,
keywords, fwci, cited_by_count``. ``authorships``/``topics``/``keywords`` sont des
arrays de structs imbriqués au schéma OpenAlex réel (cf. ``batch_eunicoast._MART_COLUMNS``).

La chaîne dbt lit ce Parquet colonnaire comme sa source (``citation_raw.works`` →
``read_parquet(mart_root/run=*/*.parquet)``). Le graphe est **contrôlé** pour servir
de golden test de CO-AUTORAT (``marts_collab_pairs``) : voir GOLDEN.md.

Sortie : un unique fichier Parquet **déterministe** (lignes triées, aucun timestamp,
compression figée) sous ``data/mart_eunicoast/run=fixture/part_000.parquet``. Le fichier
est COMMITÉ (fixture figée). Idempotent : relancer produit un contenu identique.

    python fixtures/openalex-sample/generate.py
"""

from pathlib import Path

import duckdb

HERE = Path(__file__).parent
OA = "https://openalex.org"

# ── Trois chercheurs, tous affiliés EUNICoast Le Havre ───────────────────────
# Le mart EST le périmètre déjà filtré : TOUS les auteurs portent le VRAI ROR
# EUNICoast Le Havre (05v509s40) et TOUS les works sont ≥ 2016. Le filtre ROR/année
# vit désormais dans l'asset mart_eunicoast (ADR 0105), plus dans dbt.
A1 = {
    "id": f"{OA}/A1000000001",
    "orcid": "https://orcid.org/0000-0000-0000-0001",
    "display_name": "Alice Martin",
}
A2 = {"id": f"{OA}/A1000000002", "orcid": None, "display_name": "Bob Durand"}
A3 = {
    "id": f"{OA}/A1000000003",
    "orcid": "https://orcid.org/0000-0000-0000-0003",
    "display_name": "Carol Petit",
}
INST_LH = {
    "id": f"{OA}/I0000001",
    "display_name": "Universite Le Havre Normandie",
    "country_code": "FR",
    "type": "education",
    "ror": "https://ror.org/05v509s40",
    "lineage": [f"{OA}/I0000001"],
}

# ── Référentiel de labels synthétiques (hiérarchie subfield/field/domain) ─────
_PHYS = (
    ("3106", "Nuclear and High Energy Physics"),
    ("31", "Physics and Astronomy"),
    ("3", "Physical Sciences"),
)
_MAT = (
    ("2505", "Materials Chemistry"),
    ("25", "Materials Science"),
    ("3", "Physical Sciences"),
)
_BIO = (
    ("1312", "Molecular Biology"),
    ("13", "Biochemistry, Genetics and Molecular Biology"),
    ("1", "Life Sciences"),
)


def _sql_str(value) -> str:
    """Littéral SQL VARCHAR (ou NULL) — échappe les apostrophes."""
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def _author_sql(author: dict) -> str:
    """Struct SQL ``author`` (id/display_name/orcid), schéma OpenAlex réel."""
    return "{{'id': {id}, 'display_name': {dn}, 'orcid': {orcid}}}".format(
        id=_sql_str(author["id"]),
        dn=_sql_str(author["display_name"]),
        orcid=_sql_str(author["orcid"]),
    )


def _institution_sql(inst: dict) -> str:
    """Struct SQL d'une institution (id/ror/display_name/country_code/type/lineage)."""
    lineage = "[" + ", ".join(_sql_str(x) for x in inst["lineage"]) + "]"
    return (
        "{{'id': {id}, 'ror': {ror}, 'display_name': {dn}, "
        "'country_code': {cc}, 'type': {ty}, 'lineage': {lin}}}"
    ).format(
        id=_sql_str(inst["id"]),
        ror=_sql_str(inst["ror"]),
        dn=_sql_str(inst["display_name"]),
        cc=_sql_str(inst["country_code"]),
        ty=_sql_str(inst["type"]),
        lin=lineage,
    )


def _authorship_sql(author: dict, position: str) -> str:
    """Struct SQL d'un authorship (author + author_position + is_corresponding +
    institutions[]) — tous les auteurs sont affiliés Le Havre (EUNICoast)."""
    return (
        "{{'author': {author}, 'author_position': {pos}, "
        "'is_corresponding': {corr}, 'institutions': [{insts}]}}"
    ).format(
        author=_author_sql(author),
        pos=_sql_str(position),
        corr="true" if position == "first" else "false",
        insts=_institution_sql(INST_LH),
    )


def _topic_sql(num: str, label: str, score: float, subfield, field, domain) -> str:
    """Struct SQL d'un topic (id/display_name/score + hiérarchie), schéma OpenAlex."""
    return (
        "{{'id': {id}, 'display_name': {dn}, 'score': {score}::DOUBLE, "
        "'subfield': {{'id': {sfid}, 'display_name': {sfdn}}}, "
        "'field': {{'id': {fid}, 'display_name': {fdn}}}, "
        "'domain': {{'id': {did}, 'display_name': {ddn}}}}}"
    ).format(
        id=_sql_str(f"{OA}/T{num}"),
        dn=_sql_str(label),
        score=score,
        sfid=_sql_str(f"{OA}/subfields/{subfield[0]}"),
        sfdn=_sql_str(subfield[1]),
        fid=_sql_str(f"{OA}/fields/{field[0]}"),
        fdn=_sql_str(field[1]),
        did=_sql_str(f"{OA}/domains/{domain[0]}"),
        ddn=_sql_str(domain[1]),
    )


def _keyword_sql(slug: str, label: str, score: float) -> str:
    """Struct SQL d'un keyword (id URL .../keywords/<slug>, display_name, score)."""
    return "{{'id': {id}, 'display_name': {dn}, 'score': {score}::DOUBLE}}".format(
        id=_sql_str(f"{OA}/keywords/{slug}"),
        dn=_sql_str(label),
        score=score,
    )


def _work_sql(
    num: int,
    year: int,
    authorships: list[str],
    fwci: float,
    cited_by: int,
    topics: list[str],
    keywords: list[str],
) -> str:
    """Ligne SELECT d'un work du mart (schéma _MART_COLUMNS de batch_eunicoast).

    ``updated_date`` (clé de dédup par récence, ADR 0099) est portée mais SANS doublon de
    ``work_id`` dans la fixture : le mart simule la SORTIE de ``mart_eunicoast``, déjà
    dédupliquée. On la fixe au 1ᵉʳ janvier de l'année suivant la publication (valeur plausible
    et déterministe ; la dédup elle-même est prouvée par les tests unitaires ``test_dedup_*``).
    """
    return (
        "SELECT {work_id} AS work_id, {year} AS publication_year, {title} AS title, "
        "[{ashs}] AS authorships, [{topics}] AS topics, [{keywords}] AS keywords, "
        "{fwci}::DOUBLE AS fwci, {cited}::BIGINT AS cited_by_count, "
        "DATE {updated} AS updated_date"
    ).format(
        work_id=_sql_str(f"{OA}/W{num}"),
        year=year,
        title=_sql_str(f"Synthetic work {num}"),
        ashs=", ".join(authorships),
        topics=", ".join(topics),
        keywords=", ".join(keywords),
        fwci=fwci,
        cited=cited_by,
        updated=_sql_str(f"{year + 1}-01-01"),
    )


# ── Graphe de CO-AUTORAT + UPLIFT contrôlé (golden) ──────────────────────────
# Paires de CO-AUTORAT attendues (author_a < author_b, co_publications = count(distinct
# work_id)) — INCHANGÉES par l'ajout des solo antérieures W6..W10 :
#   (Alice, Bob)   : W1, W2, W4        → 3
#   (Alice, Carol) : W3, W4            → 2
#   (Bob, Carol)   : W4                → 1
#
# Labels par work : conçus pour exercer le DISTINCT (T20001 partagé W1/W2), l'agrégat
# pondéré (freq×score au mart researchers), les seuils différenciés (topic ≥ 0,5,
# keyword ≥ 0,2 : shield 0,21 passe, reagent 0,11 est coupé). Les auteurs héritent
# des labels de LEURS works co-signés (le produit auteurs×labels est voulu, lot 2).
#
# UPLIFT (lot 3, ADR 0067) : W6..W10 sont des publications SOLO ANTÉRIEURES aux
# co-publications, qui donnent une baseline solo dérivable des DEUX côtés → le mart
# `curated_pair_uplift_labels` n'est PLUS vide. Anti-fuite temporelle : chaque solo est
# strictement AVANT les co-pubs qu'elle référence (2016/2017 < 2018..2021).
#   Alice solo : W6 (2016, fwci 0,5), W7 (2017, fwci 0,6)
#   Bob   solo : W8 (2016, fwci 0,4), W9 (2017, fwci 0,5)
#   Carol solo : W10 (2017, fwci 0,7)
# Labels d'uplift OBTENUS (confirmés par dbt build réel, cf. GOLDEN.md) :
#   (Alice, Bob)   : uplift = 199/360 ≈ 0,552778, n_copubs = 3 (W1, W2, W4)
#   (Alice, Carol) : uplift = 9/20   = 0,450000, n_copubs = 2 (W3, W4)
#   (Bob, Carol)   : 1 seule co-pub (W4) → écartée (having ≥ 2).
WORKS = [
    # W1 (2018) : Alice + Bob. Topics physique/matériaux, keyword plasma/shield.
    _work_sql(
        1,
        2018,
        [_authorship_sql(A1, "first"), _authorship_sql(A2, "middle")],
        fwci=0.5,
        cited_by=3,
        topics=[
            _topic_sql(
                "20001",
                "Magnetic confinement fusion research",
                0.9991,
                _PHYS[0],
                _PHYS[1],
                _PHYS[2],
            ),
            _topic_sql(
                "20002",
                "Fusion materials and technologies",
                0.9982,
                _MAT[0],
                _MAT[1],
                _MAT[2],
            ),
        ],
        keywords=[
            _keyword_sql("plasma", "Plasma", 0.5598),
            _keyword_sql("shield", "Shield", 0.2103),
        ],
    ),
    # W2 (2019) : Alice + Bob. T20001 PARTAGÉ avec W1 (DISTINCT + agrégat ×2).
    _work_sql(
        2,
        2019,
        [_authorship_sql(A1, "first"), _authorship_sql(A2, "middle")],
        fwci=1.2,
        cited_by=2,
        topics=[
            _topic_sql(
                "20001",
                "Magnetic confinement fusion research",
                0.9876,
                _PHYS[0],
                _PHYS[1],
                _PHYS[2],
            ),
        ],
        keywords=[
            _keyword_sql("plasma", "Plasma", 0.4471),
        ],
    ),
    # W3 (2020) : Alice + Carol. Topic biologie, keyword chemistry/reagent (0,11 coupé lot 2).
    _work_sql(
        3,
        2020,
        [_authorship_sql(A1, "first"), _authorship_sql(A3, "middle")],
        fwci=0.8,
        cited_by=1,
        topics=[
            _topic_sql(
                "20003",
                "Glycosylation and Glycoproteins Research",
                0.9678,
                _BIO[0],
                _BIO[1],
                _BIO[2],
            ),
        ],
        keywords=[
            _keyword_sql("chemistry", "Chemistry", 0.8414),
            _keyword_sql("reagent", "Reagent", 0.1138),
        ],
    ),
    # W4 (2021) : TRIO Alice + Bob + Carol → 3 paires en une publication.
    _work_sql(
        4,
        2021,
        [
            _authorship_sql(A1, "first"),
            _authorship_sql(A2, "middle"),
            _authorship_sql(A3, "middle"),
        ],
        fwci=1.5,
        cited_by=4,
        topics=[
            _topic_sql(
                "20005",
                "Tokamak plasma diagnostics",
                0.9500,
                _PHYS[0],
                _PHYS[1],
                _PHYS[2],
            ),
        ],
        keywords=[
            _keyword_sql("fusion", "Fusion", 0.8000),
        ],
    ),
    # W5 (2022) : Alice SEULE (POSTÉRIEURE) → aucune paire, enrichit son profil (topic +
    # keyword propres). Postérieure aux co-pubs : n'entre JAMAIS dans une baseline solo.
    _work_sql(
        5,
        2022,
        [_authorship_sql(A1, "first")],
        fwci=0.3,
        cited_by=0,
        topics=[
            _topic_sql(
                "20004",
                "Muscle metabolism and nutrition",
                0.9510,
                _BIO[0],
                _BIO[1],
                _BIO[2],
            ),
        ],
        keywords=[
            _keyword_sql("chemistry", "Chemistry", 0.6627),
        ],
    ),
    # ── Publications SOLO ANTÉRIEURES (baseline d'uplift, lot 3, ADR 0067) ────────
    # W6..W10 sont strictement AVANT les co-pubs (2016/2017) → baseline solo dérivable
    # sans fuite temporelle. Chacune porte un topic + un keyword cohérents avec le
    # profil de son auteur (réutilise les hiérarchies _PHYS/_MAT/_BIO).
    #
    # W6 (2016) : Alice solo, fwci 0,5. Topic fusion (T20001, PHYS), keyword plasma.
    _work_sql(
        6,
        2016,
        [_authorship_sql(A1, "first")],
        fwci=0.5,
        cited_by=1,
        topics=[
            _topic_sql(
                "20001",
                "Magnetic confinement fusion research",
                0.9100,
                _PHYS[0],
                _PHYS[1],
                _PHYS[2],
            ),
        ],
        keywords=[
            _keyword_sql("plasma", "Plasma", 0.6000),
        ],
    ),
    # W7 (2017) : Alice solo, fwci 0,6. Topic matériaux (T20002, MAT), keyword shield.
    _work_sql(
        7,
        2017,
        [_authorship_sql(A1, "first")],
        fwci=0.6,
        cited_by=2,
        topics=[
            _topic_sql(
                "20002",
                "Fusion materials and technologies",
                0.9200,
                _MAT[0],
                _MAT[1],
                _MAT[2],
            ),
        ],
        keywords=[
            _keyword_sql("shield", "Shield", 0.3000),
        ],
    ),
    # W8 (2016) : Bob solo, fwci 0,4. Topic fusion (T20001, PHYS), keyword plasma.
    _work_sql(
        8,
        2016,
        [_authorship_sql(A2, "first")],
        fwci=0.4,
        cited_by=0,
        topics=[
            _topic_sql(
                "20001",
                "Magnetic confinement fusion research",
                0.8800,
                _PHYS[0],
                _PHYS[1],
                _PHYS[2],
            ),
        ],
        keywords=[
            _keyword_sql("plasma", "Plasma", 0.5500),
        ],
    ),
    # W9 (2017) : Bob solo, fwci 0,5. Topic tokamak (T20005, PHYS), keyword fusion.
    _work_sql(
        9,
        2017,
        [_authorship_sql(A2, "first")],
        fwci=0.5,
        cited_by=1,
        topics=[
            _topic_sql(
                "20005",
                "Tokamak plasma diagnostics",
                0.9100,
                _PHYS[0],
                _PHYS[1],
                _PHYS[2],
            ),
        ],
        keywords=[
            _keyword_sql("fusion", "Fusion", 0.7000),
        ],
    ),
    # W10 (2017) : Carol solo, fwci 0,7. Topic biologie (T20003, BIO), keyword chemistry.
    _work_sql(
        10,
        2017,
        [_authorship_sql(A3, "first")],
        fwci=0.7,
        cited_by=3,
        topics=[
            _topic_sql(
                "20003",
                "Glycosylation and Glycoproteins Research",
                0.9300,
                _BIO[0],
                _BIO[1],
                _BIO[2],
            ),
        ],
        keywords=[
            _keyword_sql("chemistry", "Chemistry", 0.8000),
        ],
    ),
]


def main() -> None:
    out_dir = HERE / "data" / "mart_eunicoast" / "run=fixture"
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / "part_000.parquet"

    con = duckdb.connect()
    # Union des works, TRIÉ par work_id (déterminisme : même ordre de lignes). La
    # compression Parquet est figée (zstd, level fixe) pour un contenu reproductible ;
    # DuckDB n'écrit aucun timestamp d'auteur dans les métadonnées Parquet.
    union = " UNION ALL ".join(f"SELECT * FROM ({w})" for w in WORKS)
    con.execute(
        f"COPY (SELECT * FROM ({union}) ORDER BY work_id) TO '{dest}' "
        "(FORMAT PARQUET, COMPRESSION zstd)"
    )
    n = con.sql(f"SELECT count(*) FROM read_parquet('{dest}')").fetchone()[0]
    print(f"Fixture mart EUNICoast générée : {n} works → {dest}")


if __name__ == "__main__":
    main()
