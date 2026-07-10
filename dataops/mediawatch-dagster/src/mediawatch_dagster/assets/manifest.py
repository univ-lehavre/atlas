"""Asset de matérialisation du contrat : ``manifest.json`` atomique du mart timeline.

dbt **produit** le mart « servi » en Parquet sous
``s3://<bucket>/marts/university_timeline/dt=<dt>/run=<id>/part.parquet`` (modèle
``marts_university_timeline``, matérialisation ``external``). Cet asset écrit, **en
dernier**, le ``manifest.json`` voisin — le **contrat de transfert** que le
consommateur (application) valide AVANT de lire : il vérifie ``row_count`` + le
``sha256`` de chaque part et refuse une ``schema_version`` inconnue (ADR 0029).

**Atomicité (sentinelle de complétude).** Le manifest est l'**unique écriture** de
cet asset, faite par un seul ``rclone rcat`` (PutObject S3 atomique). Un run coupé
avant cette écriture laisse les parts SANS manifest → le consommateur, qui liste le
manifest d'abord, refuse de lire. Jamais de réécriture en place : un rejeu est un
nouveau ``run=<id>`` (immutabilité, ADR 0054).

**Reproductibilité (ADR 0057).** Le ``sha256`` est calculé sur les **octets réels**
des parts (``rclone hashsum sha256 --download`` : S3 n'expose pas de sha256 côté
serveur — le ``--download`` est OBLIGATOIRE).

NB : pas de ``from __future__ import annotations`` — Dagster introspecte les
annotations à l'exécution (drift D9).
"""

import json
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from dagster import (
    AssetExecutionContext,
    AssetKey,
    Failure,
    MaterializeResult,
    MetadataValue,
    asset,
)
from openlineage.client.event_v2 import RunState

from mediawatch_dagster import lakehouse, last_run, lineage
from mediawatch_dagster.assets.raw_gkg import gkg_daily_partitions
from mediawatch_dagster.resources import ceph_target_from_env, render_rclone_config

# Version du schéma du contrat manifest. SOURCE DE VÉRITÉ (Python) ; un bump
# incrémente cette valeur (le consommateur refuse l'inconnu).
MANIFEST_SCHEMA_VERSION = 1

# Sous-dossiers « servis » des marts (le modèle dbt marts_university_timeline écrit
# sous marts/university_timeline/ via la macro marts_location ; l'asset de prévision
# écrit sous marts/university_timeline_forecast/, ADR 0081).
_MART_SUBDIR = "marts/university_timeline"
_FORECAST_SUBDIR = "marts/university_timeline_forecast"
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


# ── Fonctions pures (testables sans I/O) ─────────────────────────────────────

_DT_RUN_RE = re.compile(r"dt=([^/]+)/run=([^/]+)/")


def mart_root(remote: str, bucket: str, mart_subdir: str = _MART_SUBDIR) -> str:
    """Préfixe rclone RACINE d'un mart servi (toutes les partitions journalières)."""
    return f"{remote}:{bucket}/{mart_subdir}"


def latest_run_parts(entries: list[dict], mart_subdir: str = _MART_SUBDIR) -> dict[str, int]:
    """Sélectionne, par jour (``dt=``), les parts du DERNIER ``run=`` par RÉCENCE (ADR 0101).

    Le mart accumule une partition par jour ; chaque re-matérialisation écrit un
    nouveau ``run=`` (immutabilité). Pour le manifest GLOBAL servi, on ne retient que
    le **dernier run de chaque jour** — « dernier run gagne ». « Dernier » = run au
    ``ModTime`` S3 le plus récent (PAS l'ordre lexical du ``run=``, un uuid4 aléatoire —
    ADR 0101), via :func:`last_run.latest_run_by_day`. Les runs obsolètes restent sur
    disque (nettoyage par lifecycle S3, contrat infra).

    ``entries`` = lsjson récursif (champs ``Path`` relatif, ``ModTime``, ``Size``, ``IsDir``).
    ``mart_subdir`` préfixe les clés (le mart timeline ou le mart de prévisions).
    Retourne ``{chemin_relatif: octets}`` des seules parts retenues.
    """
    keep = last_run.latest_run_by_day(entries)  # {dt: run le plus récent}
    kept: dict[str, int] = {}
    for e in entries:
        path = e["Path"]
        if e.get("IsDir", False) or not path.endswith(".parquet"):
            continue
        m = _DT_RUN_RE.search(path)
        if m and keep.get(m.group(1)) == m.group(2):
            kept[f"{mart_subdir}/{path}"] = int(e["Size"])
    return kept


