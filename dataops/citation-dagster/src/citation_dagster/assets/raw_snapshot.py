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
from citation_dagster.watermark import read_watermark, write_watermark

# Bucket source externe (en prose uniquement ; jamais dans un identifiant interne).
_SOURCE_BUCKET = "openalex"
_PRODUCER = "https://github.com/univ-lehavre/atlas/dataops/citation-dagster"


class RawSnapshotConfig(Config):
    """Paramètres du sync incrémental borné."""

    sample_size: int = 4
    """Nombre maximal de fichiers ``.gz`` à copier **par partition** (borne le volume)."""

    entities: list[str] = Field(default_factory=lambda: ["works", "authors"])
    """Entités OpenAlex à ingérer."""

    max_partitions: int = 1
    """Nombre maximal de partitions ``updated_date`` à traiter **par entité et par run**.

    Borne le volume sur le petit banc (défaut petit). La prod relève cette limite.
    """

    max_merged_files: int = 1
    """Nombre maximal de fichiers ``merged_ids`` (CSV.gz) à rapatrier par entité et run."""

    partition: str | None = None
    """Partition ``updated_date=…`` ciblée explicitement. Si fournie, **ignore le
    watermark** et ne traite que cette partition — utile au test E2E ciblé/léger.

    ``None`` (cas normal) : l'incrémental traite les partitions postérieures au
    watermark (bornées par ``max_partitions``).
    """


def _run_rclone(args: list[str], config_path: Path) -> subprocess.CompletedProcess[str]:
    """Lance ``rclone`` avec le fichier de config donné ; renvoie le process."""
    return subprocess.run(
        ["rclone", "--config", str(config_path), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def _list_partitions(entity: str, config_path: Path) -> list[str]:
    """Liste, triées, les partitions ``updated_date=…`` d'une entité.

    Liste **uniquement les dossiers de premier niveau** (sans ``--recursive``) :
    lister récursivement tout ``data/<entity>`` (des centaines de milliers de
    fichiers) serait prohibitif. Le tri lexicographique des `updated_date=YYYY-MM-DD`
    coïncide avec le tri chronologique.
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
    return sorted(line.strip("/ ") for line in listing.stdout.splitlines() if line.strip())


def _partitions_to_sync(
    entity: str,
    config_path: Path,
    after: str | None,
    max_partitions: int,
    explicit: str | None = None,
) -> list[str]:
    """Partitions à synchroniser ce run, bornées à ``max_partitions``.

    - ``explicit`` fourni : on ne traite que cette partition (test ciblé), watermark ignoré.
    - sinon : les partitions dont la **date** (``YYYY-MM-DD``) est postérieure au
      watermark ``after``. ``after is None`` (premier run / bootstrap) : toutes candidates.
    """
    if explicit is not None:
        return [explicit]
    partitions = _list_partitions(entity, config_path)
    if not partitions:
        raise Failure(description=f"Aucune partition trouvée pour l'entité « {entity} »")
    candidates = [p for p in partitions if after is None or _partition_date(p) > after]
    return candidates[:max_partitions]


def _partition_date(partition: str) -> str:
    """Extrait la date ``YYYY-MM-DD`` d'une partition ``updated_date=YYYY-MM-DD``."""
    return partition[len("updated_date=") :]


def _copy_files(src: str, keys: list[str], dest: str, config_path: Path, what: str) -> None:
    """Copie une liste de fichiers ``keys`` de ``src`` vers ``dest`` (rclone copy)."""
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
                dest,
            ],
            config_path,
        )
    finally:
        os.unlink(files_from_path)
    if result.returncode != 0:
        raise Failure(
            description=f"rclone copy a échoué pour « {what} »",
            metadata={"stderr": MetadataValue.text(result.stderr[-2000:])},
        )


def _copy_partition(
    entity: str, partition: str, sample_size: int, target: CephTarget, config_path: Path
) -> int:
    """Copie ≤ ``sample_size`` ``.gz`` d'une partition vers ``raw/`` ; renvoie le nb copié."""
    src = f"openalex:{_SOURCE_BUCKET}/data/{entity}/{partition}"
    listing = _run_rclone(["lsf", "--include", "*.gz", src], config_path)
    if listing.returncode != 0:
        raise Failure(
            description=f"rclone lsf a échoué pour « {entity}/{partition} »",
            metadata={"stderr": MetadataValue.text(listing.stderr[-2000:])},
        )
    keys = [line for line in listing.stdout.splitlines() if line.strip()][:sample_size]
    if not keys:
        raise Failure(description=f"Aucun .gz dans « {entity}/{partition} »")
    _copy_files(
        src,
        keys,
        f"ceph:{target.bucket}/raw/{entity}/{partition}",
        config_path,
        f"{entity}/{partition}",
    )
    return len(keys)


def _sync_entity(
    entity: str,
    sample_size: int,
    target: CephTarget,
    config_path: Path,
    partitions: list[str],
) -> dict[str, object]:
    """Copie les partitions données vers ``raw/``. Renvoie le bilan (fichiers, partitions)."""
    files = sum(_copy_partition(entity, p, sample_size, target, config_path) for p in partitions)
    return {"files": files, "partitions": partitions}


