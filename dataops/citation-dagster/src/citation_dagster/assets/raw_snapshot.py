"""Asset d'ingestion : sync borné du snapshot OpenAlex vers le lakehouse.

Synchronise les fichiers JSONL gzippés du snapshot public OpenAlex
(``s3://openalex/data/{works,authors}``) vers le lakehouse interne
(``s3://<bucket>/raw/{works,authors}``, RGW Ceph) à l'aide de ``rclone``.

Le transfert passe par **deux endpoints S3 distincts** (AWS public → RGW interne),
d'où ``rclone`` (qui gère le transfert inter-endpoints) plutôt qu'un ``aws s3 sync``
mono-endpoint. Le volume est **borné** par configuration (``sample_size`` fichiers
``.gz`` par entité) : sur le banc local, on ne rapatrie jamais le snapshot complet
(~1,6 To). La donnée brute est copiée **telle quelle** (gzippée, immuable).

Un événement OpenLineage (START + COMPLETE) est émis vers Marquez, prouvant la
chaîne de lineage dès cette première étape.

NB : pas de ``from __future__ import annotations`` ici — Dagster introspecte les
annotations à l'exécution (PEP 563 les transformerait en chaînes non résolues).
"""

import os
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from dagster import Config, Failure, MaterializeResult, MetadataValue, asset
from openlineage.client import OpenLineageClient
from openlineage.client.event_v2 import Dataset, Job, Run, RunEvent, RunState
from openlineage.client.uuid import generate_new_uuid
from pydantic import Field

from citation_dagster.resources import (
    CephTarget,
    ceph_target_from_env,
    render_rclone_config,
)

# Bucket source externe (en prose uniquement ; jamais dans un identifiant interne).
_SOURCE_BUCKET = "openalex"
_PRODUCER = "https://github.com/univ-lehavre/atlas/dataops/citation-dagster"


class RawSnapshotConfig(Config):
    """Paramètres du sync borné."""

    sample_size: int = 4
    """Nombre maximal de fichiers ``.gz`` à copier **par entité** (borne le volume)."""

    entities: list[str] = Field(default_factory=lambda: ["works", "authors"])
    """Entités OpenAlex à ingérer."""

    partition: str | None = None
    """Partition ``updated_date=…`` ciblée. ``None`` = la plus récente.

    Les partitions récentes d'OpenAlex pèsent plusieurs Go/fichier ; sur un petit
    banc, cibler une partition ancienne (légère) explicite garde le test E2E borné.
    """


def _run_rclone(args: list[str], config_path: Path) -> subprocess.CompletedProcess[str]:
    """Lance ``rclone`` avec le fichier de config donné ; renvoie le process."""
    return subprocess.run(
        ["rclone", "--config", str(config_path), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def _latest_partition(entity: str, config_path: Path) -> str:
    """Renvoie la partition ``updated_date=…`` la plus récente de l'entité.

    Liste **uniquement les dossiers de premier niveau** (sans ``--recursive``) :
    à l'échelle réelle, lister récursivement tout ``data/<entity>`` (des centaines
    de milliers de fichiers) serait prohibitif. On borne le listing à la partition.
    """
    listing = _run_rclone(
        ["lsf", "--dirs-only", f"openalex:{_SOURCE_BUCKET}/data/{entity}"],
        config_path,
    )
    if listing.returncode != 0:
        raise Failure(
            description=f"rclone lsf (partitions) a échoué pour « {entity} »",
            metadata={"stderr": MetadataValue.text(listing.stderr[-2000:])},
        )
    partitions = sorted(line.strip("/ ") for line in listing.stdout.splitlines() if line.strip())
    if not partitions:
        raise Failure(description=f"Aucune partition trouvée pour l'entité « {entity} »")
    return partitions[-1]


def _sync_entity(
    entity: str,
    sample_size: int,
    target: CephTarget,
    config_path: Path,
    partition: str | None = None,
) -> dict[str, int]:
    """Copie un sous-ensemble borné (N fichiers ``.gz`` d'une partition) vers ``raw/``."""
    partition = partition or _latest_partition(entity, config_path)
    src = f"openalex:{_SOURCE_BUCKET}/data/{entity}/{partition}"

    # Liste les .gz de CETTE partition uniquement (rapide), borne à sample_size.
    listing = _run_rclone(["lsf", "--include", "*.gz", src], config_path)
    if listing.returncode != 0:
        raise Failure(
            description=f"rclone lsf a échoué pour « {entity}/{partition} »",
            metadata={"stderr": MetadataValue.text(listing.stderr[-2000:])},
        )
    keys = [line for line in listing.stdout.splitlines() if line.strip()][:sample_size]
    if not keys:
        raise Failure(description=f"Aucun .gz dans « {entity}/{partition} »")

    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as files_from:
        files_from.write("\n".join(keys))
        files_from_path = files_from.name

    try:
        result = _run_rclone(
            [
                "copy",
                "--files-from",
                files_from_path,
                "--transfers",
                "4",
                "--checkers",
                "8",
                src,
                f"ceph:{target.bucket}/raw/{entity}/{partition}",
            ],
            config_path,
        )
    finally:
        os.unlink(files_from_path)

    if result.returncode != 0:
        raise Failure(
            description=f"rclone copy a échoué pour « {entity}/{partition} »",
            metadata={"stderr": MetadataValue.text(result.stderr[-2000:])},
        )
    return {"files": len(keys), "partition": partition}


def _emit_lineage(state: RunState, run_id: str, entities: list[str], bucket: str) -> None:
    """Émet un événement OpenLineage vers Marquez (no-op si OPENLINEAGE_URL absent)."""
    if not os.environ.get("OPENLINEAGE_URL"):
        return
    namespace = os.environ.get("OPENLINEAGE_NAMESPACE", "dagster")
    client = OpenLineageClient.from_environment()
    inputs = [Dataset(namespace=_SOURCE_BUCKET, name=f"data/{entity}") for entity in entities]
    outputs = [Dataset(namespace="citation", name=f"raw/{entity}") for entity in entities]
    client.emit(
        RunEvent(
            eventType=state,
            eventTime=datetime.now(timezone.utc).isoformat(),
            run=Run(runId=run_id),
            job=Job(namespace=namespace, name="raw_snapshot"),
            producer=_PRODUCER,
            inputs=inputs,
            outputs=outputs,
        )
    )


@asset(name="raw_snapshot", group_name="ingestion")
def raw_snapshot(config: RawSnapshotConfig) -> MaterializeResult:
    """Sync borné du snapshot OpenAlex (works + authors) vers ``raw/`` du lakehouse."""
    target = ceph_target_from_env()
    run_id = str(generate_new_uuid())

    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))

        _emit_lineage(RunState.START, run_id, config.entities, target.bucket)
        per_entity = {
            entity: _sync_entity(entity, config.sample_size, target, config_path, config.partition)
            for entity in config.entities
        }
        _emit_lineage(RunState.COMPLETE, run_id, config.entities, target.bucket)

    total_files = sum(stats["files"] for stats in per_entity.values())
    return MaterializeResult(
        metadata={
            "total_files": MetadataValue.int(total_files),
            "sample_size": MetadataValue.int(config.sample_size),
            "entities": MetadataValue.text(", ".join(config.entities)),
            "bucket": MetadataValue.text(f"{target.bucket}/raw"),
        }
    )