def parse_lsjson_entries(stdout: str) -> list[dict]:
    """Parse la sortie ``rclone lsjson`` (récursive) en liste d'entrées brutes."""
    return json.loads(stdout) if stdout.strip() else []


def parse_hashsum(stdout: str, prefix: str = "") -> dict[str, str]:
    """Parse ``rclone hashsum sha256 -R`` → ``{clé: sha256}`` (lignes ``<hash>  <chemin>``).

    ``prefix`` (ex. ``marts/university_timeline``) est préfixé aux chemins relatifs pour
    obtenir la **clé S3 absolue au bucket**, comparable à celle de ``latest_run_parts``.
    """
    result: dict[str, str] = {}
    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(maxsplit=1)
        if len(parts) != 2 or not _SHA256_RE.match(parts[0]):
            raise Failure(description=f"Ligne hashsum inattendue : « {line} »")
        digest, name = parts
        key = f"{prefix}/{name}" if prefix else name
        result[key] = digest
    return result


def build_manifest(
    sizes: dict[str, int],
    shas: dict[str, str],
    row_count: int,
    produced_at: str,
    mart_subdir: str = _MART_SUBDIR,
) -> dict:
    """Construit le dict manifest GLOBAL (pur). Cross-check les clés, trie les parts.

    ``sizes``/``shas`` sont indexés par **clé S3 absolue au bucket** (multi-partitions,
    dernier run par jour). Le manifest est servi à la racine du mart ; le consommateur
    lit chaque part par sa clé et valide ``sha256``/``bytes``.
    """
    if not sizes:
        raise Failure(description="Aucune part Parquet sous le mart : run incomplet ?")
    if set(sizes) != set(shas):
        raise Failure(
            description="Désaccord lsjson/hashsum sur les parts du mart",
            metadata={
                "lsjson": MetadataValue.text(", ".join(sorted(sizes))),
                "hashsum": MetadataValue.text(", ".join(sorted(shas))),
            },
        )
    parts = [{"key": key, "sha256": shas[key], "bytes": sizes[key]} for key in sorted(sizes)]
    return {
        "mart": mart_subdir,
        "schema_version": MANIFEST_SCHEMA_VERSION,
        "row_count": row_count,
        "parts": parts,
        "produced_at": produced_at,
    }


# ── Glue I/O (rclone + DuckDB) ───────────────────────────────────────────────


