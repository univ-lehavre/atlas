#!/usr/bin/env python3
"""Génère des fixtures OpenAlex synthétiques DÉTERMINISTES (ADR 0057).

Fabriquées à la main d'après le schéma réel du snapshot OpenAlex (champs
réellement utilisés par le pipeline : ``id``, ``publication_year``,
``referenced_works``, ``authorships[].author``, ``authorships[].institutions``,
``cited_by_count``, ``fwci`` pour les works ; ``id``, ``orcid``,
``display_name`` pour les authors). Aucune donnée réelle, aucune source live.

Le graphe de citations est **contrôlé** pour servir de golden test (étape 3.3) :
deux chercheurs A (A1) et B (A2) avec un nombre connu de citations croisées
article↔article. Voir GOLDEN.md pour les valeurs attendues.

Sortie : JSONL + CSV en clair (revus en clair) ET leurs ``.gz`` déterministes
(gzip mtime=0) que DuckDB/le pipeline consomment. Idempotent : relancer produit
des octets identiques.

    python fixtures/openalex-sample/generate.py
"""

import gzip
import json
from pathlib import Path

HERE = Path(__file__).parent
OA = "https://openalex.org"

# ── Deux chercheurs et deux institutions (synthétiques) ──────────────────────
A1 = {"id": f"{OA}/A1000000001", "orcid": f"{OA[:5]}orcid.org/0000-0000-0000-0001", "display_name": "Alice Martin"}
A2 = {"id": f"{OA}/A1000000002", "orcid": None, "display_name": "Bob Durand"}
INST_LH = {"id": f"{OA}/I0000001", "display_name": "Universite Le Havre Normandie", "country_code": "FR", "type": "education", "ror": f"{OA[:5]}ror.org/00000001a", "lineage": [f"{OA}/I0000001"]}
INST_LR = {"id": f"{OA}/I0000002", "display_name": "La Rochelle Universite", "country_code": "FR", "type": "education", "ror": f"{OA[:5]}ror.org/00000002b", "lineage": [f"{OA}/I0000002"]}


def _authorship(author, inst, position):
    """Reproduit la forme réelle d'un authorship OpenAlex (champs utiles)."""
    return {
        "author_position": position,
        "author": author,
        "institutions": [inst],
        "countries": [inst["country_code"]],
        "is_corresponding": position == "first",
        "raw_author_name": author["display_name"],
        "raw_affiliation_strings": [inst["display_name"]],
    }


def _work(num, year, authorship, referenced, cited_by, fwci):
    wid = f"{OA}/W{num}"
    return {
        "id": wid,
        "doi": f"https://doi.org/10.0000/w{num}",
        "display_name": f"Synthetic work {num}",
        "title": f"Synthetic work {num}",
        "publication_year": year,
        "type": "article",
        "authorships": authorship,
        "referenced_works": [f"{OA}/W{r}" for r in referenced],
        "referenced_works_count": len(referenced),
        "cited_by_count": cited_by,
        "fwci": fwci,
        "is_retracted": False,
        "is_paratext": False,
    }


# ── Graphe de citations croisées CONTRÔLÉ (golden) ───────────────────────────
# Works d'Alice : W101, W102 ; works de Bob : W201, W202.
# Arêtes de référence (citer = referenced_works) :
#   W101 (A) → W201 (B)   : A cite B  (1)
#   W102 (A) → W201 (B)   : A cite B  (2)
#   W202 (B) → W101 (A)   : B cite A  (1)
# → citations croisées A↔B = 3 arêtes (2 A→B + 1 B→A).
WORKS = [
    _work(101, 2018, [_authorship(A1, INST_LH, "first")], referenced=[201], cited_by=1, fwci=0.5),
    _work(102, 2019, [_authorship(A1, INST_LH, "first")], referenced=[201], cited_by=0, fwci=0.0),
    _work(201, 2017, [_authorship(A2, INST_LR, "first")], referenced=[], cited_by=2, fwci=1.2),
    _work(202, 2020, [_authorship(A2, INST_LR, "first")], referenced=[101], cited_by=0, fwci=0.0),
]

AUTHORS = [
    {"id": A1["id"], "orcid": A1["orcid"], "display_name": A1["display_name"], "works_count": 2,
     "cited_by_count": 1, "last_known_institutions": [INST_LH]},
    {"id": A2["id"], "orcid": A2["orcid"], "display_name": A2["display_name"], "works_count": 2,
     "cited_by_count": 2, "last_known_institutions": [INST_LR]},
]

# merged_ids : W900 a été fusionné dans W101 (forme réelle merge_date,id,merge_into_id).
MERGED_WORKS = [("2022-07-15", "W900000900", "W101")]


def _write_jsonl(path: Path, records: list[dict]) -> None:
    """Écrit un JSONL (clair) + son .gz déterministe (mtime=0)."""
    text = "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in records)
    path.write_text(text, encoding="utf-8")
    with gzip.GzipFile(str(path) + ".gz", "wb", mtime=0) as gz:
        gz.write(text.encode("utf-8"))


def _write_csv(path: Path, header: str, rows: list[tuple]) -> None:
    text = header + "\n" + "".join(",".join(r) + "\n" for r in rows)
    path.write_text(text, encoding="utf-8")
    with gzip.GzipFile(str(path) + ".gz", "wb", mtime=0) as gz:
        gz.write(text.encode("utf-8"))


def main() -> None:
    works_dir = HERE / "data" / "works" / "updated_date=2020-01-01"
    authors_dir = HERE / "data" / "authors" / "updated_date=2020-01-01"
    merged_dir = HERE / "legacy-data" / "merged_ids" / "works"
    for d in (works_dir, authors_dir, merged_dir):
        d.mkdir(parents=True, exist_ok=True)

    _write_jsonl(works_dir / "part_000", WORKS)
    _write_jsonl(authors_dir / "part_000", AUTHORS)
    _write_csv(merged_dir / "2022-07-15", "merge_date,id,merge_into_id", MERGED_WORKS)
    print(f"Fixtures générées : {len(WORKS)} works, {len(AUTHORS)} authors, {len(MERGED_WORKS)} merged_ids.")


if __name__ == "__main__":
    main()
