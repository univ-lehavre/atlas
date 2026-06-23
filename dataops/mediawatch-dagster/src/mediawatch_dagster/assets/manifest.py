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

from mediawatch_dagster import lakehouse, lineage
from mediawatch_dagster.dbt import CURATED_DT
from mediawatch_dagster.resources import ceph_target_from_env, render_rclone_config

# Version du schéma du contrat manifest. SOURCE DE VÉRITÉ (Python) ; un bump
# incrémente cette valeur (le consommateur refuse l'inconnu).
MANIFEST_SCHEMA_VERSION = 1

# Sous-dossier « servi » du mart timeline (le modèle dbt marts_university_timeline
# écrit sous marts/university_timeline/ via la macro marts_location).
_MART_SUBDIR = "marts/university_timeline"
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


# ── Fonctions pures (testables sans I/O) ─────────────────────────────────────


def partition_str(dt: str, run_id: str) -> str:
    """Identifiant de partition du contrat : ``dt=YYYY-MM/run=<id>`` (ADR 0029)."""
    return f"dt={dt}/run={run_id}"


def mart_prefix(remote: str, bucket: str, dt: str, run_id: str) -> str:
    """Préfixe rclone de l'artefact servi : ``<remote>:<bucket>/<subdir>/dt=…/run=…``."""
    return f"{remote}:{bucket}/{_MART_SUBDIR}/{partition_str(dt, run_id)}"


def part_key(dt: str, run_id: str, name: str) -> str:
    """Clé S3 **relative au bucket** d'une part (résoluble en ``s3://<bucket>/<key>``)."""
    return f"{_MART_SUBDIR}/{partition_str(dt, run_id)}/{name}"


def parse_lsjson_sizes(stdout: str) -> dict[str, int]:
    """Parse la sortie ``rclone lsjson`` → ``{nom: octets}`` (champs ``Name``/``Size``)."""
    entries = json.loads(stdout) if stdout.strip() else []
    return {e["Name"]: int(e["Size"]) for e in entries if not e.get("IsDir", False)}


def parse_hashsum(stdout: str) -> dict[str, str]:
    """Parse ``rclone hashsum sha256`` → ``{nom: sha256}`` (lignes ``<hash>  <nom>``)."""
    result: dict[str, str] = {}
    for line in stdout.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(maxsplit=1)
        if len(parts) != 2 or not _SHA256_RE.match(parts[0]):
            raise Failure(description=f"Ligne hashsum inattendue : « {line} »")
        digest, name = parts
        result[name] = digest
    return result


def build_manifest(
    dt: str,
    run_id: str,
    row_count: int,
    sizes: dict[str, int],
    shas: dict[str, str],
    produced_at: str,
) -> dict:
    """Construit le dict manifest (pur). Cross-check les jeux de noms, trie les parts."""
    if not sizes:
        raise Failure(description="Aucune part Parquet sous le préfixe du mart : run incomplet ?")
    if set(sizes) != set(shas):
        raise Failure(
            description="Désaccord lsjson/hashsum sur les parts du mart",
            metadata={
                "lsjson": MetadataValue.text(", ".join(sorted(sizes))),
                "hashsum": MetadataValue.text(", ".join(sorted(shas))),
            },
        )
    parts = [
        {"key": part_key(dt, run_id, name), "sha256": shas[name], "bytes": sizes[name]}
        for name in sorted(sizes)
    ]
    return {
        "partition": partition_str(dt, run_id),
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


def _lsjson_sizes(prefix: str, config_path: Path) -> dict[str, int]:
    proc = _run_rclone(["lsjson", "--include", "*.parquet", prefix], config_path)
    if proc.returncode != 0:
        raise Failure(
            description="rclone lsjson a échoué sur le mart",
            metadata={"stderr": MetadataValue.text(proc.stderr[-2000:])},
        )
    return parse_lsjson_sizes(proc.stdout)


def _hashsum(prefix: str, config_path: Path) -> dict[str, str]:
    proc = _run_rclone(
        ["hashsum", "sha256", "--download", "--include", "*.parquet", prefix], config_path
    )
    if proc.returncode != 0:
        raise Failure(
            description="rclone hashsum a échoué sur le mart",
            metadata={"stderr": MetadataValue.text(proc.stderr[-2000:])},
        )
    return parse_hashsum(proc.stdout)


def _count_rows(bucket: str, dt: str, run_id: str) -> int:
    """Compte les lignes RÉELLES via DuckDB (exclut la ligne fantôme NULL de dbt-duckdb).

    La matérialisation ``external`` de dbt-duckdb écrit une ligne à toutes colonnes
    nulles sur une relation VIDE (placeholder de schéma) ; sans ce filtre un mart
    vide donnerait ``row_count = 1`` — faux face au sha256 des octets (contrat cassé).
    """
    con = lakehouse.connect()
    glob = f"s3://{bucket}/{_MART_SUBDIR}/{partition_str(dt, run_id)}/*.parquet"
    return con.sql(
        f"SELECT count(*) FROM read_parquet('{glob}') WHERE NOT (COLUMNS(*) IS NULL)"
    ).fetchone()[0]


def _write_manifest_last(prefix: str, payload: str, config_path: Path) -> None:
    proc = subprocess.run(
        ["rclone", "--config", str(config_path), "rcat", f"{prefix}/manifest.json"],
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


@asset(
    name="timeline_manifest",
    group_name="transform",
    deps=[AssetKey(["marts_university_timeline"])],
)
def timeline_manifest(context: AssetExecutionContext) -> MaterializeResult:
    """Écrit le ``manifest.json`` atomique du mart timeline (après le mart dbt, même run)."""
    target = ceph_target_from_env()
    dt = CURATED_DT
    run_id = context.run_id

    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))

        prefix = mart_prefix("ceph", target.bucket, dt, run_id)
        lineage.emit(
            RunState.START,
            run_id,
            "timeline_manifest",
            [lineage.mart_dataset(_MART_SUBDIR)],
            [],
        )
        sizes = _lsjson_sizes(prefix, config_path)
        shas = _hashsum(prefix, config_path)
        row_count = _count_rows(target.bucket, dt, run_id)
        manifest = build_manifest(
            dt=dt,
            run_id=run_id,
            row_count=row_count,
            sizes=sizes,
            shas=shas,
            produced_at=datetime.now(timezone.utc).isoformat(),
        )
        payload = json.dumps(manifest, separators=(",", ":"))
        _write_manifest_last(prefix, payload, config_path)
        lineage.emit(
            RunState.COMPLETE,
            run_id,
            "timeline_manifest",
            [lineage.mart_dataset(_MART_SUBDIR)],
            [lineage.mart_dataset(f"{_MART_SUBDIR}/manifest")],
        )

    return MaterializeResult(
        metadata={
            "partition": MetadataValue.text(manifest["partition"]),
            "row_count": MetadataValue.int(row_count),
            "parts": MetadataValue.int(len(manifest["parts"])),
            "schema_version": MetadataValue.int(MANIFEST_SCHEMA_VERSION),
        }
    )