def _sync_merged_ids(
    entity: str,
    target: CephTarget,
    config_path: Path,
    after: str | None,
    max_files: int,
) -> dict[str, object]:
    """Rapatrie les ``merged_ids`` postérieurs au watermark vers ``raw/merged_ids/<entity>/``.

    Copie **brute et immuable** (CSV.gz ``YYYY-MM-DD.csv.gz`` sous
    ``legacy-data/merged_ids/<entity>/``) ; la fusion effective des entités est faite
    en aval par dbt (étape 3). ``after`` filtre par date du nom de fichier.
    """
    src = f"openalex:{_SOURCE_BUCKET}/legacy-data/merged_ids/{entity}"
    listing = _run_rclone(["lsf", "--include", "*.csv.gz", src], config_path)
    if listing.returncode != 0:
        raise Failure(
            description=f"rclone lsf (merged_ids) a échoué pour « {entity} »",
            metadata={"stderr": MetadataValue.text(listing.stderr[-2000:])},
        )
    # Nom = YYYY-MM-DD.csv.gz : on filtre sur le préfixe date (tri lexico = chrono).
    names = sorted(line.strip() for line in listing.stdout.splitlines() if line.strip())
    fresh = [n for n in names if after is None or n[:10] > after][:max_files]
    if fresh:
        _copy_files(
            src,
            fresh,
            f"ceph:{target.bucket}/raw/merged_ids/{entity}",
            config_path,
            f"merged_ids/{entity}",
        )
    return {"merged_files": len(fresh)}


def _emit_lineage(state: RunState, run_id: str, entities: list[str], bucket: str) -> None:
    """Émet un événement OpenLineage vers Marquez (no-op si OPENLINEAGE_URL absent)."""
    if not os.environ.get("OPENLINEAGE_URL"):
        return
    namespace = os.environ.get("OPENLINEAGE_NAMESPACE", "dagster")
    client = OpenLineageClient.from_environment()
    inputs = [Dataset(namespace=_SOURCE_BUCKET, name=f"data/{entity}") for entity in entities]
    inputs += [
        Dataset(namespace=_SOURCE_BUCKET, name=f"legacy-data/merged_ids/{e}") for e in entities
    ]
    outputs = [Dataset(namespace="citation", name=f"raw/{entity}") for entity in entities]
    outputs += [Dataset(namespace="citation", name=f"raw/merged_ids/{e}") for e in entities]
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


def _sync_one_entity(
    entity: str, config: RawSnapshotConfig, target: CephTarget, config_path: Path
) -> dict:
    """Sync incrémental d'une entité : partitions postérieures au watermark + merged_ids.

    Le watermark n'avance qu'**après** le sync réussi de la partition la plus récente
    (un ``Failure`` en amont le laisse inchangé → reprise idempotente).
    """
    after = (
        None if config.partition is not None else read_watermark(entity, target.bucket, config_path)
    )
    partitions = _partitions_to_sync(
        entity, config_path, after, config.max_partitions, config.partition
    )

    if not partitions:
        # Rien de neuf depuis le watermark : run idempotent, aucune écriture.
        return {
            "entity": entity,
            "files": 0,
            "partitions": [],
            "merged_files": 0,
            "watermark": after,
        }

    sync = _sync_entity(entity, config.sample_size, target, config_path, partitions)
    merged = _sync_merged_ids(entity, target, config_path, after, config.max_merged_files)

    # Watermark = date de la partition la plus récente réellement synchronisée.
    new_watermark = _partition_date(max(partitions))
    if config.partition is None:
        write_watermark(entity, new_watermark, target.bucket, config_path)

    return {
        "entity": entity,
        "files": sync["files"],
        "partitions": partitions,
        "merged_files": merged["merged_files"],
        "watermark": new_watermark,
    }


@asset(name="raw_snapshot", group_name="ingestion")
def raw_snapshot(config: RawSnapshotConfig) -> MaterializeResult:
    """Sync incrémental borné du snapshot OpenAlex (works + authors + merged_ids) vers ``raw/``."""
    target = ceph_target_from_env()
    run_id = str(generate_new_uuid())

    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))

        _emit_lineage(RunState.START, run_id, config.entities, target.bucket)
        results = [_sync_one_entity(e, config, target, config_path) for e in config.entities]
        _emit_lineage(RunState.COMPLETE, run_id, config.entities, target.bucket)

    total_files = sum(r["files"] for r in results)
    total_merged = sum(r["merged_files"] for r in results)
    watermarks = ", ".join(f"{r['entity']}={r['watermark']}" for r in results)
    return MaterializeResult(
        metadata={
            "total_files": MetadataValue.int(total_files),
            "merged_files": MetadataValue.int(total_merged),
            "watermarks": MetadataValue.text(watermarks),
            "entities": MetadataValue.text(", ".join(config.entities)),
            "bucket": MetadataValue.text(f"{target.bucket}/raw"),
        }
    )
