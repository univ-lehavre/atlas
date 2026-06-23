"""Asset d'ingestion : pull HTTP du flux GKG 2.1, PARTITIONNÉ par jour.

Télécharge les fichiers 15 minutes du GKG (``YYYYMMDDHHMMSS.gkg.csv.zip`` depuis
``data.gdeltproject.org``) du **jour de la partition**, les **projette** aux champs
utiles (ADR 0064 : identifiant de document, date, organisations, source, info de
traduction) et écrit le résultat en JSONL gzippé sous
``raw/gkg/dt=YYYY-MM-DD/run=<run_id>/`` du lakehouse.

**Pilotage par partition temporelle (ADR 0064, PR 4).** La partition journalière
est le **curseur** : matérialiser une partition rapatrie tous les fichiers de ce
jour (idempotent — un rejeu écrit un nouveau ``run=``). Le schedule matérialise la
partition du jour courant toutes les 15 minutes (ingestion quasi temps réel) ; le
**backfill** historique = matérialiser les partitions passées (UI Dagster,
parallélisable). Plus de watermark : la partition EST le curseur.

À la différence de « citation » (sync S3→S3 via rclone), la source est un **serveur
HTTP** : le download passe par ``httpx``, le ZIP est décompressé en mémoire
(``zipfile``), puis le CSV tab-delimited est projeté (``gkg.project_csv``). L'écriture
lakehouse, elle, repasse par ``rclone`` (un seul remote ``ceph``).

NB : pas de ``from __future__ import annotations`` ici — Dagster introspecte les
annotations à l'exécution.
"""

import gzip
import io
import json
import os
import subprocess
import tempfile
import zipfile
from dataclasses import asdict
from pathlib import Path

import httpx
from dagster import (
    Config,
    DailyPartitionsDefinition,
    Failure,
    MaterializeResult,
    MetadataValue,
    asset,
)
from openlineage.client.event_v2 import RunState

from mediawatch_dagster import gkg, lineage
from mediawatch_dagster.gkg import GkgFile, OrgMention
from mediawatch_dagster.resources import CephTarget, ceph_target_from_env, render_rclone_config

# Source externe (en prose uniquement ; jamais dans un identifiant interne, ADR 0035).
_MASTER_LIST_URL = "http://data.gdeltproject.org/gdeltv2/masterfilelist.txt"
_MASTER_LIST_TRANSLATION_URL = "http://data.gdeltproject.org/gdeltv2/masterfilelist-translation.txt"
_HTTP_TIMEOUT = 60.0

# Date de départ des partitions journalières. GKG 2.1 (Translingual) démarre au
# 2015-02-19 ; surchargeable par env pour borner un banc (pas de backfill géant en
# test). Le schedule et le backfill s'appuient sur cette définition de partition.
_PARTITION_START = os.environ.get("MEDIAWATCH_GKG_START_DATE", "2015-02-19")
gkg_daily_partitions = DailyPartitionsDefinition(start_date=_PARTITION_START)


class RawGkgConfig(Config):
    """Paramètres du pull borné (par partition journalière)."""

    max_files: int = 8
    """Nombre maximal de fichiers 15 minutes ingérés **par partition et par run**.

    Une journée complète = 96 fichiers ; le défaut (8) borne un run de banc. La prod
    relève cette limite (≥ 96 pour couvrir une journée entière). Si la partition est
    tronquée, la re-matérialiser avec un ``max_files`` plus haut complète le jour.
    """

    include_translation: bool = True
    """Inclure le flux traduit (Translingual) en plus de l'anglais.

    ``True`` = « toutes langues » (ADR 0064 : multilingue natif). Les deux master
    lists sont fusionnées et triées par timestamp avant filtrage par jour.
    """


def _fetch_text(url: str) -> str:
    """Télécharge un fichier texte (master list) ; ``Failure`` sur erreur HTTP."""
    try:
        response = httpx.get(url, timeout=_HTTP_TIMEOUT, follow_redirects=True)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise Failure(
            description=f"Téléchargement de la master list échoué : {url}",
            metadata={"error": MetadataValue.text(str(exc))},
        ) from exc
    return response.text


