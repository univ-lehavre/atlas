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

# Révision HuggingFace ÉPINGLÉE de Xenova/all-MiniLM-L6-v2 (le même modèle que le
# code TS via @xenova/transformers). Figée par commit hash pour la reproductibilité.
_HF_REPO = "Xenova/all-MiniLM-L6-v2"
_HF_REVISION = "751bff37182d3f1213fa05d7196b954e230abad9"

# Fichiers nécessaires + leur sha256 de référence (vérifié à la récupération).
# {chemin distant (resolve/<rev>/<path>): (nom local, sha256)}
_FILES = {
    "onnx/model_quantized.onnx": (
        "model_quantized.onnx",
        "afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1",
    ),
    "tokenizer.json": (
        "tokenizer.json",
        "da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0",
    ),
    "tokenizer_config.json": (
        "tokenizer_config.json",
        "9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3",
    ),
    "config.json": (
        "config.json",
        "7135149f7cffa1a573466c6e4d8423ed73b62fd2332c575bf738a0d033f70df7",
    ),
}

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
