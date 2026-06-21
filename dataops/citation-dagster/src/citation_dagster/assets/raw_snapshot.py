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

# Partition RÉSERVÉE des authors dérivés (mode échantillon cohérent, ADR 0063). Valeur
# non-date pour ne JAMAIS entrer en collision avec une partition réelle updated_date=YYYY-MM-DD.
_COHERENT_AUTHORS_PARTITION = "updated_date=coherent-sample"

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

    coherent_sample: bool = False
    """Mode « échantillon cohérent » pour les **petits bancs** (ADR 0063 ; OFF par défaut).

    Sur un petit banc, les tranches ``works`` et ``authors`` ingérées par date sont
    **disjointes** : les ``author_id`` cités par les works échantillonnés sont quasi
    absents de l'échantillon d'``authors`` → clés étrangères pendantes (tests dbt
    ``relationships``). Activé, ce mode **dérive** après le sync des works une tranche
    ``authors`` contenant EXACTEMENT les auteurs cités, depuis les objets ``author``
    inline (``id``/``display_name``/``orcid``) de ``works.authorships``. Écrite sous la
    partition réservée ``updated_date=coherent-sample``. N'altère aucune tranche réelle.

    **Banc uniquement** : en prod, laisser ``False`` (snapshot complet = cohérence native,
    ADR 0054). Requiert ``works`` dans ``entities``.
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
    fresh = candidates[:max_files]
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


def _derive_coherent_authors(bucket: str) -> int:
    """Dérive une tranche ``authors`` cohérente depuis les works (mode banc, ADR 0063).

    Écrit sous ``raw/authors/<partition réservée>/`` un JSONL.gz contenant EXACTEMENT
    les auteurs cités par les works déjà synchronisés, depuis les objets ``author`` inline
    (``id``/``display_name``/``orcid``) de ``works.authorships``. ``works_count`` et
    ``cited_by_count`` (absents de l'inline, non contraints par les suites GE / tests
    ``relationships``) sont mis à ``0``. Renvoie le nombre d'auteurs dérivés.

    Lecture/écriture via DuckDB↔S3 (backend lakehouse, ADR 0055) : ``COPY … (FORMAT JSON,
    COMPRESSION gzip)`` produit le même JSONL.gz que la source, relu par dbt à l'identique.
    """
    con = lakehouse.connect()
    src = f"s3://{bucket}/raw/works/**/*.gz"
    dest = f"s3://{bucket}/raw/authors/{_COHERENT_AUTHORS_PARTITION}/part_0000.gz"
    # DISTINCT sur author.id ; un auteur peut être cité par plusieurs works.
    con.execute(
        f"""
        COPY (
            SELECT DISTINCT
                ash.author.id           AS id,
                ash.author.orcid        AS orcid,
                ash.author.display_name AS display_name,
                0                       AS works_count,
                0                       AS cited_by_count
            FROM (
                SELECT unnest(authorships) AS ash
                FROM read_json_auto('{src}', hive_partitioning=false, union_by_name=true)
            ) t
            WHERE ash.author.id IS NOT NULL
        ) TO '{dest}' (FORMAT JSON, COMPRESSION gzip)
        """
    )
    return con.sql(
        f"SELECT count(*) FROM read_json_auto('{dest}', hive_partitioning=false)"
    ).fetchone()[0]


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

    # Mode banc (ADR 0063) : rendre l'échantillon cohérent (authors cités par les works)
    # APRÈS le sync, pour que les tests dbt relationships passent sur un petit banc.
    coherent_authors = 0
    if config.coherent_sample:
        if "works" not in config.entities:
            raise Failure(description="coherent_sample exige « works » dans entities (ADR 0063)")
        coherent_authors = _derive_coherent_authors(target.bucket)

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
            "coherent_authors": MetadataValue.int(coherent_authors),
        }
    )
