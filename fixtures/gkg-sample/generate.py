#!/usr/bin/env python3
"""Génère un échantillon GKG 2.1 déterministe pour les tests hermétiques (ADR 0057).

Produit ``sample.gkg.csv`` (tab-delimited, 27 colonnes, sans en-tête) et son ZIP
``20260101120000.gkg.csv.zip``, fidèles au format réel mais minimaux et contrôlés.
Le contenu est figé : valeurs attendues consignées dans ``GOLDEN.md``.

Cas couverts (pour éprouver le parsing pur de ``gkg.py`` et la classification PR 3) :
- une organisation anglophone simple (« Harvard University ») ;
- une organisation francophone via un article traduit (« Université du Havre ») ;
- une organisation avec virgule interne dans le nom (l'offset est le dernier champ) ;
- une organisation NON universitaire (« Acme Corporation ») — bruit à écarter en PR 3 ;
- une organisation répétée dans le même document (déduplication) ;
- une ligne SANS organisation (ignorée à la projection).

Exécuter : ``python fixtures/gkg-sample/generate.py``
"""

from __future__ import annotations

import zipfile
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_FIELD_COUNT = 27


def _row(record_id: str, date: str, source: str, url: str, orgs: str, translated: str) -> str:
    """Construit une ligne GKG 2.1 à 27 colonnes (seules les colonnes utiles remplies).

    Indices remplis (ordre V2.1) : 0=GKGRECORDID, 1=DATE, 3=SourceCommonName,
    4=DocumentIdentifier, 14=V2EnhancedOrganizations, 25=TranslationInfo.
    """
    cols = [""] * _FIELD_COUNT
    cols[0] = record_id
    cols[1] = date
    cols[3] = source
    cols[4] = url
    cols[14] = orgs
    cols[25] = translated
    return "\t".join(cols)


_ROWS = [
    # Document 1 : université anglophone + entreprise (bruit) ; Harvard répété.
    _row(
        "20260101120000-1",
        "20260101120000",
        "example.com",
        "http://example.com/a",
        "Harvard University,120;Acme Corporation,300;Harvard University,540",
        "",
    ),
    # Document 2 : université francophone, article TRADUIT (TranslationInfo non vide).
    _row(
        "20260101120000-2",
        "20260101120000",
        "lemonde.fr",
        "http://lemonde.fr/b",
        "Universite du Havre,80",
        "srclc:fra;eng:Moses",
    ),
    # Document 3 : nom d'organisation avec virgule interne (l'offset = dernier champ).
    _row(
        "20260101120000-3",
        "20260101120000",
        "example.org",
        "http://example.org/c",
        "University of California, Berkeley,42",
        "",
    ),
    # Document 4 : AUCUNE organisation → ignoré à la projection.
    _row(
        "20260101120000-4",
        "20260101120000",
        "example.net",
        "http://example.net/d",
        "",
        "",
    ),
]


def main() -> None:
    csv_text = "\n".join(_ROWS) + "\n"
    csv_path = _HERE / "sample.gkg.csv"
    csv_path.write_text(csv_text, encoding="utf-8")

    # ZIP déterministe : un seul membre, date figée (pas de mtime courant).
    zip_path = _HERE / "20260101120000.gkg.csv.zip"
    info = zipfile.ZipInfo("20260101120000.gkg.csv", date_time=(2026, 1, 1, 12, 0, 0))
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr(info, csv_text)

    print(f"écrit : {csv_path.name}, {zip_path.name}")


if __name__ == "__main__":
    main()
