"""Asset d'ingestion : sync borné du snapshot OpenAlex vers le lakehouse.

Synchronise les fichiers **Parquet** du snapshot public OpenAlex
(``s3://openalex/data/parquet/works``) vers le lakehouse interne
(``s3://<bucket>/raw/works``, RGW Ceph) à l'aide de ``rclone``.

Le transfert passe par **deux endpoints S3 distincts** (AWS public → RGW interne),
d'où ``rclone`` (qui gère le transfert inter-endpoints) plutôt qu'un ``aws s3 sync``
mono-endpoint. Le volume est **borné** par configuration (``sample_size`` fichiers
``.parquet`` par partition) : sur le banc local, on ne rapatrie jamais le snapshot
complet (~1,2 To). La donnée brute est copiée **telle quelle** (Parquet, immuable).

Format **Parquet colonnaire** (ADR 0105, remplace le JSONL.gz historique) : l'aval lit
par colonne (année, authorships, topics…) sans jamais désérialiser les champs lourds
(``abstract_inverted_index``, ``referenced_works``) → lecture bornée du datalake complet.
Après le sync, un **manifest** (``raw/manifest_works.parquet`` : ``file, num_rows``) est
écrit depuis les footers Parquet — il dimensionne les lots homogènes du batch EUNICoast.

Un événement OpenLineage (START + COMPLETE) est émis vers Marquez, prouvant la
chaîne de lineage dès cette première étape.

NB : pas de ``from __future__ import annotations`` ici — Dagster introspecte les
annotations à l'exécution (PEP 563 les transformerait en chaînes non résolues).
"""

import os
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from dagster import Config, Failure, MaterializeResult, MetadataValue, asset
from openlineage.client import OpenLineageClient
from openlineage.client.event_v2 import Dataset, Job, Run, RunEvent, RunState
from openlineage.client.uuid import generate_new_uuid
from pydantic import Field

from citation_dagster import lakehouse
from citation_dagster.resources import (
    CephTarget,
    ceph_target_from_env,
    render_rclone_config,
)
from citation_dagster.watermark import read_watermark, write_watermark

# Bucket source externe (en prose uniquement ; jamais dans un identifiant interne).
_SOURCE_BUCKET = "openalex"
# OpenAlex publie (2024+) `data/parquet/<entity>` (colonnaire) à côté du legacy
# `data/jsonl/<entity>` (JSONL.gz). On ingère le **Parquet** (ADR 0105) : lecture par
# colonne en aval, filtre EUNICoast borné en mémoire (le JSON de forme faisait OOM,
# drifts L76/L77). Les partitions restent `updated_date=YYYY-MM-DD`.
_SOURCE_PREFIX = "data/parquet"
_PRODUCER = "https://github.com/univ-lehavre/atlas/dataops/citation-dagster"


class RawSnapshotConfig(Config):
    """Paramètres du sync du snapshot OpenAlex — **COMPLET par défaut** (prod).

    Défaut = **non borné** : la prod rapatrie tout le snapshot (aucune valeur de
    bridage figée versionnée, ADR 0023). C'est le **banc** qui BORNE, via son overlay
    (``CITATION_INGEST_SAMPLE_SIZE`` / ``CITATION_INGEST_MAX_PARTITIONS``, injectés en
    run_config par la ScheduleDefinition — cf. ``definitions.py``). Inversion de polarité
    (le défaut était mini-banc et bridait silencieusement la prod : famine du datalake
    → 0 paire collab → modèle uplift descriptif au lieu de prédictif).
    """

    sample_size: int = 0
    """Nombre maximal de fichiers ``.parquet`` à copier **par partition**. ``0`` =
    **illimité** (tous les fichiers de la partition). Le banc pose une petite valeur pour
    ne pas se congestionner."""

    entities: list[str] = Field(default_factory=lambda: ["works"])
    """Entités OpenAlex à ingérer. Défaut ``["works"]`` : le work est **auto-suffisant**
    pour le périmètre EUNICoast (ADR 0105) — l'affiliation (``authorships[].institutions[].ror``),
    l'``author_id`` et l'ORCID sont portés par le work lui-même, sans l'entité ``authors``."""

    max_partitions: int = 0
    """Nombre maximal de partitions ``updated_date`` à traiter **par entité et par run**.

    ``0`` = **illimité** (toutes les partitions postérieures au watermark — bootstrap
    complet). Le banc pose une petite valeur (overlay) pour rester léger.
    """

    max_merged_files: int = 0
    """Nombre maximal de fichiers ``merged_ids`` (CSV.gz) à rapatrier par entité et run.
    ``0`` = **illimité** (défaut prod ; le watermark ``next_after`` reste exact même sans
    troncature). Le banc borne via l'overlay."""

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
        ["lsf", "--dirs-only", f"openalex:{_SOURCE_BUCKET}/{_SOURCE_PREFIX}/{entity}"],
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
    # ``max_partitions == 0`` (défaut prod) = illimité : toutes les partitions candidates.
    return candidates if max_partitions <= 0 else candidates[:max_partitions]


