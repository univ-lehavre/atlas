"""Tests hermétiques du backend lakehouse DuckDB (pas de réseau, pas de S3 réel).

On exerce le SQL PUR (``_create_secret_sql`` — secret path-style ``pageviews_s3``) et
la glue I/O DuckDB sur une connexion LOCALE : ``copy_to_parquet`` écrit bien
l'arborescence Hive attendue, ``read_parquet`` relit, et ``connect`` enregistre le
secret. Aucun accès S3 n'est requis (secret enregistré ≠ requête S3).
"""

import duckdb

from pageviews_dagster import lakehouse
from pageviews_dagster.resources import DuckDBS3Config

_CFG = DuckDBS3Config(
    key_id="AK",
    secret="SK",
    endpoint="seaweedfs.s3.svc.cluster.local:8333",
    use_ssl=False,
    region="us-east-1",
    bucket="pageviews",
)


# ── _create_secret_sql (pur) ─────────────────────────────────────────────────


def test_create_secret_sql_is_path_style_and_named_pageviews() -> None:
    # Secret DÉDIÉ à la code-location (nom neutre `pageviews_s3`, ADR 0022) et
    # path-style (RGW/SeaweedFS l'imposent), USE_SSL/ENDPOINT reflètent la config.
    sql = lakehouse._create_secret_sql(_CFG)
    assert "CREATE OR REPLACE SECRET pageviews_s3" in sql
    assert "TYPE S3" in sql
    assert "URL_STYLE 'path'" in sql
    assert "USE_SSL false" in sql
    assert "ENDPOINT 'seaweedfs.s3.svc.cluster.local:8333'" in sql
    assert "KEY_ID 'AK'" in sql
    assert "SECRET 'SK'" in sql
    assert "REGION 'us-east-1'" in sql


def test_create_secret_sql_use_ssl_true_when_configured() -> None:
    # En prod (RGW en https) : USE_SSL true. Le drapeau suit la config, pas un défaut.
    cfg = DuckDBS3Config(**{**_CFG.__dict__, "use_ssl": True})
    assert "USE_SSL true" in lakehouse._create_secret_sql(cfg)


# ── _new_connection (répertoire d'extensions cuites) ─────────────────────────


def test_new_connection_honors_extension_directory(tmp_path, monkeypatch) -> None:
    # Si DUCKDB_EXTENSION_DIRECTORY est posé (Dockerfile), la connexion l'utilise
    # (extensions httpfs cuites → aucun téléchargement réseau, ADR 0055/0059).
    ext_dir = str(tmp_path / "ext")
    monkeypatch.setenv("DUCKDB_EXTENSION_DIRECTORY", ext_dir)
    con = lakehouse._new_connection()
    assert con.execute("SELECT 1").fetchall() == [(1,)]


def test_new_connection_falls_back_without_extension_directory(monkeypatch) -> None:
    # En dev local sans la var, DuckDB retombe sur son répertoire par défaut.
    monkeypatch.delenv("DUCKDB_EXTENSION_DIRECTORY", raising=False)
    con = lakehouse._new_connection()
    assert con.execute("SELECT 1").fetchall() == [(1,)]


# ── copy_to_parquet / read_parquet (glue I/O sur connexion locale) ───────────


def test_copy_to_parquet_writes_local_partitioned(tmp_path) -> None:
    # copy_to_parquet produit l'arborescence Hive demandée (dt=…/) sans toucher à S3.
    con = duckdb.connect()
    dest = str(tmp_path / "views_forecast")
    select = "SELECT 'ror-03vek6s52' AS university_id, '2024-06' AS dt"
    lakehouse.copy_to_parquet(con, select, dest, partition_by=["dt"])
    rows = con.execute(f"SELECT university_id FROM read_parquet('{dest}/**/*.parquet')").fetchall()
    assert rows == [("ror-03vek6s52",)]
    assert (tmp_path / "views_forecast" / "dt=2024-06").is_dir()


def test_copy_to_parquet_without_partition(tmp_path) -> None:
    # Sans partition_by : un unique fichier Parquet, pas d'arborescence Hive.
    con = duckdb.connect()
    dest = str(tmp_path / "single.parquet")
    lakehouse.copy_to_parquet(con, "SELECT 42 AS views", dest)
    assert con.execute(f"SELECT views FROM read_parquet('{dest}')").fetchall() == [(42,)]


def test_read_parquet_relation_with_hive_partitioning(tmp_path) -> None:
    # read_parquet (hive=True) expose la colonne de partition dt via le nom de dossier.
    con = duckdb.connect()
    dest = str(tmp_path / "curated")
    lakehouse.copy_to_parquet(
        con, "SELECT 100 AS views, '2024-06' AS dt", dest, partition_by=["dt"]
    )
    rel = lakehouse.read_parquet(con, f"{dest}/**/*.parquet", hive=True)
    got = {row[0]: row[1] for row in rel.fetchall()}
    # La partition dt est reconstituée depuis le chemin (hive_partitioning=true).
    assert got == {100: "2024-06"}


def test_read_parquet_without_hive_partitioning(tmp_path) -> None:
    # hive=False : l'option n'est pas passée → seules les colonnes du fichier reviennent.
    con = duckdb.connect()
    dest = str(tmp_path / "plain.parquet")
    lakehouse.copy_to_parquet(con, "SELECT 7 AS views", dest)
    rel = lakehouse.read_parquet(con, dest, hive=False)
    assert rel.fetchall() == [(7,)]


# ── connect (nouvelle connexion + httpfs + secret) ───────────────────────────


def test_connect_registers_path_style_secret(monkeypatch) -> None:
    # connect() = nouvelle connexion + INSTALL/LOAD httpfs + CREATE SECRET. On remplace
    # _new_connection par une connexion LOCALE (hermétique : pas de S3) et on vérifie que
    # le secret path-style pageviews_s3 est bien enregistré.
    local = duckdb.connect()
    monkeypatch.setattr(lakehouse, "_new_connection", lambda: local)
    con = lakehouse.connect(_CFG)
    secrets = con.execute("SELECT name FROM duckdb_secrets()").fetchall()
    assert ("pageviews_s3",) in secrets


def test_connect_reads_config_from_env_when_omitted(monkeypatch) -> None:
    # cfg=None → connect lit la config de l'environnement (duckdb_s3_config_from_env).
    local = duckdb.connect()
    monkeypatch.setattr(lakehouse, "_new_connection", lambda: local)
    monkeypatch.setattr(lakehouse, "duckdb_s3_config_from_env", lambda: _CFG)
    con = lakehouse.connect()
    secrets = con.execute("SELECT name FROM duckdb_secrets()").fetchall()
    assert ("pageviews_s3",) in secrets
