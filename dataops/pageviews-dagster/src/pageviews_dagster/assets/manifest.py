"""Asset de matérialisation du contrat : ``manifest.json`` atomique du mart de prévisions.

L'asset Python ``forecast_views`` **produit** le mart « servi » des prévisions de VUES
Wikipédia en Parquet sous
``s3://<bucket>/marts/views_forecast/dt=<month>/run=<id>/part.parquet`` (grain servi :
``university_id`` × fenêtre métier ``horizon_label`` ∈ {month_1, month_3, year_1},
ADR 0097). Cet asset écrit, **en dernier**, le ``manifest.json`` voisin — le **contrat
de transfert** que le consommateur (application) valide AVANT de lire : il vérifie
``row_count`` + le ``sha256`` de chaque part et refuse une ``schema_version`` inconnue
(ADR 0029).

**Atomicité (sentinelle de complétude).** Le manifest est l'**unique écriture** de cet
asset, faite par un seul ``rclone rcat`` (un PutObject S3, atomique : l'objet apparaît
entier ou pas du tout). Un run coupé avant cette écriture laisse les parts SANS manifest
→ le consommateur, qui liste le manifest d'abord, refuse de lire. Jamais de réécriture en
place : un rejeu est un nouveau ``run=<id>`` (immutabilité, ADR 0054/0057).

**Reproductibilité (ADR 0057).** Le ``sha256`` est calculé sur les **octets réels** des
parts (``rclone hashsum sha256 --download`` : S3 n'expose pas de sha256 côté serveur — le
``--download`` est OBLIGATOIRE, sinon « hash type not supported »). Seul ``produced_at``
(métadonnée, hors contrat de hachage) varie d'un run à l'autre.

**Manifest GLOBAL (dernier run par mois).** Le mart accumule une partition par mois
(``dt=<YYYY-MM>``) ; chaque re-matérialisation écrit un nouveau ``run=`` (immutabilité).
Le manifest servi recouvre TOUT le mart en ne retenant, par mois, que le **dernier
``run=``** (le plus récent — « dernier run gagne ») ; les runs obsolètes restent sur
disque (nettoyage par lifecycle S3, contrat infra).

NB : pas de ``from __future__ import annotations`` — Dagster introspecte les annotations à
l'exécution (leçon drift D9).
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

from pageviews_dagster import lakehouse, lineage
from pageviews_dagster.resources import ceph_target_from_env, render_rclone_config

# Version du schéma du contrat manifest. SOURCE DE VÉRITÉ (Python) ; un bump de schéma
# incrémente cette valeur (le consommateur refuse l'inconnu).
MANIFEST_SCHEMA_VERSION = 1

# Sous-dossier « servi » du mart de prévisions (contrat ADR 0029). L'asset Python
# forecast_views écrit sous marts/views_forecast/ (nommage NEUTRE : « views_forecast »,
# jamais « wikipedia »/« openalex » — ce sont les sources, ADR 0022/0035).
_FORECAST_SUBDIR = "marts/views_forecast"
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")

# Extrait (mois, run) d'un chemin de part servi : ``dt=<month>/run=<id>/``.
_DT_RUN_RE = re.compile(r"dt=([^/]+)/run=([^/]+)/")


# ── Fonctions pures (testables sans I/O) ─────────────────────────────────────


def mart_root(remote: str, bucket: str, mart_subdir: str = _FORECAST_SUBDIR) -> str:
    """Préfixe rclone RACINE d'un mart servi (toutes les partitions mensuelles)."""
    return f"{remote}:{bucket}/{mart_subdir}"


def latest_run_parts(entries: list[dict], mart_subdir: str = _FORECAST_SUBDIR) -> dict[str, int]:
    """Sélectionne, par mois (``dt=``), les parts du DERNIER ``run=`` (ADR 0054/0057).

    Le mart accumule une partition par mois ; chaque re-matérialisation écrit un nouveau
    ``run=`` (immutabilité). Pour le manifest GLOBAL servi, on ne retient que le **dernier
    run de chaque mois** (le plus complet) — « dernier run gagne ». Les runs obsolètes
    restent sur disque (nettoyage par lifecycle S3, contrat infra).

    ``entries`` = lsjson récursif (champs ``Path`` relatif + ``Size``, ``IsDir``).
    ``mart_subdir`` préfixe les clés → **clé S3 absolue au bucket**. Retourne
    ``{clé_absolue: octets}`` des seules parts retenues. « Dernier » = run
    lexicographiquement maximal par mois.
    """
    paths = [
        (e["Path"], int(e["Size"]))
        for e in entries
        if not e.get("IsDir", False) and e["Path"].endswith(".parquet")
    ]
    latest: dict[str, str] = {}
    for path, _ in paths:
        m = _DT_RUN_RE.search(path)
        if m and (m.group(1) not in latest or m.group(2) > latest[m.group(1)]):
            latest[m.group(1)] = m.group(2)
    kept: dict[str, int] = {}
    for path, size in paths:
        m = _DT_RUN_RE.search(path)
        if m and latest.get(m.group(1)) == m.group(2):
            kept[f"{mart_subdir}/{path}"] = size
    return kept


