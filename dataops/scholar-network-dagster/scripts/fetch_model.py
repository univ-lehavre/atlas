#!/usr/bin/env python3
"""Télécharge le modèle d'embedding `all-MiniLM-L6-v2` (étape 4, lot 3).

Le modèle (~22 Mo) n'est PAS versionné dans git : il est récupéré ici, à une
**révision HuggingFace figée** et avec **vérification sha256**, puis figé dans
l'image Docker au build (conforme à « cuit hors-ligne dans l'image », ADR 0059 —
aucune dépendance réseau au RUNTIME). Les tests locaux/CI l'appellent aussi, vers
un cache gitignoré.

Reproductibilité (ADR 0057) : la révision est épinglée par commit hash (pas
`main`) et chaque fichier est vérifié contre un sha256 committé — un modèle altéré
ou modifié en amont fait échouer le téléchargement. Idempotent : un fichier déjà
présent et valide n'est pas re-téléchargé.

    python scripts/fetch_model.py <dest_dir>
"""

import hashlib
import sys
import urllib.request
from pathlib import Path

# Provenance (révision HF figée + sha256 par fichier) : SOURCE DE VÉRITÉ UNIQUE dans le
# package (scholar_network_dagster.model_provenance), partagée avec l'instrumentation MLflow
# (tracking.py / atlas#397) — pas de redéfinition ici. Au build de l'image, le package
# est installé AVANT l'appel de ce script (cf. Dockerfile), donc l'import fonctionne.
from scholar_network_dagster.model_provenance import FILES as _FILES
from scholar_network_dagster.model_provenance import HF_REPO as _HF_REPO
from scholar_network_dagster.model_provenance import HF_REVISION as _HF_REVISION

_BASE = f"https://huggingface.co/{_HF_REPO}/resolve/{_HF_REVISION}"


def _sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def fetch(dest_dir):
    """Télécharge et vérifie le modèle dans ``dest_dir`` (idempotent)."""
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    for remote, (name, expected) in _FILES.items():
        target = dest / name
        if target.exists() and _sha256(target) == expected:
            print(f"✓ {name} déjà présent et valide")
            continue
        url = f"{_BASE}/{remote}"
        print(f"↓ {name} depuis {url}")
        urllib.request.urlretrieve(url, target)  # noqa: S310 (URL HTTPS figée)
        actual = _sha256(target)
        if actual != expected:
            target.unlink(missing_ok=True)
            raise SystemExit(
                f"sha256 inattendu pour {name} :\n  attendu {expected}\n  obtenu  {actual}"
            )
        print(f"✓ {name} vérifié")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("usage: python scripts/fetch_model.py <dest_dir>")
    fetch(sys.argv[1])
