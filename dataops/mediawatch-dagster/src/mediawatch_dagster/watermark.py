"""Watermark de timestamp persistant pour l'ingestion incrémentale du GKG.

À la différence de « citation » (watermark de **date** de partition OpenAlex), la
source GKG est un flux de fichiers horodatés à la **15 minute près** : le watermark
mémorise le dernier **timestamp** ``YYYYMMDDHHMMSS`` ingéré avec succès, en un seul
objet JSON sur le lakehouse (``raw/_watermark.json``) :

    {"gkg": "20260623114500"}

Au prochain run, seuls les fichiers **strictement postérieurs** à ce timestamp sont
téléchargés. La clé n'avance qu'**après** une ingestion réussie (idempotence et
reprise sur échec).

**Invariant : accès séquentiel uniquement.** ``write_watermark`` fait un
read-modify-write non atomique sur S3. Tant que l'asset s'exécute en séquence (un
seul réplica, boucle synchrone), aucune course n'est possible. Toute
parallélisation future exigerait un write conditionnel (ETag) ou un verrou.

Lecture/écriture via ``rclone`` (``cat`` / ``rcat``). ``rclone cat`` d'un objet
**absent** renvoie le code 0 avec une sortie **vide** — le cas « premier run » se
détecte donc sur une sortie vide ou un JSON non parsable, pas sur le code de retour.
"""

import json
import subprocess
from pathlib import Path

from dagster import Failure, MetadataValue

_WATERMARK_KEY = "raw/_watermark.json"

# Unique clé de watermark de cette source (le GKG est un flux unique, pas N entités).
GKG_KEY = "gkg"


def _rclone(args: list[str], config_path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["rclone", "--config", str(config_path), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def _watermark_path(bucket: str) -> str:
    return f"ceph:{bucket}/{_WATERMARK_KEY}"


def _load(bucket: str, config_path: Path) -> dict[str, str]:
    """Charge le document watermark complet (``{}`` si absent ou illisible)."""
    result = _rclone(["cat", _watermark_path(bucket)], config_path)
    # ``lstrip`` retire un éventuel BOM UTF-8 (édition manuelle) que ``strip`` laisse.
    raw = result.stdout.lstrip("﻿").strip()
    if result.returncode != 0 or not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def read_watermark(bucket: str, config_path: Path, key: str = GKG_KEY) -> str | None:
    """Renvoie le timestamp du dernier fichier GKG ingéré (``None`` au premier run).

    ``None`` (aucun watermark) déclenche le **bootstrap** : tout fichier disponible
    est alors postérieur (borné par configuration côté asset).
    """
    return _load(bucket, config_path).get(key)


def write_watermark(timestamp: str, bucket: str, config_path: Path, key: str = GKG_KEY) -> None:
    """Avance le watermark à ``timestamp`` (réécrit le document JSON).

    À n'appeler qu'**après** une ingestion réussie. Voir l'invariant « accès
    séquentiel uniquement » en tête de module (read-modify-write non atomique).
    """
    data = _load(bucket, config_path)
    data[key] = timestamp
    payload = json.dumps(data, sort_keys=True)
    result = subprocess.run(
        ["rclone", "--config", str(config_path), "rcat", _watermark_path(bucket)],
        input=payload,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise Failure(
            description=f"Écriture du watermark échouée pour « {key} »",
            metadata={"stderr": MetadataValue.text(result.stderr[-500:])},
        )