_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_PARTITION_RE = re.compile(r"^updated_date=(\d{4}-\d{2}-\d{2})$")
_MERGED_NAME_RE = re.compile(r"^(\d{4}-\d{2}-\d{2})\.csv\.gz$")


def _partition_date(partition: str) -> str:
    """Extrait et **valide** la date ``YYYY-MM-DD`` d'une partition ``updated_date=…``.

    Validation défensive : si la source publiait un dossier auxiliaire (``manifest``,
    ``.processing``…) dans le listing, une extraction aveugle polluerait le watermark
    et casserait toutes les comparaisons de date. On échoue explicitement.
    """
    match = _PARTITION_RE.match(partition)
    if not match:
        raise Failure(description=f"Partition au format inattendu : « {partition} »")
    return match.group(1)


def _merged_date(name: str) -> str:
    """Extrait la date ``YYYY-MM-DD`` d'un fichier merged_ids ``YYYY-MM-DD.csv.gz``."""
    match = _MERGED_NAME_RE.match(name)
    if not match:
        raise Failure(description=f"Nom de merged_ids inattendu : « {name} »")
    return match.group(1)


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
    """Copie ≤ ``sample_size`` ``.parquet`` d'une partition vers ``raw/`` ; renvoie le nb copié."""
    src = f"openalex:{_SOURCE_BUCKET}/{_SOURCE_PREFIX}/{entity}/{partition}"
    listing = _run_rclone(["lsf", "--include", "*.parquet", src], config_path)
    if listing.returncode != 0:
        raise Failure(
            description=f"rclone lsf a échoué pour « {entity}/{partition} »",
            metadata={"stderr": MetadataValue.text(listing.stderr[-2000:])},
        )
    all_keys = [line for line in listing.stdout.splitlines() if line.strip()]
    # ``sample_size == 0`` (défaut prod) = illimité : tous les .parquet de la partition.
    keys = all_keys if sample_size <= 0 else all_keys[:sample_size]
    if not keys:
        raise Failure(description=f"Aucun .parquet dans « {entity}/{partition} »")
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
    """Rapatrie les ``merged_ids`` postérieurs à ``after`` vers ``raw/merged_ids/<entity>/``.

    Copie **brute et immuable** (CSV.gz ``YYYY-MM-DD.csv.gz`` sous
    ``legacy-data/merged_ids/<entity>/``) ; la fusion effective des entités est faite
    en aval par dbt (étape 3).

    ``after`` est le watermark **propre aux merged_ids** (clé distincte de celui des
    partitions), filtré par la date du nom de fichier. Renvoie aussi ``next_after`` :
    la date du dernier merged_id **réellement copié** (``None`` si rien), pour que
    l'appelant fasse avancer ce watermark de façon exacte — jamais au-delà de ce qui a
    été rapatrié. C'est ce découplage qui évite la perte silencieuse de fichiers quand
    ``max_files`` tronque un lot.
    """
    src = f"openalex:{_SOURCE_BUCKET}/legacy-data/merged_ids/{entity}"
    listing = _run_rclone(["lsf", "--include", "*.csv.gz", src], config_path)
    if listing.returncode != 0:
        raise Failure(
            description=f"rclone lsf (merged_ids) a échoué pour « {entity} »",
            metadata={"stderr": MetadataValue.text(listing.stderr[-2000:])},
        )
    # Nom = YYYY-MM-DD.csv.gz : filtre sur la date du nom (tri lexico = chrono).
    names = sorted(
        line.strip() for line in listing.stdout.splitlines() if _MERGED_NAME_RE.match(line.strip())
    )
    candidates = [n for n in names if after is None or _merged_date(n) > after]
    # ``max_files == 0`` (défaut prod) = illimité : tous les merged_ids postérieurs.
    fresh = candidates if max_files <= 0 else candidates[:max_files]
    if fresh:
        _copy_files(
            src,
            fresh,
            f"ceph:{target.bucket}/raw/merged_ids/{entity}",
            config_path,
            f"merged_ids/{entity}",
        )
    # Le watermark merged_ids n'avance qu'à la date du dernier fichier COPIÉ : si
    # ``max_files`` a tronqué le lot, le run suivant reprendra les fichiers restants.
    next_after = _merged_date(fresh[-1]) if fresh else None
    return {
        "merged_files": len(fresh),
        "truncated": len(candidates) > len(fresh),
        "next_after": next_after,
    }