def parse_lsjson_entries(stdout: str) -> list[dict]:
    """Parse la sortie ``rclone lsjson`` (récursive) en liste d'entrées brutes."""
    return json.loads(stdout) if stdout.strip() else []


def parse_hashsum(stdout: str, prefix: str = "") -> dict[str, str]:
    """Parse ``rclone hashsum sha256 -R`` → ``{clé: sha256}`` (lignes ``<hash>  <chemin>``).

    ``prefix`` (ex. ``marts/views_forecast``) est préfixé aux chemins relatifs pour obtenir
    la **clé S3 absolue au bucket**, comparable à celle de ``latest_run_parts``.
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
    mart_subdir: str = _FORECAST_SUBDIR,
) -> dict:
    """Construit le dict manifest GLOBAL (pur). Cross-check les clés, trie les parts.

    Le contrat exige des ``parts`` déterministes : on trie par clé (la sortie hashsum est
    ordonnée par hash, pas par nom). On vérifie que ``lsjson`` et ``hashsum`` énumèrent
    EXACTEMENT les mêmes parts (sinon une part manque d'octets ou de hash → contrat
    invalide). ``sizes``/``shas`` sont indexés par **clé S3 absolue au bucket**
    (multi-partitions, dernier run par mois) ; le manifest est servi à la racine du mart et
    le consommateur lit chaque part par sa clé.
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
    """Lance ``rclone`` avec le fichier de config donné ; renvoie le process."""
    return subprocess.run(
        ["rclone", "--config", str(config_path), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def _hashsum(root: str, config_path: Path, mart_subdir: str = _FORECAST_SUBDIR) -> dict[str, str]:
    """Calcule le sha256 de toutes les parts du mart (récursif, clés absolues bucket).

    ``--download`` obligatoire : S3 n'expose pas de sha256 côté serveur.
    """
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

    La matérialisation ``external`` de dbt-duckdb écrit une ligne à toutes colonnes nulles
    sur une relation VIDE (placeholder de schéma) ; sans ce filtre un mart vide donnerait
    des lignes fantômes — faux face au sha256 (contrat cassé). Le filtre est agnostique
    (``COLUMNS(*) IS NULL`` couvre toute colonne). On ne lit que les parts du DERNIER run
    par mois (les mêmes que le manifest), pas les obsolètes.
    """
    if not keys:
        return 0
    con = lakehouse.connect()
    files = ", ".join(f"'s3://{bucket}/{k}'" for k in sorted(keys))
    return con.sql(
        f"SELECT count(*) FROM read_parquet([{files}]) WHERE NOT (COLUMNS(*) IS NULL)"
    ).fetchone()[0]


def _write_manifest_last(root: str, payload: str, config_path: Path) -> None:
    """Écrit ``manifest.json`` via un unique ``rclone rcat`` (PutObject atomique)."""
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
    context: AssetExecutionContext, mart_subdir: str, job_name: str
) -> MaterializeResult:
    """Cœur partagé : écrit le ``manifest.json`` GLOBAL atomique d'un mart servi (dernier
    run/mois).

    Liste tout le mart (``lsjson -R``), retient le dernier ``run=`` de chaque mois
    (immutabilité, ADR 0054/0057), calcule le sha256 des octets réels, compte les lignes
    RÉELLES (DuckDB), recompose le contrat, l'écrit EN DERNIER (sentinelle de complétude,
    ADR 0029), et émet le lineage. ``mart_subdir`` localise l'artefact ; ``job_name`` nomme
    le job (= nom d'asset) côté lineage.
    """
    target = ceph_target_from_env()
    run_id = context.run_id

    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))

        root = mart_root("ceph", target.bucket, mart_subdir)
        lineage.emit(RunState.START, run_id, job_name, [lineage.mart_dataset(mart_subdir)], [])
        proc = _run_rclone(["lsjson", "-R", "--include", "*.parquet", root], config_path)
        if proc.returncode != 0:
            raise Failure(
                description="rclone lsjson a échoué sur le mart",
                metadata={"stderr": MetadataValue.text(proc.stderr[-2000:])},
            )
        sizes = latest_run_parts(parse_lsjson_entries(proc.stdout), mart_subdir)
        all_shas = _hashsum(root, config_path, mart_subdir)
        # On ne garde que les sha des parts retenues (dernier run/mois) — les obsolètes
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
        # Écriture EN DERNIER (sentinelle de complétude), JSON compact sans newline.
        payload = json.dumps(manifest, separators=(",", ":"))
        _write_manifest_last(root, payload, config_path)
        lineage.emit(
            RunState.COMPLETE,
            run_id,
            job_name,
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
    name="forecast_manifest",
    group_name="transform",
    deps=[AssetKey(["forecast_views"])],
)
def forecast_manifest(context: AssetExecutionContext) -> MaterializeResult:
    """``manifest.json`` GLOBAL atomique du mart de PRÉVISIONS (ADR 0029/0097).

    Écrit après l'asset ``forecast_views`` (même run) sous ``marts/views_forecast/`` : à
    chaque exécution il recouvre TOUT le mart (dernier run/mois), sentinelle de complétude.
    """
    return _build_and_write_manifest(context, _FORECAST_SUBDIR, "forecast_manifest")
