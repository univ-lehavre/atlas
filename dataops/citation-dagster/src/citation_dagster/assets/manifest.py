"""Asset de matérialisation du contrat : ``manifest.json`` atomique du mart collab (étape 3.4).

dbt **produit** le mart « servi » en Parquet sous
``s3://<bucket>/marts/collab/dt=<dt>/run=<id>/part.parquet`` (modèle
``marts_collab_pairs``, matérialisation ``external``). Cet asset écrit, **en dernier**,
le ``manifest.json`` voisin — le **contrat de transfert** que le consommateur (étape 3.6,
TypeScript) valide AVANT de lire : il vérifie ``row_count`` + le ``sha256`` de chaque
part et refuse une ``schema_version`` inconnue (ADR 0029).

**Atomicité (sentinelle de complétude).** Le manifest est l'**unique écriture** de cet
asset, faite par un seul ``rclone rcat`` (un PutObject S3, atomique : l'objet apparaît
entier ou pas du tout). Un run coupé avant cette écriture laisse les parts SANS manifest →
le consommateur, qui liste le manifest d'abord, refuse de lire. Jamais de réécriture en
place : un rejeu est un nouveau ``run=<id>`` (immutabilité, ADR 0054).

**Reproductibilité (ADR 0057).** Le ``sha256`` est calculé sur les **octets réels** des
parts (``rclone hashsum sha256 --download`` : S3 n'expose pas de sha256 côté serveur — le
``--download`` est OBLIGATOIRE, sinon « hash type not supported »). Pour un même brut, les
parts sont identiques → ``parts[]`` est reproductible ; seul ``produced_at`` (métadonnée,
hors contrat de hachage) varie.

NB : pas de ``from __future__ import annotations`` — Dagster introspecte les annotations à
l'exécution (drift D9).
"""

import json
import os
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
from openlineage.client import OpenLineageClient
from openlineage.client.event_v2 import Dataset, Job, Run, RunEvent, RunState

from citation_dagster import lakehouse
from citation_dagster.dbt import CURATED_DT
from citation_dagster.resources import ceph_target_from_env, render_rclone_config

# Version du schéma du contrat manifest. SOURCE DE VÉRITÉ (Python) pour l'étape 3.4 ;
# l'étape 3.6 ajoutera la constante miroir (TypeScript) dans citation-types + le
# validateur. Un bump de schéma incrémente cette valeur (le consommateur refuse l'inconnu).
MANIFEST_SCHEMA_VERSION = 1

# Sous-dossier « servi » du mart de collaborations (contrat ADR 0029) ; le modèle dbt
# s'appelle marts_collab_pairs mais écrit sous marts/collab/ (macro marts_location).
_MART_SUBDIR = "marts/collab"
_PRODUCER = "https://github.com/univ-lehavre/atlas/dataops/citation-dagster"
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


# ── Fonctions pures (testables sans I/O) ─────────────────────────────────────


def partition_str(dt: str, run_id: str) -> str:
    """Identifiant de partition du contrat : ``dt=YYYY-MM/run=<id>`` (ADR 0029)."""
    return f"dt={dt}/run={run_id}"


def mart_prefix(
    remote: str, bucket: str, dt: str, run_id: str, mart_subdir: str = _MART_SUBDIR
) -> str:
    """Préfixe rclone d'un artefact servi : ``<remote>:<bucket>/<mart_subdir>/dt=…/run=…``.

    ``mart_subdir`` par défaut ``marts/collab`` (rétro-compat) ; les autres artefacts
    passent ``marts/researchers``, ``marts/researcher_vectors``, ``curated/curated_work_vectors``.
    """
    return f"{remote}:{bucket}/{mart_subdir}/{partition_str(dt, run_id)}"