def _run_rclone(args: list[str], config_path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["rclone", "--config", str(config_path), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def _latest_sizes(root: str, config_path: Path) -> dict[str, int]:
    """Liste RÉCURSIVEMENT le mart, garde les parts du dernier run par jour (octets)."""
    proc = _run_rclone(["lsjson", "-R", "--include", "*.parquet", root], config_path)
    if proc.returncode != 0:
        raise Failure(
            description="rclone lsjson a échoué sur le mart",
            metadata={"stderr": MetadataValue.text(proc.stderr[-2000:])},
        )
    return latest_run_parts(parse_lsjson_entries(proc.stdout))


def _hashsum(root: str, config_path: Path, mart_subdir: str = _MART_SUBDIR) -> dict[str, str]:
    """Calcule le sha256 de toutes les parts du mart (récursif, clés absolues bucket)."""
    proc = _run_rclone(
        ["hashsum", "sha256", "--download", "-R", "--include", "*.parquet", root], config_path
    )
    if proc.returncode != 0:
        raise Failure(
            description="rclone hashsum a échoué sur le mart",
            metadata={"stderr": MetadataValue.text(proc.stderr[-2000:])},
        )
    return parse_hashsum(proc.stdout, prefix=mart_subdir)


def _count_rows(bucket: str, keys: list[str]) -> int:
    """Compte les lignes RÉELLES des parts retenues via DuckDB (exclut la ligne NULL).

    La matérialisation ``external`` de dbt-duckdb écrit une ligne à toutes colonnes
    nulles sur une relation VIDE (placeholder de schéma) ; sans ce filtre un mart vide
    donnerait des lignes fantômes — faux face au sha256 (contrat cassé). On ne lit que
    les parts du DERNIER run par jour (les mêmes que le manifest), pas les obsolètes.
    """
    if not keys:
        return 0
    con = lakehouse.connect()
    files = ", ".join(f"'s3://{bucket}/{k}'" for k in sorted(keys))
    return con.sql(
        f"SELECT count(*) FROM read_parquet([{files}]) WHERE NOT (COLUMNS(*) IS NULL)"
    ).fetchone()[0]


def _write_manifest_last(root: str, payload: str, config_path: Path) -> None:
    proc = subprocess.run(
        ["rclone", "--config", str(config_path), "rcat", f"{root}/manifest.json"],
        input=payload,
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise Failure(
            description="rclone rcat (manifest.json) a échoué",
            metadata={"stderr": MetadataValue.text(proc.stderr[-2000:])},
        )


def _build_and_write_manifest(
    context: AssetExecutionContext, mart_subdir: str, asset_name: str
) -> MaterializeResult:
    """Cœur partagé : écrit le ``manifest.json`` GLOBAL atomique d'un mart servi (dernier
    run/jour). Paramétré par ``mart_subdir`` pour servir le mart timeline (dbt) ET le mart
    de prévisions (asset Python, ADR 0081). Liste tout le mart, retient le dernier ``run=``
    de chaque jour (ADR 0064), recompose le contrat, écrit EN DERNIER (sentinelle, ADR 0029).
    """
    target = ceph_target_from_env()
    run_id = context.run_id

    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))

        root = mart_root("ceph", target.bucket, mart_subdir)
        lineage.emit(RunState.START, run_id, asset_name, [lineage.mart_dataset(mart_subdir)], [])
        proc = _run_rclone(["lsjson", "-R", "--include", "*.parquet", root], config_path)
        if proc.returncode != 0:
            raise Failure(
                description="rclone lsjson a échoué sur le mart",
                metadata={"stderr": MetadataValue.text(proc.stderr[-2000:])},
            )
        sizes = latest_run_parts(parse_lsjson_entries(proc.stdout), mart_subdir)
        all_shas = _hashsum(root, config_path, mart_subdir)
        # On ne garde que les sha des parts retenues (dernier run/jour) — les obsolètes
        # sont hachés par rclone mais EXCLUS du contrat.
        shas = {k: v for k, v in all_shas.items() if k in sizes}
        row_count = _count_rows(target.bucket, list(sizes))
        manifest = build_manifest(
            row_count=row_count,
            sizes=sizes,
            shas=shas,
            produced_at=datetime.now(timezone.utc).isoformat(),
            mart_subdir=mart_subdir,
        )
        payload = json.dumps(manifest, separators=(",", ":"))
        _write_manifest_last(root, payload, config_path)
        lineage.emit(
            RunState.COMPLETE,
            run_id,
            asset_name,
            [lineage.mart_dataset(mart_subdir)],
            [lineage.mart_dataset(f"{mart_subdir}/manifest")],
        )

    return MaterializeResult(
        metadata={
            "mart": MetadataValue.text(mart_subdir),
            "row_count": MetadataValue.int(row_count),
            "parts": MetadataValue.int(len(manifest["parts"])),
            "schema_version": MetadataValue.int(MANIFEST_SCHEMA_VERSION),
        }
    )


@asset(
    name="timeline_manifest",
    group_name="transform",
    deps=[AssetKey(["marts_university_timeline"])],
    partitions_def=gkg_daily_partitions,
)
def timeline_manifest(context: AssetExecutionContext) -> MaterializeResult:
    """``manifest.json`` GLOBAL atomique du mart timeline (dernier run/jour, ADR 0029).

    Partitionné par jour (pour s'enchaîner dans le transform_job partitionné), mais le
    manifest produit est GLOBAL : à chaque exécution il recouvre TOUT le mart."""
    return _build_and_write_manifest(context, _MART_SUBDIR, "timeline_manifest")


@asset(
    name="forecast_manifest",
    group_name="transform",
    deps=[AssetKey(["forecast_university_timeline"])],
    partitions_def=gkg_daily_partitions,
)
def forecast_manifest(context: AssetExecutionContext) -> MaterializeResult:
    """``manifest.json`` GLOBAL atomique du mart de PRÉVISIONS (ADR 0081). Même contrat
    que le mart timeline, sur ``marts/university_timeline_forecast/``."""
    return _build_and_write_manifest(context, _FORECAST_SUBDIR, "forecast_manifest")
