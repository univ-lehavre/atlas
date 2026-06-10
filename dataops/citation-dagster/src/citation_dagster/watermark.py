"""Watermark de date persistant pour l'ingestion incrémentale.

Le watermark mémorise, **par entité**, la date de la dernière partition
``updated_date`` synchronisée avec succès. Il est stocké en un seul objet JSON
sur le lakehouse (``raw/_watermark.json``), de la forme :

    {"works": "2024-01-05", "authors": "2024-01-03"}

Au prochain run, seules les partitions postérieures à cette date sont
re-synchronisées. Le watermark n'avance qu'**après** un sync réussi (idempotence
et reprise sur échec).

Lecture/écriture via ``rclone`` (``cat`` / ``rcat``). Détail vérifié contre un S3
de test : ``rclone cat`` d'un objet **absent** renvoie le code 0 avec une sortie
**vide** — le cas « premier run » se détecte donc sur une sortie vide ou un JSON
non parsable, pas sur le code de retour.
"""

import json
import subprocess
from pathlib import Path

_WATERMARK_KEY = "raw/_watermark.json"


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
    if result.returncode != 0 or not result.stdout.strip():
        return {}
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def read_watermark(entity: str, bucket: str, config_path: Path) -> str | None:
    """Renvoie la date de la dernière partition synchronisée pour ``entity``.

    ``None`` au premier run (aucun watermark) : toutes les partitions sont alors
    considérées comme postérieures (bootstrap).
    """
    return _load(bucket, config_path).get(entity)


def write_watermark(entity: str, date: str, bucket: str, config_path: Path) -> None:
    """Avance le watermark de ``entity`` à ``date`` (réécrit le document JSON).

    À n'appeler qu'**après** un sync réussi de l'entité.
    """
    data = _load(bucket, config_path)
    data[entity] = date
    payload = json.dumps(data, sort_keys=True)
    result = subprocess.run(
        ["rclone", "--config", str(config_path), "rcat", _watermark_path(bucket)],
        input=payload,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Écriture du watermark échouée : {result.stderr[-500:]}")
