"""Accès lakehouse DuckDB↔S3 (étape 3.1).

Fournit le backend que les modèles dbt-duckdb consomment : une connexion DuckDB
configurée pour lire/écrire sur le stockage objet (SeaweedFS au banc, RGW Ceph en
prod) en **path-style**, lire le brut JSONL gzippé (``read_json_auto``) et écrire
du Parquet partitionné Hive (``COPY … (FORMAT PARQUET, PARTITION_BY …)``).

Les identifiants ne sont **jamais** codés en dur : ils proviennent de
``duckdb_s3_config_from_env`` (mêmes variables que l'asset de sync, ADR 0055).

NB : pas de ``from __future__ import annotations`` (leçon drift D9 : Dagster
introspecte les annotations à l'exécution).
"""

import duckdb

from citation_dagster.resources import DuckDBS3Config, duckdb_s3_config_from_env


def _create_secret_sql(cfg: DuckDBS3Config) -> str:
    """SQL ``CREATE SECRET`` S3 path-style pour DuckDB (httpfs)."""
    return (
        "CREATE OR REPLACE SECRET citation_s3 (\n"
        "  TYPE S3,\n"
        f"  KEY_ID '{cfg.key_id}',\n"
        f"  SECRET '{cfg.secret}',\n"
        f"  REGION '{cfg.region}',\n"
        f"  ENDPOINT '{cfg.endpoint}',\n"
        "  URL_STYLE 'path',\n"
        f"  USE_SSL {'true' if cfg.use_ssl else 'false'}\n"
        ")"
    )


def connect(cfg: DuckDBS3Config | None = None) -> duckdb.DuckDBPyConnection:
    """Ouvre une connexion DuckDB configurée pour S3 (httpfs + secret path-style)."""
    cfg = cfg or duckdb_s3_config_from_env()
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute(_create_secret_sql(cfg))
    return con


def read_jsonl_gz(con: duckdb.DuckDBPyConnection, s3_glob: str) -> duckdb.DuckDBPyRelation:
    """Lit un (ou des) JSONL gzippé(s) du lakehouse en relation DuckDB.

    ``s3_glob`` ex. : ``s3://citation/raw/works/**/*.gz``. DuckDB infère le schéma
    et décompresse le gzip de façon transparente.
    """
    return con.sql(f"SELECT * FROM read_json_auto('{s3_glob}')")


def copy_to_parquet(
    con: duckdb.DuckDBPyConnection,
    select_sql: str,
    dest_dir: str,
    partition_by: list[str] | None = None,
) -> None:
    """Écrit le résultat de ``select_sql`` en Parquet sous ``dest_dir`` (partition Hive).

    ``dest_dir`` ex. : ``s3://citation/curated/works`` ; ``partition_by`` ex. :
    ``["dt"]`` → arborescence Hive ``dt=…/``. Réécriture autorisée du dossier cible
    (``OVERWRITE_OR_IGNORE``) ; l'immutabilité par run est gérée en amont (``run=<id>``).
    """
    options = ["FORMAT PARQUET"]
    if partition_by:
        cols = ", ".join(partition_by)
        options.append(f"PARTITION_BY ({cols})")
        options.append("OVERWRITE_OR_IGNORE")
    con.execute(f"COPY ({select_sql}) TO '{dest_dir}' ({', '.join(options)})")