def _emit_lineage(state: RunState, run_id: str, entities: list[str], bucket: str) -> None:
    """Émet un événement OpenLineage vers Marquez (no-op si OPENLINEAGE_URL absent)."""
    if not os.environ.get("OPENLINEAGE_URL"):
        return
    namespace = os.environ.get("OPENLINEAGE_NAMESPACE", "dagster")
    client = OpenLineageClient.from_environment()
    inputs = [
        Dataset(namespace=_SOURCE_BUCKET, name=f"{_SOURCE_PREFIX}/{entity}") for entity in entities
    ]
    inputs += [
        Dataset(namespace=_SOURCE_BUCKET, name=f"legacy-data/merged_ids/{e}") for e in entities
    ]
    outputs = [Dataset(namespace="citation", name=f"raw/{entity}") for entity in entities]
    outputs += [Dataset(namespace="citation", name=f"raw/merged_ids/{e}") for e in entities]
    if "works" in entities:
        # Le manifest des footers (raw/manifest_works.parquet) est un output du sync works.
        outputs.append(Dataset(namespace="citation", name="raw/manifest_works"))
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
    # Mode partition explicite : watermarks ignorés (test ciblé, pas d'avancement).
    targeted = config.partition is not None

    after = None if targeted else read_watermark(entity, target.bucket, config_path)
    partitions = _partitions_to_sync(
        entity, config_path, after, config.max_partitions, config.partition
    )

    # Watermark merged_ids DISTINCT de celui des partitions (clé séparée) : il avance à
    # la date du dernier merged_id réellement copié, pas à celle des partitions — sinon
    # une troncature ``max_merged_files`` ferait dépasser le watermark et perdre des
    # fichiers (finding revue 2.2).
    merged_key = f"merged_ids:{entity}"
    merged_after = None if targeted else read_watermark(merged_key, target.bucket, config_path)
    merged = _sync_merged_ids(entity, target, config_path, merged_after, config.max_merged_files)

    if not partitions and merged["merged_files"] == 0:
        # Rien de neuf (ni partition ni merged_id) : run idempotent, aucune écriture.
        return {
            "entity": entity,
            "files": 0,
            "partitions": [],
            "merged_files": 0,
            "watermark": after,
        }

    sync = (
        _sync_entity(entity, config.sample_size, target, config_path, partitions)
        if partitions
        else {"files": 0}
    )

    if not targeted:
        if partitions:
            # Watermark partition = date de la partition la plus récente synchronisée.
            write_watermark(entity, _partition_date(max(partitions)), target.bucket, config_path)
        if merged["next_after"]:
            write_watermark(merged_key, merged["next_after"], target.bucket, config_path)

    new_watermark = _partition_date(max(partitions)) if partitions else after

    return {
        "entity": entity,
        "files": sync["files"],
        "partitions": partitions,
        "merged_files": merged["merged_files"],
        "watermark": new_watermark,
    }


def _write_works_manifest(bucket: str) -> int:
    """Écrit ``raw/manifest_works.parquet`` (footers) après le sync ; renvoie le nb de fichiers.

    Recense chaque Parquet de ``raw/works/`` et son ``num_rows`` (lu du footer, aucun scan) —
    l'asset de batch EUNICoast s'en sert pour composer des lots homogènes en nombre de works
    (ADR 0105). Délégué à ``lakehouse.write_works_manifest`` (connexion DuckDB↔RGW, extensions
    cuites). Best-effort au niveau appelant : monkeypatchable en test (pas de vrai S3)."""
    con = lakehouse.connect()
    return lakehouse.write_works_manifest(con, bucket)


@asset(name="raw_snapshot", group_name="ingestion")
def raw_snapshot(config: RawSnapshotConfig) -> MaterializeResult:
    """Sync incrémental borné du snapshot Parquet OpenAlex (works + merged_ids) vers ``raw/``.

    Après le sync des works, écrit le **manifest** (``raw/manifest_works.parquet``) qui
    dimensionne les lots du batch EUNICoast (ADR 0105)."""
    target = ceph_target_from_env()
    run_id = str(generate_new_uuid())

    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))

        _emit_lineage(RunState.START, run_id, config.entities, target.bucket)
        results = [_sync_one_entity(e, config, target, config_path) for e in config.entities]
        _emit_lineage(RunState.COMPLETE, run_id, config.entities, target.bucket)

    # Manifest des works (footers Parquet) : recense `file, num_rows` pour le batch aval.
    # Écrit seulement si des works ont été (ou avaient déjà été) synchronisés — sinon no-op
    # (0 fichier). Ne s'exécute pas en mode ciblé sur une entité sans works.
    manifest_files = 0
    if "works" in config.entities:
        manifest_files = _write_works_manifest(target.bucket)

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
            "manifest_files": MetadataValue.int(manifest_files),
        }
    )
