"""Tests du chargement pgvector (index_load.py, ADR 0103 §2, lot 5c).

- ``profile_insert_sql`` : pur (littéral ::vector, échappement).
- Chargement de bout en bout : Parquet profils dans MinIO + Postgres/pgvector conteneurisé
  (schéma migré) → l'asset charge, idempotent par partition. Self-skip sans Docker.
"""

import duckdb
from dagster import build_asset_context

from scholar_network_dagster.assets.index_load import index_load, profile_insert_sql
from scholar_network_dagster.assets.profiles import PROFILES_SUBDIR
from scholar_network_dagster.resources import DuckDBS3Config


def test_profile_insert_sql_builds_vector_literal():
    """L'INSERT porte un littéral '[...]'::vector et échappe le researcher_id."""
    sql = profile_insert_sql("https://openalex.org/A5023888391", [0.1, 0.2], "2026-07", "run1")
    assert "INSERT INTO scholar_profiles (researcher_id, embedding, dt, run)" in sql
    assert "'[0.1,0.2]'::vector" in sql
    assert "A5023888391" in sql


def test_profile_insert_sql_escapes_quotes():
    """Une quote dans l'id est échappée (doublée) — pas d'injection."""
    sql = profile_insert_sql("a'b", [1.0], "2026-07", "r")
    assert "'a''b'" in sql


def _duckdb_cfg(minio) -> DuckDBS3Config:
    return DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )


def _seed_profiles(con, bucket: str, run_id: str) -> None:
    """Écrit un Parquet profils synthétique (2 chercheurs × vecteur 3-dim padded à 384)."""
    dest = f"s3://{bucket}/{PROFILES_SUBDIR}/run={run_id}/part-00000.parquet"
    # Vecteurs 384-dim (l'index attend vector(384)) : on remplit les 2 premières composantes.
    v1 = "[" + ",".join(["1.0", "0.0"] + ["0.0"] * 382) + "]"
    v2 = "[" + ",".join(["0.0", "1.0"] + ["0.0"] * 382) + "]"
    con.execute(
        f"""
        COPY (SELECT * FROM (VALUES
            ('A1', {v1}::FLOAT[]),
            ('A2', {v2}::FLOAT[])
        ) AS t(researcher_id, embedding))
        TO '{dest}' (FORMAT PARQUET)
        """
    )


def _pg_count(pg, where: str = "") -> int:
    """Compte les lignes de scholar_profiles via psql dans le conteneur."""
    import subprocess

    r = subprocess.run(
        [
            "docker",
            "exec",
            f"scholar-network-pgvector-test-{pg.port}",
            "psql",
            "-U",
            pg.user,
            "-d",
            pg.dbname,
            "-t",
            "-A",
            "-c",
            f"SELECT count(*) FROM scholar_profiles {where}",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return int(r.stdout.strip())


def test_index_load_loads_profiles_into_pgvector(minio, pgvector, monkeypatch):
    """L'asset charge les profils dans pgvector (schéma réel migré), idempotent par partition."""
    host, port = minio.endpoint.split(":")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", minio.access_key)
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", minio.secret_key)
    monkeypatch.setenv("BUCKET_HOST", host)
    monkeypatch.setenv("BUCKET_PORT", port)
    monkeypatch.setenv("BUCKET_NAME", minio.bucket)
    monkeypatch.setenv("DBT_DUCKDB_MEMORY_LIMIT", "2GB")
    monkeypatch.setenv("DBT_DUCKDB_THREADS", "2")
    monkeypatch.setenv("DBT_DUCKDB_TEMP_DIR", "/tmp/scholar-network-spill")

    monkeypatch.setenv("SCHOLAR_NETWORK_DT", "2026-07")

    seed = duckdb.connect()
    seed.execute("INSTALL httpfs; LOAD httpfs;")
    seed.execute(
        f"CREATE OR REPLACE SECRET s (TYPE S3, KEY_ID '{minio.access_key}', "
        f"SECRET '{minio.secret_key}', REGION 'us-east-1', ENDPOINT '{minio.endpoint}', "
        f"URL_STYLE 'path', USE_SSL false)"
    )

    ctx = build_asset_context()
    # build_asset_context fabrique un run_id ; on aligne le Parquet des profils dessus.
    _seed_profiles(seed, minio.bucket, ctx.run_id)

    result = index_load(ctx)
    assert result.metadata["loaded_profiles"].value == 2
    assert _pg_count(pgvector) == 2

    # Idempotence : re-charger le MÊME run réécrit sa partition sans doublon.
    index_load(ctx)
    assert _pg_count(pgvector) == 2
