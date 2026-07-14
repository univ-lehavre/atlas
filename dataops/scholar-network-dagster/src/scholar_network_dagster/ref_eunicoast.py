"""Référentiel EUNICoast : les 14 ROR de l'alliance (passe 1, ADR 0103 §1.2).

EUNICoast est nommé en DESCRIPTION seulement (neutralité ADR 0022/0035) ; le référentiel
lui-même — les 14 ``ror`` (_Research Organization Registry_, l'identifiant mondial d'un
établissement) — est une **donnée de référence**. Sa source de vérité est le seed dbt
``citation-dbt/seeds/ref_eunicoast.csv`` : cette constante en est une **copie locale** (pas
un import de code Python, ADR 0055 ; une donnée de référence partagée n'est pas du code). Un
test anti-drift (``test_researchers``) casse la CI si les deux divergent.

En dur ici pour que le filtre SQL de la passe 1 ne dépende PAS de dbt à l'ingestion.

NB : pas de ``from __future__ import annotations`` (cohérence dépôt dataops).
"""

import csv
from pathlib import Path

# Les 14 ROR EUNICoast — copie du seed ``citation-dbt/seeds/ref_eunicoast.csv``.
EUNICOAST_ROR = (
    "https://ror.org/05v509s40",  # Université Le Havre Normandie (FR)
    "https://ror.org/03761pf32",  # Euro-Mediterranean University EMUNI (SI)
    "https://ror.org/02ek1bx64",  # Burgas Free University (BG)
    "https://ror.org/05yptqp13",  # University of Dubrovnik (HR)
    "https://ror.org/017wvtq80",  # University of Patras (GR)
    "https://ror.org/01bnjbv91",  # Università degli Studi di Sassari (IT)
    "https://ror.org/04276xd64",  # Universidade dos Açores (PT)
    "https://ror.org/03e10x626",  # Universitat de les Illes Balears (ES)
    "https://ror.org/04g99jx54",  # Hochschule Stralsund (DE)
    "https://ror.org/02ryfmr77",  # Université des Antilles (FR)
    "https://ror.org/017nssj40",  # Université des Antilles et de la Guyane, legacy (FR)
    "https://ror.org/05mknbx32",  # Högskolan på Åland (FI)
    "https://ror.org/0596m7f19",  # West Pomeranian University of Technology, Szczecin (PL)
    "https://ror.org/05mwmd090",  # University of the Faroe Islands (FO)
)


def seed_ror() -> set:
    """Ensemble des ROR lus du seed dbt (source de vérité) — pour l'anti-drift.

    ``parents[3]`` depuis ``src/scholar_network_dagster/ref_eunicoast.py`` →
    ``dataops/`` ; puis ``citation-dbt/seeds/ref_eunicoast.csv``. Le référentiel EUNICoast
    est commun au dépôt (une donnée, pas du code) ; scholar-network en garde une copie et
    vérifie qu'elle n'a pas divergé.
    """
    seed = Path(__file__).resolve().parents[3] / "citation-dbt" / "seeds" / "ref_eunicoast.csv"
    with seed.open(encoding="utf-8") as fh:
        return {row["ror"] for row in csv.DictReader(fh)}