def _fetch_master_files(config: RawGkgConfig) -> list[GkgFile]:
    """Construit la liste fusionnée et triée des fichiers GKG disponibles."""
    files = gkg.parse_master_list(_fetch_text(_MASTER_LIST_URL))
    if config.include_translation:
        files += gkg.parse_master_list(_fetch_text(_MASTER_LIST_TRANSLATION_URL))
    return sorted(files, key=lambda f: f.timestamp)


def _download_and_project(file: GkgFile) -> list[OrgMention]:
    """Télécharge un ``.gkg.csv.zip``, le décompresse et le projette en mentions."""
    try:
        response = httpx.get(file.url, timeout=_HTTP_TIMEOUT, follow_redirects=True)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise Failure(
            description=f"Téléchargement du fichier GKG échoué : {file.url}",
            metadata={"error": MetadataValue.text(str(exc))},
        ) from exc
    try:
        with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
            name = archive.namelist()[0]
            # Le GKG peut contenir des octets non-UTF8 (noms propres) → tolérant.
            text = archive.read(name).decode("utf-8", errors="replace")
    except (zipfile.BadZipFile, IndexError) as exc:
        raise Failure(
            description=f"Archive GKG illisible : {file.url}",
            metadata={"error": MetadataValue.text(str(exc))},
        ) from exc
    return gkg.project_csv(text)


def _write_mentions(
    mentions: list[OrgMention],
    timestamp: str,
    partition_date: str,
    run_id: str,
    target: CephTarget,
    config_path: Path,
) -> int:
    """Écrit les mentions d'un fichier en JSONL gzippé sur le lakehouse (rcat).

    Chemin : ``raw/gkg/dt=<partition_date>/run=<run_id>/<timestamp>.jsonl.gz``. Le
    ``dt`` est la DATE DE LA PARTITION (pas dérivée du fichier) : tous les fichiers
    d'une partition partagent le même préfixe ``dt=…/run=…``. Immuable (un rejeu de
    partition écrit un nouveau ``run=``). ``gzip`` à ``mtime=0`` pour un octet
    déterministe (ADR 0057). Renvoie le nombre de mentions écrites.
    """
    payload = "\n".join(json.dumps(asdict(m), sort_keys=True) for m in mentions)
    buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode="wb", mtime=0) as gz:
        gz.write(payload.encode("utf-8"))
    dest = f"ceph:{target.bucket}/raw/gkg/dt={partition_date}/run={run_id}/{timestamp}.jsonl.gz"
    result = subprocess.run(
        ["rclone", "--config", str(config_path), "rcat", dest],
        input=buffer.getvalue(),
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise Failure(
            description=f"Écriture du brut GKG échouée : {dest}",
            metadata={"stderr": MetadataValue.text(result.stderr.decode()[-500:])},
        )
    return len(mentions)


@asset(name="raw_gkg", group_name="ingestion", partitions_def=gkg_daily_partitions)
def raw_gkg(context, config: RawGkgConfig) -> MaterializeResult:
    """Pull HTTP des fichiers GKG du jour de la partition vers ``raw/gkg`` du lakehouse."""
    target = ceph_target_from_env()
    run_id = context.run_id
    partition_date = context.partition_key  # YYYY-MM-DD

    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))

        available = _fetch_master_files(config)
        day_files, truncated = gkg.files_in_day(available, partition_date, config.max_files)

        lineage.emit(RunState.START, run_id, "raw_gkg", [lineage.source_dataset()], [])

        total_mentions = 0
        for file in day_files:
            mentions = _download_and_project(file)
            total_mentions += _write_mentions(
                mentions, file.timestamp, partition_date, run_id, target, config_path
            )

        lineage.emit(
            RunState.COMPLETE,
            run_id,
            "raw_gkg",
            [lineage.source_dataset()],
            [lineage.raw_dataset()],
        )

    return MaterializeResult(
        metadata={
            "partition": MetadataValue.text(partition_date),
            "files_ingested": MetadataValue.int(len(day_files)),
            "mentions_written": MetadataValue.int(total_mentions),
            "truncated": MetadataValue.bool(truncated),
            "include_translation": MetadataValue.bool(config.include_translation),
            "bucket": MetadataValue.text(f"{target.bucket}/raw/gkg/dt={partition_date}"),
        }
    )
