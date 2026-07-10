"""Asset d'ingestion NATIVE : pull HTTP du flux GKG 2.1, **27 champs fidèles**, Parquet.

Couche NATIVE de la veille médiatique (ADR 0100) : télécharge les fichiers 15
minutes du GKG (``YYYYMMDDHHMMSS.gkg.csv.zip`` depuis ``data.gdeltproject.org``) du
**jour de la partition**, décompresse chaque ZIP, et écrit les **27 colonnes V2.1
telles quelles** (copie fidèle, VARCHAR — aucun champ perdu, aucun typage) en
**Parquet** sous ``raw_native/gkg/dt=YYYY-MM-DD/run=<run_id>/<timestamp>.parquet`` du
lakehouse.

C'est l'asset qui **frappe la source** (rate-limitée) : la couche projetée
``raw_gkg`` (6 champs) en DÉRIVE ensuite par lecture S3, sans re-télécharger (ADR
0100 — un seul pull GDELT). Toute la mécanique anti rate-limit (client throttlé,
retry/backoff sur 429/5xx) et le pilotage par partition journalière (curseur
ré-matérialisable) sont ceux de l'ADR 0064, réutilisés à l'identique.

Écriture : la table Parquet est construite **en mémoire** (``pyarrow``) puis poussée
au lakehouse via ``rclone rcat`` (même schéma d'écriture que l'ancien JSONL, format
colonnaire en plus). Tri par ``gkg_record_id`` pour des statistiques de _row-group_
exploitables en _predicate pushdown_ (ADR 0100). Octets déterministes (ADR 0057).

NB : pas de ``from __future__ import annotations`` ici — Dagster introspecte les
annotations à l'exécution (leçon drift D9).
"""

import io
import subprocess
import tempfile
import zipfile
from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
from dagster import (
    Config,
    Failure,
    MaterializeResult,
    MetadataValue,
    asset,
)
from openlineage.client.event_v2 import RunState

from mediawatch_dagster import gkg, lineage
from mediawatch_dagster.assets.raw_gkg import gkg_daily_partitions
from mediawatch_dagster.gkg import GkgFile
from mediawatch_dagster.http_fetch import RateLimitError, RetryPolicy, ThrottledClient
from mediawatch_dagster.resources import CephTarget, ceph_target_from_env, render_rclone_config

# Source externe (en prose uniquement ; jamais dans un identifiant interne, ADR 0035).
_MASTER_LIST_URL = "http://data.gdeltproject.org/gdeltv2/masterfilelist.txt"
_MASTER_LIST_TRANSLATION_URL = "http://data.gdeltproject.org/gdeltv2/masterfilelist-translation.txt"

# Préfixe de la couche native (ADR 0100). Neutre (aucune marque GDELT/GKG dans un
# identifiant, ADR 0035) ; le segment descriptif ``gkg`` du sous-chemin est admis
# comme pour ``raw/gkg`` (ADR 0064).
_NATIVE_PREFIX = "raw_native/gkg"


class RawNativeGkgConfig(Config):
    """Paramètres du pull natif borné (par partition journalière)."""

    max_files: int = 8
    """Nombre maximal de fichiers 15 minutes ingérés **par partition et par run**.

    Une journée complète = 96 fichiers ; le défaut (8) borne un run de banc. La prod
    relève cette limite (≥ 96 pour couvrir une journée entière). Si la partition est
    tronquée, la re-matérialiser avec un ``max_files`` plus haut complète le jour.
    """

    include_translation: bool = True
    """Inclure le flux traduit (Translingual) en plus de l'anglais (ADR 0064)."""

    # ── Robustesse face au rate-limiting GDELT (ADR 0064) ──
    min_interval_s: float = 1.0
    """Délai minimal entre deux requêtes HTTP (throttle ; ≈ 1 req/s par défaut)."""

    max_attempts: int = 5
    """Tentatives par requête (retry sur 429/5xx avec backoff, respecte Retry-After)."""


def _retry_policy(config: RawNativeGkgConfig) -> RetryPolicy:
    """Politique de robustesse dérivée de la config (throttle + retry)."""
    return RetryPolicy(
        max_attempts=config.max_attempts,
        min_interval_s=config.min_interval_s,
    )


def _fetch_master_files(client: ThrottledClient, config: RawNativeGkgConfig) -> list[GkgFile]:
    """Construit la liste fusionnée et triée des fichiers GKG disponibles."""
    try:
        files = gkg.parse_master_list(client.get_text(_MASTER_LIST_URL))
        if config.include_translation:
            files += gkg.parse_master_list(client.get_text(_MASTER_LIST_TRANSLATION_URL))
    except RateLimitError as exc:
        raise Failure(
            description="Téléchargement de la master list échoué (rate-limit ?)",
            metadata={"error": MetadataValue.text(str(exc))},
        ) from exc
    return sorted(files, key=lambda f: f.timestamp)


