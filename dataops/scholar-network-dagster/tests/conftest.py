"""Fixtures partagées des tests de la code-location « scholar-network » (hermétiques, ADR 0057).

SQUELETTE (lot 1) : aucun asset métier, donc aucune fixture de données synthétiques
(brut pré-filtré, table chercheurs) n'est encore nécessaire — elles arriveront avec leurs
lots (2–5). Ce conftest reste volontairement MINIMAL ; on n'y garde qu'un helper générique
de saut de test réutilisable, sans importer de code métier absent.
"""

import shutil

import pytest


def requires_docker() -> None:
    """Saute le test si Docker est absent de l'hôte (tests d'intégration hermétiques).

    Les futurs tests d'intégration DuckDB↔S3 / pgvector (lots 2, 5) démarreront des
    conteneurs épinglés par digest (ADR 0057) ; ils s'auto-sautent sans Docker pour ne pas
    bloquer un contributeur. Fourni ici pour que ce contrat de saut soit stable dès le socle.
    """
    if shutil.which("docker") is None:
        pytest.skip("Docker indisponible — test d'intégration hermétique sauté (self-skipping).")