def part_key(dt: str, run_id: str, name: str, mart_subdir: str = _MART_SUBDIR) -> str:
    """Clé S3 **relative au bucket** d'une part (résoluble en ``s3://<bucket>/<key>``)."""
    return f"{mart_subdir}/{partition_str(dt, run_id)}/{name}"


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
    mart_subdir: str = _MART_SUBDIR,
) -> dict:
    """Construit le dict manifest (pur). Cross-check les jeux de noms, trie les parts.

    Le contrat exige des ``parts`` déterministes : on trie par clé (la sortie hashsum est
    ordonnée par hash, pas par nom). On vérifie que ``lsjson`` et ``hashsum`` énumèrent
    EXACTEMENT les mêmes parts (sinon une part manque d'octets ou de hash → contrat invalide).
    """
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
        {"key": part_key(dt, run_id, name, mart_subdir), "sha256": shas[name], "bytes": sizes[name]}
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
    """Lance ``rclone`` avec le fichier de config donné ; renvoie le process."""
    return subprocess.run(
        ["rclone", "--config", str(config_path), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def _lsjson_sizes(prefix: str, config_path: Path) -> dict[str, int]:
    """Liste les parts Parquet du préfixe et leurs tailles (octets)."""
    proc = _run_rclone(["lsjson", "--include", "*.parquet", prefix], config_path)
    if proc.returncode != 0:
        raise Failure(
            description="rclone lsjson a échoué sur le mart",
            metadata={"stderr": MetadataValue.text(proc.stderr[-2000:])},
        )
    return parse_lsjson_sizes(proc.stdout)


def _hashsum(prefix: str, config_path: Path) -> dict[str, str]:
    """Calcule le sha256 de chaque part Parquet (``--download`` obligatoire sur S3)."""
    proc = _run_rclone(
        ["hashsum", "sha256", "--download", "--include", "*.parquet", prefix], config_path
    )
    if proc.returncode != 0:
        raise Failure(
            description="rclone hashsum a échoué sur le mart",
            metadata={"stderr": MetadataValue.text(proc.stderr[-2000:])},
        )
    return parse_hashsum(proc.stdout)


def _count_rows(bucket: str, dt: str, run_id: str, mart_subdir: str = _MART_SUBDIR) -> int:
    """Compte les lignes RÉELLES de l'artefact via DuckDB (Parquet du glob de la partition).

    Exclut la ligne fantôme à TOUTES colonnes nulles que la matérialisation ``external``
    de dbt-duckdb écrit sur une relation VIDE (placeholder de schéma). Sans ce filtre,
    un mart légitimement vide donnerait ``row_count = 1`` — un compte faux qui, confronté
    au sha256 des octets par un consommateur, casserait le contrat du manifest. Le filtre
    est agnostique du mart (``COLUMNS(*) IS NULL`` couvre toute colonne) : un mart non vide
    n'a aucune ligne entièrement nulle, donc le compte est inchangé pour les cas réels.
    """
    con = lakehouse.connect()
    glob = f"s3://{bucket}/{mart_subdir}/{partition_str(dt, run_id)}/*.parquet"
    return con.sql(
        f"SELECT count(*) FROM read_parquet('{glob}') WHERE NOT (COLUMNS(*) IS NULL)"
    ).fetchone()[0]


def _write_manifest_last(prefix: str, payload: str, config_path: Path) -> None:
    """Écrit ``manifest.json`` via un unique ``rclone rcat`` (PutObject atomique)."""
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


def _emit_lineage(state: RunState, run_id: str, mart_subdir: str, job_name: str) -> None:
    """Émet un événement OpenLineage vers Marquez (no-op si OPENLINEAGE_URL absent).

    Relie l'artefact servi (``<mart_subdir>``) à son manifest (``<mart_subdir>/manifest``)
    sous le job ``<job_name>``. Noms purement techniques (jamais de PII, invariant RGPD).
    """
    if not os.environ.get("OPENLINEAGE_URL"):
        return
    namespace = os.environ.get("OPENLINEAGE_NAMESPACE", "dagster")  # pragma: no cover
    client = OpenLineageClient.from_environment()  # pragma: no cover
    client.emit(  # pragma: no cover
        RunEvent(
            eventType=state,
            eventTime=datetime.now(timezone.utc).isoformat(),
            run=Run(runId=run_id),
            job=Job(namespace=namespace, name=job_name),
            producer=_PRODUCER,
            inputs=[Dataset(namespace="citation", name=mart_subdir)],
            outputs=[Dataset(namespace="citation", name=f"{mart_subdir}/manifest")],
        )
    )


def _build_and_write_manifest(
    context: AssetExecutionContext, mart_subdir: str, job_name: str
) -> MaterializeResult:
    """Écrit le ``manifest.json`` atomique d'un artefact servi (glue I/O paramétrée).

    Cœur partagé par tous les manifests (collab + researchers + vecteurs) : énumère les
    parts (lsjson + hashsum), compte les lignes, construit le contrat, l'écrit EN DERNIER
    (sentinelle atomique), et émet le lineage. ``mart_subdir`` localise l'artefact ;
    ``job_name`` nomme le job (= nom d'asset) côté lineage. ``run_id = context.run_id``
    aligne la partition sur l'asset amont (même run → même préfixe dt=…/run=…).
    """
    target = ceph_target_from_env()
    dt = CURATED_DT
    run_id = context.run_id

    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))

        prefix = mart_prefix("ceph", target.bucket, dt, run_id, mart_subdir)
        _emit_lineage(RunState.START, run_id, mart_subdir, job_name)
        sizes = _lsjson_sizes(prefix, config_path)
        shas = _hashsum(prefix, config_path)
        row_count = _count_rows(target.bucket, dt, run_id, mart_subdir)
        manifest = build_manifest(
            dt=dt,
            run_id=run_id,
            row_count=row_count,
            sizes=sizes,
            shas=shas,
            produced_at=datetime.now(timezone.utc).isoformat(),
            mart_subdir=mart_subdir,
        )
        # Écriture EN DERNIER (sentinelle de complétude), JSON compact sans newline.
        payload = json.dumps(manifest, separators=(",", ":"))
        _write_manifest_last(prefix, payload, config_path)
        _emit_lineage(RunState.COMPLETE, run_id, mart_subdir, job_name)

    return MaterializeResult(
        metadata={
            "partition": MetadataValue.text(manifest["partition"]),
            "row_count": MetadataValue.int(row_count),
            "parts": MetadataValue.int(len(manifest["parts"])),
            "schema_version": MetadataValue.int(MANIFEST_SCHEMA_VERSION),
        }
    )