def _download_and_parse(client: ThrottledClient, file: GkgFile) -> list[dict[str, str]]:
    """Télécharge un ``.gkg.csv.zip``, le décompresse et le parse en 27 champs fidèles."""
    try:
        content = client.get_bytes(file.url)
    except RateLimitError as exc:
        raise Failure(
            description=f"Téléchargement du fichier GKG échoué (rate-limit ?) : {file.url}",
            metadata={"error": MetadataValue.text(str(exc))},
        ) from exc
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            name = archive.namelist()[0]
            # Le GKG peut contenir des octets non-UTF8 (noms propres) → tolérant.
            text = archive.read(name).decode("utf-8", errors="replace")
    except (zipfile.BadZipFile, IndexError) as exc:
        raise Failure(
            description=f"Archive GKG illisible : {file.url}",
            metadata={"error": MetadataValue.text(str(exc))},
        ) from exc
    return gkg.parse_native_csv(text)


def build_parquet_bytes(rows: list[dict[str, str]]) -> bytes:
    """Sérialise des lignes natives (27 champs) en octets Parquet DÉTERMINISTES.

    Toutes les colonnes en ``string`` (copie fidèle ; le typage est aval, ADR 0100).
    La table est **triée par ``gkg_record_id``** pour des statistiques de _row-group_
    exploitables en _predicate pushdown_ (ADR 0100). Compression ``zstd`` + statistiques
    activées. ``pyarrow`` produit des octets reproductibles à entrée égale (ADR 0057),
    ce qui rend l'écriture testable hermétiquement. Toujours les 27 colonnes de
    ``NATIVE_COLUMNS`` — même si ``rows`` est vide (schéma stable pour l'aval).
    """
    columns = gkg.NATIVE_COLUMNS
    arrays = {
        col: pa.array([row.get(col, "") for row in rows], type=pa.string()) for col in columns
    }
    table = pa.table(arrays)
    if table.num_rows:
        table = table.sort_by([("gkg_record_id", "ascending")])
    buffer = io.BytesIO()
    pq.write_table(table, buffer, compression="zstd", write_statistics=True)
    return buffer.getvalue()


def _write_native(
    rows: list[dict[str, str]],
    timestamp: str,
    partition_date: str,
    run_id: str,
    target: CephTarget,
    config_path: Path,
) -> int:
    """Écrit les lignes natives d'un fichier en Parquet sur le lakehouse (rcat).

    Chemin : ``raw_native/gkg/dt=<partition_date>/run=<run_id>/<timestamp>.parquet``.
    Le ``dt`` est la DATE DE LA PARTITION (pas dérivée du fichier) : tous les fichiers
    d'une partition partagent le même préfixe ``dt=…/run=…``. Immuable (un rejeu de
    partition écrit un nouveau ``run=``, ADR 0064). Renvoie le nombre de lignes écrites.
    """
    payload = build_parquet_bytes(rows)
    dest = (
        f"ceph:{target.bucket}/{_NATIVE_PREFIX}"
        f"/dt={partition_date}/run={run_id}/{timestamp}.parquet"
    )
    result = subprocess.run(
        ["rclone", "--config", str(config_path), "rcat", dest],
        input=payload,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise Failure(
            description=f"Écriture du brut natif GKG échouée : {dest}",
            metadata={"stderr": MetadataValue.text(result.stderr.decode()[-500:])},
        )
    return len(rows)


@asset(name="raw_native_gkg", group_name="ingestion", partitions_def=gkg_daily_partitions)
def raw_native_gkg(context, config: RawNativeGkgConfig) -> MaterializeResult:
    """Pull HTTP des fichiers GKG du jour, **27 champs fidèles**, vers ``raw_native/gkg``."""
    target = ceph_target_from_env()
    run_id = context.run_id
    partition_date = context.partition_key  # YYYY-MM-DD
    # Client HTTP throttlé + retry/backoff (anti rate-limit GDELT, ADR 0064). La
    # limite de CONCURRENCE des partitions (backfill) est posée par tag Dagster.
    client = ThrottledClient(_retry_policy(config))

    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))

        available = _fetch_master_files(client, config)
        day_files, truncated = gkg.files_in_day(available, partition_date, config.max_files)

        lineage.emit(RunState.START, run_id, "raw_native_gkg", [lineage.source_dataset()], [])

        total_rows = 0
        for file in day_files:
            rows = _download_and_parse(client, file)
            total_rows += _write_native(
                rows, file.timestamp, partition_date, run_id, target, config_path
            )

        lineage.emit(
            RunState.COMPLETE,
            run_id,
            "raw_native_gkg",
            [lineage.source_dataset()],
            [lineage.raw_native_dataset()],
        )

    return MaterializeResult(
        metadata={
            "partition": MetadataValue.text(partition_date),
            "files_ingested": MetadataValue.int(len(day_files)),
            "rows_written": MetadataValue.int(total_rows),
            "columns": MetadataValue.int(len(gkg.NATIVE_COLUMNS)),
            "truncated": MetadataValue.bool(truncated),
            "include_translation": MetadataValue.bool(config.include_translation),
            "bucket": MetadataValue.text(f"{target.bucket}/{_NATIVE_PREFIX}/dt={partition_date}"),
        }
    )
