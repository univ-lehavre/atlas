"""Parité de la référence de pré-image (deploy/deps-base.ref) — portail QUALITÉ (ADR 0104).

La chaîne de livraison in-cluster (air-gappée, sans python sur le runner) LIT
`deploy/deps-base.ref` pour le FROM de la cible `code`. La fraîcheur est donc gardée
ICI, avant le merge : ce test échoue si le lock (ou la tranche deps du Dockerfile, ou la
provenance du modèle) a changé SANS re-build de la pré-image — le remède est de lancer
`deploy/build-deps-base.sh` (poste, egress) puis de committer le .ref mis à jour.

NB : ce test garantit ref == calculé, PAS la présence du tag au registre (ça, c'est la
vérification post-push du script de build, et l'échec bruyant du FROM à la livraison).
"""

import subprocess
import sys
from pathlib import Path

_CL_ROOT = Path(__file__).resolve().parents[1]


def test_deps_base_ref_matches_computed_tag():
    ref_file = _CL_ROOT / "deploy" / "deps-base.ref"
    assert ref_file.exists(), (
        "deploy/deps-base.ref absent — lancer deploy/build-deps-base.sh (poste) "
        "puis committer le fichier (chaîne de livraison, ADR 0104)."
    )
    committed = ref_file.read_text(encoding="utf-8").strip()
    computed = subprocess.run(
        [sys.executable, "scripts/check_deps_base_freshness.py", "--print-tag"],
        cwd=_CL_ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    assert committed == computed, (
        f"deps-base.ref ({committed}) a divergé du tag calculé ({computed}) : le lock/"
        "Dockerfile a changé sans re-build de la pré-image. Lancer deploy/build-deps-base.sh "
        "puis committer deploy/deps-base.ref."
    )
