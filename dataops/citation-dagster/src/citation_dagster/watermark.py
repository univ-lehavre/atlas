"""Watermark de date persistant pour l'ingestion incrémentale.

Le watermark mémorise, **par clé**, la date du dernier élément synchronisé avec
succès. Il est stocké en un seul objet JSON sur le lakehouse
(``raw/_watermark.json``). Deux familles de clés coexistent — partitions et
merged_ids — car elles avancent indépendamment :

    {"works": "2024-01-05", "merged_ids:works": "2022-07-18", "authors": "..."}

Au prochain run, seuls les éléments postérieurs à la date de leur clé sont
re-synchronisés. Une clé n'avance qu'**après** un sync réussi (idempotence et
reprise sur échec).

**Invariant : accès séquentiel uniquement.** ``write_watermark`` fait un
read-modify-write non atomique sur S3. Tant que l'asset s'exécute en séquence
(boucle synchrone, un seul réplica), aucune course n'est possible. **Toute
parallélisation future** (assets par entité, exécuteur multi-thread) **exigerait**
un write conditionnel (ETag) ou un verrou — sinon des écritures concurrentes se
perdraient, provoquant des sauts de partitions.

Lecture/écriture via ``rclone`` (``cat`` / ``rcat``). Détail vérifié contre un S3
de test : ``rclone cat`` d'un objet **absent** renvoie le code 0 avec une sortie
**vide** — le cas « premier run » se détecte donc sur une sortie vide ou un JSON
non parsable, pas sur le code de retour.
"""

import json
import subprocess
from pathlib import Path

from dagster import Failure, MetadataValue

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
    # ``lstrip`` retire un éventuel BOM UTF-8 (édition manuelle) que ``strip`` laisse.
    raw = result.stdout.lstrip("﻿").strip()
    if result.returncode != 0 or not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def read_watermark(key: str, bucket: str, config_path: Path) -> str | None:
    """Renvoie la date du dernier élément synchronisé pour ``key``.

    ``key`` est une entité (``works``) ou une clé merged_ids (``merged_ids:works``).
    ``None`` au premier run (aucun watermark) : tout est alors postérieur (bootstrap).
    """
    return _load(bucket, config_path).get(key)


def read_all(bucket: str, config_path: Path) -> dict[str, str]:
    """Renvoie le document watermark COMPLET (``{}`` si absent).

    Le sensor de CT (``definitions.py``) compare cet état d'ensemble à son curseur
    pour détecter qu'une INGESTION a avancé (nouvelle donnée brute) et déclencher le
    réentraînement. Lecture seule, sans effet de bord (contrairement à
    ``write_watermark``)."""
    return _load(bucket, config_path)


def write_watermark(key: str, date: str, bucket: str, config_path: Path) -> None:
    """Avance le watermark de ``key`` à ``date`` (réécrit le document JSON).

    À n'appeler qu'**après** un sync réussi. Voir l'invariant « accès séquentiel
    uniquement » en tête de module (read-modify-write non atomique).
    """
    data = _load(bucket, config_path)
    data[key] = date
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