@asset(name="collab_manifest", group_name="transform", deps=[AssetKey(["marts_collab_pairs"])])
def collab_manifest(context: AssetExecutionContext) -> MaterializeResult:
    """Écrit le ``manifest.json`` atomique du mart collab (après le mart dbt, même run)."""
    return _build_and_write_manifest(context, _MART_SUBDIR, "collab_manifest")


# Artefacts servis du producteur researchers (lot 4). Chaque artefact Parquet a son
# manifest.json VOISIN (contrat ADR 0029 : le consommateur lit le manifest à côté du
# Parquet qu'il va lire). Trois artefacts contractualisés :
#   - marts/researchers          : mart lexical dbt (grain author_id,kind,label_id) ;
#   - marts/researcher_vectors   : agrégat vecteur par author_id (asset Python) ;
#   - curated/curated_work_vectors : provenance vecteur par publication (re-poolable,
#     socle de la purge lot 5) — contractualisée comme un artefact servi (décision projet).
_RESEARCHERS_SUBDIR = "marts/researchers"
_RESEARCHERS_FTS_SUBDIR = "marts/researchers_fts"
_RESEARCHER_VECTORS_SUBDIR = "marts/researcher_vectors"
_WORK_VECTORS_SUBDIR = "curated/curated_work_vectors"


@asset(name="researchers_manifest", group_name="transform", deps=[AssetKey(["marts_researchers"])])
def researchers_manifest(context: AssetExecutionContext) -> MaterializeResult:
    """Manifest atomique du mart lexical researchers (après le mart dbt, même run)."""
    return _build_and_write_manifest(context, _RESEARCHERS_SUBDIR, "researchers_manifest")


@asset(
    name="researchers_fts_manifest",
    group_name="transform",
    deps=[AssetKey(["marts_researchers_fts"])],
)
def researchers_fts_manifest(context: AssetExecutionContext) -> MaterializeResult:
    """Manifest atomique du document FTS par chercheur (source d'index_load, étape 4)."""
    return _build_and_write_manifest(context, _RESEARCHERS_FTS_SUBDIR, "researchers_fts_manifest")


@asset(
    name="researcher_vectors_manifest",
    group_name="transform",
    deps=[AssetKey(["researcher_embeddings"])],
)
def researcher_vectors_manifest(context: AssetExecutionContext) -> MaterializeResult:
    """Manifest atomique de l'agrégat vecteur par author_id (après l'asset Python, même run)."""
    return _build_and_write_manifest(
        context, _RESEARCHER_VECTORS_SUBDIR, "researcher_vectors_manifest"
    )


@asset(
    name="work_vectors_manifest",
    group_name="transform",
    deps=[AssetKey(["researcher_embeddings"])],
)
def work_vectors_manifest(context: AssetExecutionContext) -> MaterializeResult:
    """Manifest atomique de la provenance vecteur par publication (curated_work_vectors)."""
    return _build_and_write_manifest(context, _WORK_VECTORS_SUBDIR, "work_vectors_manifest")
