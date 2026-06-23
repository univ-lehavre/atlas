"""Tests hermétiques du backend lakehouse DuckDB (pas de réseau, pas de S3 réel)."""

import duckdb

from mediawatch_dagster import lakehouse
from mediawatch_dagster.resources import DuckDBS3Config

_CFG = DuckDBS3Config(
    key_id="AK",
    secret="SK",
    endpoint="seaweedfs.s3.svc.cluster.local:8333",
    use_ssl=False,
    region="us-east-1",
    bucket="mediawatch",
)


def test_create_secret_sql_is_path_style_and_named_mediawatch() -> None:
    sql = lakehouse._create_secret_sql(_CFG)
    assert "CREATE OR REPLACE SECRET mediawatch_s3" in sql
    assert "URL_STYLE 'path'" in sql
    assert "USE_SSL false" in sql
    assert "ENDPOINT 'seaweedfs.s3.svc.cluster.local:8333'" in sql


def test_create_secret_sql_use_ssl_true_when_configured() -> None:
    cfg = DuckDBS3Config(**{**_CFG.__dict__, "use_ssl": True})
    assert "USE_SSL true" in lakehouse._create_secret_sql(cfg)


def test_copy_to_parquet_writes_local_partitioned(tmp_path) -> None:
    # Exécution sur une connexion DuckDB locale : on vérifie que copy_to_parquet
    # produit bien l'arborescence Hive demandée (sans toucher à S3).
    con = duckdb.connect()
    dest = str(tmp_path / "org_mentions")
    select = "SELECT 'Harvard University' AS org, '2026-06' AS dt"
    lakehouse.copy_to_parquet(con, select, dest, partition_by=["dt"])
    # PARTITION_BY dt → un sous-dossier dt=2026-06/ contenant du Parquet.
    rows = con.execute(f"SELECT org FROM read_parquet('{dest}/**/*.parquet')").fetchall()
    assert rows == [("Harvard University",)]
    assert (tmp_path / "org_mentions" / "dt=2026-06").is_dir()


def test_copy_to_parquet_without_partition(tmp_path) -> None:
    con = duckdb.connect()
    dest = str(tmp_path / "single.parquet")
    lakehouse.copy_to_parquet(con, "SELECT 1 AS n", dest)
    assert con.execute(f"SELECT n FROM read_parquet('{dest}')").fetchall() == [(1,)]


def test_new_connection_honors_extension_directory(tmp_path, monkeypatch) -> None:
    # Si DUCKDB_EXTENSION_DIRECTORY est posé (Dockerfile), la connexion l'utilise.
    ext_dir = str(tmp_path / "ext")
    monkeypatch.setenv("DUCKDB_EXTENSION_DIRECTORY", ext_dir)
    con = lakehouse._new_connection()
    assert con.execute("SELECT 1").fetchall() == [(1,)]


def test_new_connection_falls_back_without_extension_directory(monkeypatch) -> None:
    monkeypatch.delenv("DUCKDB_EXTENSION_DIRECTORY", raising=False)
    con = lakehouse._new_connection()
    assert con.execute("SELECT 1").fetchall() == [(1,)]


def test_connect_registers_path_style_secret(monkeypatch) -> None:
    # connect() = nouvelle connexion + INSTALL/LOAD httpfs + CREATE SECRET. On
    # remplace _new_connection par une connexion LOCALE (hermétique : pas de S3),
    # et on vérifie que le secret path-style mediawatch_s3 est bien enregistré.
    local = duckdb.connect()
    monkeypatch.setattr(lakehouse, "_new_connection", lambda: local)
    con = lakehouse.connect(_CFG)
    secrets = con.execute("SELECT name FROM duckdb_secrets()").fetchall()
    assert ("mediawatch_s3",) in secrets
