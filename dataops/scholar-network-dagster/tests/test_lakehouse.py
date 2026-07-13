"""Tests du backend lakehouse DuckDB↔S3 : construction SQL, sans I/O réseau.

On n'exécute PAS de vraie requête DuckDB (INSTALL httpfs exige le réseau) : on injecte une
connexion FACTICE qui enregistre le SQL, pour couvrir la logique de câblage (secret S3,
ATTACH postgres, lecture/écriture Parquet) de façon hermétique.
"""

import duckdb

from scholar_network_dagster import lakehouse
from scholar_network_dagster.lakehouse import _create_secret_sql
from scholar_network_dagster.resources import DuckDBS3Config, PostgresTarget

_CFG = DuckDBS3Config(
    key_id="k",
    secret="s",
    endpoint="rook-ceph-rgw-datalake.rook-ceph:80",
    use_ssl=False,
    region="us-east-1",
    bucket="scholar-network-datalake",
)


class _FakeConn:
    """Connexion DuckDB factice : enregistre chaque SQL exécuté (execute/sql)."""

    def __init__(self):
        self.executed: list[str] = []

    def execute(self, sql):
        self.executed.append(sql)
        return self

    def sql(self, sql):
        self.executed.append(sql)
        return f"REL({sql})"


def test_create_secret_sql_is_path_style_named_scholar_network():
    sql = _create_secret_sql(_CFG)
    assert "CREATE OR REPLACE SECRET scholar_network_s3" in sql  # nom neutre, pas citation
    assert "URL_STYLE 'path'" in sql
    assert "USE_SSL false" in sql  # http → pas de SSL


def test_create_secret_sql_ssl_true_when_use_ssl():
    cfg = DuckDBS3Config("k", "s", "rgw:443", True, "us-east-1", "b")
    assert "USE_SSL true" in _create_secret_sql(cfg)


def test_connect_configures_secret_and_spilling(monkeypatch):
    fake = _FakeConn()
    monkeypatch.setattr(duckdb, "connect", lambda *a, **k: fake)
    monkeypatch.delenv("DUCKDB_EXTENSION_DIRECTORY", raising=False)
    con = lakehouse.connect(_CFG)
    assert con is fake
    joined = "\n".join(fake.executed)
    assert "INSTALL httpfs; LOAD httpfs;" in joined
    assert "temp_directory=" in joined  # spilling activé
    assert "CREATE OR REPLACE SECRET scholar_network_s3" in joined


def test_connect_uses_extension_directory_when_set(monkeypatch):
    captured = {}

    def _fake_connect(*a, **k):
        captured["config"] = k.get("config")
        return _FakeConn()

    monkeypatch.setattr(duckdb, "connect", _fake_connect)
    monkeypatch.setenv("DUCKDB_EXTENSION_DIRECTORY", "/opt/duckdb-ext")
    lakehouse.connect(_CFG)
    assert captured["config"] == {"extension_directory": "/opt/duckdb-ext"}


def test_attach_postgres_builds_dsn_without_leaking_password():
    fake = _FakeConn()
    target = PostgresTarget("pg-rw.postgres", "5432", "pgvector", "u", "secret-pw")
    lakehouse.attach_postgres(fake, target, alias="pg")
    joined = "\n".join(fake.executed)
    assert "INSTALL postgres; LOAD postgres;" in joined
    assert "ATTACH 'host=pg-rw.postgres" in joined
    assert "TYPE postgres" in joined


def test_postgres_execute_wraps_in_dollar_quotes():
    fake = _FakeConn()
    lakehouse.postgres_execute(fake, "SELECT 1", alias="pg")
    assert "CALL postgres_execute('pg', $PG$SELECT 1$PG$)" in fake.executed


def test_read_parquet_and_footer_build_glob_sql():
    fake = _FakeConn()
    lakehouse.read_parquet(fake, "s3://scholar-network/prefiltered/works/**/*.parquet")
    lakehouse.read_parquet_footer(fake, "s3://scholar-network/raw/works/**/*.parquet")
    joined = "\n".join(fake.executed)
    assert "read_parquet('s3://scholar-network/prefiltered/works/**/*.parquet')" in joined
    assert "parquet_file_metadata('s3://scholar-network/raw/works/**/*.parquet')" in joined


def test_copy_to_parquet_partitioned_and_plain():
    fake = _FakeConn()
    lakehouse.copy_to_parquet(fake, "SELECT 1", "s3://scholar-network/out", partition_by=["dt"])
    lakehouse.copy_to_parquet(fake, "SELECT 2", "s3://scholar-network/out2")
    joined = "\n".join(fake.executed)
    assert "PARTITION_BY (dt)" in joined
    assert "OVERWRITE_OR_IGNORE" in joined
    # Sans partition_by : pas de clause PARTITION_BY sur le 2e COPY.
    assert "COPY (SELECT 2) TO 's3://scholar-network/out2' (FORMAT PARQUET)" in joined
