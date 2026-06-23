"""Asset d'ingestion : pull HTTP borné du flux GKG 2.1 vers le lakehouse.

Télécharge les fichiers 15 minutes du GKG (``YYYYMMDDHHMMSS.gkg.csv.zip`` depuis
``data.gdeltproject.org``) postérieurs au watermark de timestamp, les **projette**
aux champs utiles (ADR 0064 : identifiant de document, date, organisations, source,
info de traduction) et écrit le résultat en JSONL gzippé sous
``raw/gkg/dt=YYYY-MM-DD/run=<run_id>/`` du lakehouse.

À la différence de « citation » (sync S3→S3 via rclone), la source est un **serveur
HTTP** : le download passe par ``httpx``, le ZIP est décompressé en mémoire
(``zipfile``), puis le CSV tab-delimited est projeté (``gkg.project_csv``). L'écriture
lakehouse, elle, repasse par ``rclone`` (un seul remote ``ceph``).

Le volume est **borné** par configuration (``max_files`` fichiers 15 minutes par
run) : sur le banc, on ne rapatrie jamais le flux complet (~plusieurs Go/jour). La
clé du watermark n'avance qu'après une écriture réussie (idempotence).

NB : pas de ``from __future__ import annotations`` ici — Dagster introspecte les
annotations à l'exécution.
"""

import gzip
import io
import json
import subprocess
import tempfile
import zipfile
from dataclasses import asdict
from pathlib import Path

import httpx
from dagster import Config, Failure, MaterializeResult, MetadataValue, asset
from openlineage.client.event_v2 import RunState

from mediawatch_dagster import gkg, lineage
from mediawatch_dagster.gkg import GkgFile, OrgMention
from mediawatch_dagster.resources import CephTarget, ceph_target_from_env, render_rclone_config
from mediawatch_dagster.watermark import read_watermark, write_watermark

# Source externe (en prose uniquement ; jamais dans un identifiant interne, ADR 0035).
_MASTER_LIST_URL = "http://data.gdeltproject.org/gdeltv2/masterfilelist.txt"
_MASTER_LIST_TRANSLATION_URL = "http://data.gdeltproject.org/gdeltv2/masterfilelist-translation.txt"
_HTTP_TIMEOUT = 60.0


class RawGkgConfig(Config):
    """Paramètres du pull incrémental borné."""

    max_files: int = 2
    """Nombre maximal de fichiers 15 minutes à ingérer **par run** (borne le volume).

    Défaut petit (banc) ; la prod relève cette limite. Au bootstrap (pas de
    watermark), borne aussi le rattrapage initial.
    """

    include_translation: bool = True
    """Inclure le flux traduit (Translingual) en plus de l'anglais.

    ``True`` = « toutes langues » (ADR 0064 : multilingue natif). Les deux master
    lists sont fusionnées et triées par timestamp avant sélection.
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


def _partition_date(timestamp: str) -> str:
    """``YYYYMMDDHHMMSS`` → ``YYYY-MM-DD`` (partition Hive quotidienne)."""
    return f"{timestamp[0:4]}-{timestamp[4:6]}-{timestamp[6:8]}"


def _write_mentions(
    mentions: list[OrgMention],
    timestamp: str,
    run_id: str,
    target: CephTarget,
    config_path: Path,
) -> int:
    """Écrit les mentions d'un fichier en JSONL gzippé sur le lakehouse (rcat).

    Chemin : ``raw/gkg/dt=YYYY-MM-DD/run=<run_id>/<timestamp>.jsonl.gz``. Immuable
    (un rejeu écrit sous un nouveau ``run=``). ``gzip`` à ``mtime=0`` pour un octet
    déterministe (ADR 0057). Renvoie le nombre de mentions écrites.
    """
    payload = "\n".join(json.dumps(asdict(m), sort_keys=True) for m in mentions)
    buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode="wb", mtime=0) as gz:
        gz.write(payload.encode("utf-8"))
    dest = (
        f"ceph:{target.bucket}/raw/gkg/dt={_partition_date(timestamp)}"
        f"/run={run_id}/{timestamp}.jsonl.gz"
    )
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


@asset(name="raw_gkg", group_name="ingestion")
def raw_gkg(context, config: RawGkgConfig) -> MaterializeResult:
    """Pull HTTP incrémental borné du flux GKG vers ``raw/gkg`` du lakehouse."""
    target = ceph_target_from_env()
    # context.run_id : disponible à l'exécution ET en invocation directe (tests), au
    # prix d'un DeprecationWarning. context.run.run_id, lui, n'est pas peuplé en
    # invocation directe (DagsterInvalidPropertyError) — on garde donc run_id.
    run_id = context.run_id
    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))

        after = read_watermark(target.bucket, config_path)
        available = _fetch_master_files(config)
        fresh, truncated = gkg.select_fresh(available, after, config.max_files)

        lineage.emit(RunState.START, run_id, "raw_gkg", [lineage.source_dataset()], [])

        total_mentions = 0
        for file in fresh:
            mentions = _download_and_project(file)
            total_mentions += _write_mentions(mentions, file.timestamp, run_id, target, config_path)

        # Le watermark avance au timestamp du DERNIER fichier réellement écrit (jamais
        # au-delà : si max_files a tronqué, le run suivant reprend exactement ici).
        if fresh:
            write_watermark(fresh[-1].timestamp, target.bucket, config_path)

        lineage.emit(
            RunState.COMPLETE,
            run_id,
            "raw_gkg",
            [lineage.source_dataset()],
            [lineage.raw_dataset()],
        )

    return MaterializeResult(
        metadata={
            "files_ingested": MetadataValue.int(len(fresh)),
            "mentions_written": MetadataValue.int(total_mentions),
            "watermark": MetadataValue.text(fresh[-1].timestamp if fresh else (after or "—")),
            "truncated": MetadataValue.bool(truncated),
            "include_translation": MetadataValue.bool(config.include_translation),
            "bucket": MetadataValue.text(f"{target.bucket}/raw/gkg"),
        }
    )
