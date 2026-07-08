"""Accès lakehouse DuckDB↔S3 de la code-location « pageviews ».

Fournit le backend que les modèles dbt-duckdb et les assets Python consomment : une
connexion DuckDB configurée pour lire/écrire sur le stockage objet (SeaweedFS au banc,
RGW Ceph en prod) en **path-style**, et écrire du Parquet partitionné Hive
(``COPY … (FORMAT PARQUET, PARTITION_BY …)``).

Les identifiants ne sont **jamais** codés en dur : ils proviennent de
``duckdb_s3_config_from_env`` (mêmes variables que citation/mediawatch, ADR 0055).

NB : pas de ``from __future__ import annotations`` (leçon drift D9 : Dagster
introspecte les annotations à l'exécution).
"""

import os

import duckdb

from pageviews_dagster.resources import DuckDBS3Config, duckdb_s3_config_from_env


def _new_connection() -> duckdb.DuckDBPyConnection:
    """Connexion DuckDB pointant les extensions CUITES dans l'image si disponibles.

    En prod/CI, `DUCKDB_EXTENSION_DIRECTORY` (posé par le Dockerfile) contient httpfs
    pré-installé → aucun téléchargement réseau (hors-ligne, ADR 0055/0059). En dev local
    sans cette var, DuckDB retombe sur son répertoire par défaut. Le `INSTALL` reste
    idempotent : no-op si déjà présent.
    """
    ext_dir = os.environ.get("DUCKDB_EXTENSION_DIRECTORY")
    if ext_dir:
        return duckdb.connect(config={"extension_directory": ext_dir})
    return duckdb.connect()


def _create_secret_sql(cfg: DuckDBS3Config) -> str:
    """SQL ``CREATE SECRET`` S3 path-style pour DuckDB (httpfs)."""
    return (
        "CREATE OR REPLACE SECRET pageviews_s3 (\n"
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
    """Ouvre une connexion DuckDB configurée pour S3 (httpfs + secret path-style).

    Un seul secret S3 (``pageviews_s3``, lakehouse interne RGW Ceph). Le snapshot public
    OpenAlex n'est PAS lu en httpfs (137 petits fichiers → >2 min d'aller-retours) mais
    RAPATRIÉ en local par rclone puis lu depuis le disque (cf. ``ref_universities``).
    """
    cfg = cfg or duckdb_s3_config_from_env()
    con = _new_connection()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute(_create_secret_sql(cfg))
    return con


def read_parquet(con: duckdb.DuckDBPyConnection, glob: str, hive: bool = True):
    """Lit un glob Parquet S3 en relation DuckDB (``read_parquet`` + partitions Hive)."""
    hive_opt = ", hive_partitioning=true" if hive else ""
    return con.execute(f"SELECT * FROM read_parquet('{glob}'{hive_opt})")


# ── Contrat de chemin du RÉFÉRENTIEL d'établissements (drift D24) ───────────────
# CONTRAT INTERNE partagé entre le PRODUCTEUR (`ref_universities`, qui écrit) et le
# CONSOMMATEUR (`raw_pageviews`, qui lit). Codé UNE SEULE FOIS ici : avant, chaque asset
# codait son chemin en dur de son côté (`raw/ref_universities` écrit vs
# `ref/universities/source=…` lu) → ils ont DIVERGÉ, et `raw_pageviews` échouait au run
# prod (« No files found … ref/universities/source=ingested »). Une source unique rend la
# divergence structurellement impossible. `source` distingue le référentiel INGÉRÉ
# (`ingested`, produit par ref_universities) d'un référentiel pré-seedé (`seed`) ; la prod
# pose `PAGEVIEWS_REF_SOURCE=ingested`.
_REFERENTIAL_BASE = "ref/universities"


def referential_prefix(source: str) -> str:
    """Préfixe S3 (sans bucket) du référentiel pour une ``source`` (``ingested``/``seed``)."""
    return f"{_REFERENTIAL_BASE}/source={source}"


def referential_dest(bucket: str, source: str) -> str:
    """Chemin d'ÉCRITURE Parquet du référentiel (fichier unique dans la partition ``source``)."""
    return f"s3://{bucket}/{referential_prefix(source)}/ref_universities.parquet"


def referential_glob(bucket: str, source: str) -> str:
    """Glob de LECTURE du référentiel — DOIT matcher ce qu'écrit ``referential_dest``."""
    return f"s3://{bucket}/{referential_prefix(source)}/*.parquet"


def copy_to_parquet(
    con: duckdb.DuckDBPyConnection,
    select_sql: str,
    dest_dir: str,
    partition_by: list[str] | None = None,
) -> None:
    """Écrit le résultat de ``select_sql`` en Parquet sous ``dest_dir`` (partition Hive).

    ``dest_dir`` ex. : ``s3://pageviews/marts/views_forecast/dt=…/run=…/part.parquet`` ;
    ``partition_by`` ex. : ``["dt"]`` → arborescence Hive ``dt=…/``. L'immutabilité par
    run est gérée en amont (``run=<id>`` dans le chemin).
    """
    options = ["FORMAT PARQUET"]
    if partition_by:
        cols = ", ".join(partition_by)
        options.append(f"PARTITION_BY ({cols})")
        options.append("OVERWRITE_OR_IGNORE")
    con.execute(f"COPY ({select_sql}) TO '{dest_dir}' ({', '.join(options)})")
