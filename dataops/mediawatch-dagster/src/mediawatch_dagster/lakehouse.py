"""Accès lakehouse DuckDB↔S3 de la code-location « mediawatch ».

Fournit le backend que les modèles dbt-duckdb consomment : une connexion DuckDB
configurée pour lire/écrire sur le stockage objet (SeaweedFS au banc, RGW Ceph en
prod) en **path-style**, lire le brut (CSV tab-delimited du GKG) et écrire du
Parquet partitionné Hive (``COPY … (FORMAT PARQUET, PARTITION_BY …)``).

Les identifiants ne sont **jamais** codés en dur : ils proviennent de
``duckdb_s3_config_from_env`` (mêmes variables que l'écriture lakehouse, ADR 0055).

NB : pas de ``from __future__ import annotations`` (leçon drift D9 : Dagster
introspecte les annotations à l'exécution).
"""

import os

import duckdb

from mediawatch_dagster.resources import DuckDBS3Config, duckdb_s3_config_from_env


def _new_connection() -> duckdb.DuckDBPyConnection:
    """Connexion DuckDB pointant les extensions CUITES dans l'image si disponibles.

    En prod/CI, `DUCKDB_EXTENSION_DIRECTORY` (posé par le Dockerfile) contient httpfs
    pré-installé → aucun téléchargement réseau (hors-ligne, ADR 0055/0059). En dev
    local sans cette var, DuckDB retombe sur son répertoire par défaut (et peut
    télécharger). Le `INSTALL` reste idempotent : no-op si déjà présent.
    """
    ext_dir = os.environ.get("DUCKDB_EXTENSION_DIRECTORY")
    if ext_dir:
        return duckdb.connect(config={"extension_directory": ext_dir})
    return duckdb.connect()


def _create_secret_sql(cfg: DuckDBS3Config) -> str:
    """SQL ``CREATE SECRET`` S3 path-style pour DuckDB (httpfs)."""
    return (
        "CREATE OR REPLACE SECRET mediawatch_s3 (\n"
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
    con = _new_connection()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute(_create_secret_sql(cfg))
    return con


def copy_to_parquet(
    con: duckdb.DuckDBPyConnection,
    select_sql: str,
    dest_dir: str,
    partition_by: list[str] | None = None,
) -> None:
    """Écrit le résultat de ``select_sql`` en Parquet sous ``dest_dir`` (partition Hive).

    ``dest_dir`` ex. : ``s3://mediawatch/curated/org_mentions`` ; ``partition_by`` ex. :
    ``["dt"]`` → arborescence Hive ``dt=…/``. Réécriture autorisée du dossier cible
    (``OVERWRITE_OR_IGNORE``) ; l'immutabilité par run est gérée en amont (``run=<id>``).
    """
    options = ["FORMAT PARQUET"]
    if partition_by:
        cols = ", ".join(partition_by)
        options.append(f"PARTITION_BY ({cols})")
        options.append("OVERWRITE_OR_IGNORE")
    con.execute(f"COPY ({select_sql}) TO '{dest_dir}' ({', '.join(options)})")


def read_native_rows(
    con: duckdb.DuckDBPyConnection, bucket: str, native_prefix: str, dt: str, run_id: str
) -> list[dict]:
    """Lit les lignes de la couche NATIVE Parquet d'une partition/run (ADR 0100).

    ``raw_gkg`` (silver) DÉRIVE sa projection du Parquet natif écrit par
    ``raw_native_gkg`` (bronze) DANS LE MÊME RUN (même ``run_id`` → même préfixe
    ``dt=…/run=…``). On lit donc exactement ``raw_native/gkg/dt=<dt>/run=<run_id>/*.parquet``
    (pas de « dernier run » à deviner : le run courant est la source). Seuls les champs
    utiles à la projection 6 champs sont lus (jamais un SELECT * : plus léger, insensible
    aux 21 autres colonnes). Renvoie une liste de dicts (clés = noms de colonnes natives).
    """
    glob = f"s3://{bucket}/{native_prefix}/dt={dt}/run={run_id}/*.parquet"
    rel = con.sql(
        "SELECT gkg_record_id, v21_date, v2_source_common_name, v2_document_identifier, "
        "v2_enhanced_organizations, v21_translation_info "
        f"FROM read_parquet('{glob}')"
    )
    columns = [d[0] for d in rel.description]
    return [dict(zip(columns, row, strict=True)) for row in rel.fetchall()]
