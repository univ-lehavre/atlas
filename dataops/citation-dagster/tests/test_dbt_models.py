"""Smoke hermétique des modèles dbt staging → curated → marts (étapes 3.2/3.3, ADR 0057).

« Preuve de mécanique » : lance un VRAI `dbt build` contre le MinIO épinglé chargé
des fixtures synthétiques, puis relit le Parquet écrit sur S3 et vérifie :
  - `curated_edges` = exactement les 3 arêtes golden (W101→W201, W102→W201, W202→W101) ;
  - `marts_collab_pairs` (3.3) = la paire (Alice, Bob) avec cross_citations=3, a_to_b=2,
    b_to_a=1 (GOLDEN.md) ;
  - déterminisme : un 2ᵉ run (run=<id> distinct) produit un contenu canonique identique
    (sha256 des lignes triées — PAS des octets Parquet, que DuckDB ne garantit pas
    bit-à-bit) et n'écrase pas la partition du 1ᵉʳ run (immutabilité).

S'auto-saute si Docker (donc MinIO) est absent : hors chemin de test par défaut sans
Docker, comme les autres tests d'intégration du dépôt.
"""

import hashlib
import json
import os
import subprocess
from pathlib import Path

import duckdb

from citation_dagster import lakehouse
from citation_dagster.resources import DuckDBS3Config
from tests.conftest import load_raw_fixtures

_DBT_PROJECT = Path(__file__).resolve().parents[2] / "citation-dbt"

# Arêtes attendues (GOLDEN.md) — ids OpenAlex complets, dédupliqués.
_GOLDEN_EDGES = {
    ("https://openalex.org/W101", "https://openalex.org/W201"),
    ("https://openalex.org/W102", "https://openalex.org/W201"),
    ("https://openalex.org/W202", "https://openalex.org/W101"),
}

# Citations croisées attendues (GOLDEN.md) pour la paire (Alice, Bob), canonique
# author_a < author_b : A1000000001 < A1000000002 → a_to_b = Alice→Bob = 2,
# b_to_a = Bob→Alice = 1, cross_citations = 3.
_ALICE = "https://openalex.org/A1000000001"
_BOB = "https://openalex.org/A1000000002"
_GOLDEN_PAIR = (_ALICE, _BOB, 3, 2, 1)  # author_a, author_b, cross, a_to_b, b_to_a


def _dbt_build(minio, curated_run: str) -> subprocess.CompletedProcess:
    """Lance `dbt build` (staging+curated+tests) contre MinIO, pour un run donné."""
    env = {
        **os.environ,
        "AWS_ACCESS_KEY_ID": minio.access_key,
        "AWS_SECRET_ACCESS_KEY": minio.secret_key,
        "BUCKET_HOST": minio.endpoint.split(":")[0],
        "BUCKET_PORT": minio.endpoint.split(":")[1],
        "DBT_S3_USE_SSL": "false",
    }
    dbt_vars = {
        "raw_root": f"s3://{minio.bucket}/raw",
        "curated_root": f"s3://{minio.bucket}/curated",
        "curated_dt": "2020-01",
        "curated_run": curated_run,
    }
    return subprocess.run(
        [
            "uv",
            "run",
            "dbt",
            "build",
            "--project-dir",
            os.fspath(_DBT_PROJECT),
            "--profiles-dir",
            os.fspath(_DBT_PROJECT),
            "--target",
            "dev",
            "--vars",
            json.dumps(dbt_vars),
        ],
        cwd=os.fspath(_DBT_PROJECT.parent / "citation-dagster"),
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def _read_edges(con: duckdb.DuckDBPyConnection, bucket: str, run: str) -> list[tuple]:
    glob = f"s3://{bucket}/curated/curated_edges/dt=2020-01/run={run}/*.parquet"
    return con.sql(
        f"SELECT citing_work_id, cited_work_id FROM read_parquet('{glob}') "
        "ORDER BY citing_work_id, cited_work_id"
    ).fetchall()


def _canonical_sha256(rows: list[tuple]) -> str:
    payload = "\n".join(f"{a}>{b}" for a, b in rows)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _read_collab_pairs(con: duckdb.DuckDBPyConnection, bucket: str, run: str) -> list[tuple]:
    glob = f"s3://{bucket}/curated/marts_collab_pairs/dt=2020-01/run={run}/*.parquet"
    return con.sql(
        f"SELECT author_a, author_b, cross_citations, a_to_b, b_to_a "
        f"FROM read_parquet('{glob}') ORDER BY author_a, author_b"
    ).fetchall()


def test_dbt_build_curated_edges_golden_and_deterministic(minio):
    """dbt build réel → curated_edges golden (3 arêtes) + déterminisme + immutabilité."""
    load_raw_fixtures(minio)

    # ── Run 1 ────────────────────────────────────────────────────────────────
    r1 = _dbt_build(minio, curated_run="smoke1")
    assert r1.returncode == 0, f"dbt build (run 1) a échoué :\n{r1.stdout}\n{r1.stderr}"

    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    con = lakehouse.connect(cfg)

    edges1 = _read_edges(con, minio.bucket, "smoke1")
    assert len(edges1) == 3, f"attendu 3 arêtes golden, obtenu {len(edges1)} : {edges1}"
    assert set(edges1) == _GOLDEN_EDGES

    # Les autres modèles curated sont bien matérialisés (works/authors/authorships).
    works_n = con.sql(
        f"SELECT count(*) FROM read_parquet("
        f"'s3://{minio.bucket}/curated/curated_works/dt=2020-01/run=smoke1/*.parquet')"
    ).fetchone()[0]
    assert works_n == 4  # W101, W102, W201, W202

    # ── Run 2 (id distinct) : déterminisme + immutabilité ────────────────────
    r2 = _dbt_build(minio, curated_run="smoke2")
    assert r2.returncode == 0, f"dbt build (run 2) a échoué :\n{r2.stdout}\n{r2.stderr}"

    edges2 = _read_edges(con, minio.bucket, "smoke2")
    # Même contenu canonique (déterminisme au niveau ligne/ordre, ADR 0057).
    assert _canonical_sha256(edges1) == _canonical_sha256(edges2)
    # La partition du run 1 n'a pas été écrasée (immutabilité : préfixes distincts).
    assert _read_edges(con, minio.bucket, "smoke1") == edges1


def test_dbt_build_marts_collab_pairs_golden(minio):
    """dbt build réel → marts_collab_pairs : la paire (Alice, Bob) a les valeurs golden."""
    load_raw_fixtures(minio)
    r = _dbt_build(minio, curated_run="smoke3")
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"

    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    con = lakehouse.connect(cfg)

    pairs = _read_collab_pairs(con, minio.bucket, "smoke3")
    # Une seule paire dans les fixtures : (Alice, Bob), valeurs exactes (GOLDEN.md).
    assert len(pairs) == 1, f"attendu 1 paire golden, obtenu {len(pairs)} : {pairs}"
    assert pairs[0] == _GOLDEN_PAIR
    # cross_citations est bien la somme des deux sens.
    _a, _b, cross, a_to_b, b_to_a = pairs[0]
    assert cross == a_to_b + b_to_a
