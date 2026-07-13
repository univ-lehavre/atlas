"""Accès lakehouse DuckDB↔S3.

Copié (jamais importé — ADR 0055) du gabarit `citation` : générique, sans logique métier
scholar-network. Fournit une connexion DuckDB configurée pour lire/écrire sur le stockage
objet (RGW Ceph en prod, MinIO en test) en **path-style**, lire du Parquet et l'écrire
partitionné Hive (``COPY … (FORMAT PARQUET, PARTITION_BY …)``). C'est le backend du brut
pré-filtré et des deux passes (lots 2–4).

Les identifiants ne sont **jamais** codés en dur : ils proviennent de
``duckdb_s3_config_from_env`` (mêmes variables que les ressources, ADR 0055).

NB : pas de ``from __future__ import annotations`` (leçon drift D9 : Dagster
introspecte les annotations à l'exécution).
"""

import os

import duckdb

from scholar_network_dagster.resources import (
    DuckDBS3Config,
    PostgresTarget,
    duckdb_s3_config_from_env,
)


def _new_connection() -> duckdb.DuckDBPyConnection:
    """Connexion DuckDB pointant les extensions CUITES dans l'image si disponibles.

    En prod/CI, `DUCKDB_EXTENSION_DIRECTORY` (posé par le Dockerfile) contient httpfs
    et postgres pré-installés → aucun téléchargement réseau (hors-ligne, ADR 0055/0059).
    En dev local sans cette var, DuckDB retombe sur son répertoire par défaut (et peut
    télécharger). Le `INSTALL` reste idempotent : no-op si déjà présent.
    """
    ext_dir = os.environ.get("DUCKDB_EXTENSION_DIRECTORY")
    if ext_dir:
        return duckdb.connect(config={"extension_directory": ext_dir})
    return duckdb.connect()


def _create_secret_sql(cfg: DuckDBS3Config) -> str:
    """SQL ``CREATE SECRET`` S3 path-style pour DuckDB (httpfs)."""
    return (
        "CREATE OR REPLACE SECRET scholar_network_s3 (\n"
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
    # Robustesse HTTP sur RGW en prod : keep-alive réutilise TCP/TLS entre fichiers ;
    # timeout élargi + retries absorbent la latence d'un .parquet lourd (works OpenAlex)
    # et les erreurs transitoires RGW.
    con.execute("SET http_keep_alive=true;")
    con.execute("SET http_timeout=120000;")
    con.execute("SET http_retries=5;")
    # Scalabilité : borne la RAM, autorise le SPILLING disque et PARALLÉLISE. Le brut
    # pré-filtré et la semi-jointure des deux passes (lots 2–4) lisent le lac PAR LOTS
    # projetés (jamais les colonnes lourdes) ; `memory_limit` borne la RAM, au-delà DuckDB
    # déborde ses opérateurs dans temp_directory (emptyDir monté) au lieu d'OOM — filet, quasi
    # gratuit. `threads` parallélise le filtrage d'un lot. Tout dérivé de l'env (ADR 0023 :
    # le déploiement local jetable baisse encore).
    con.execute(f"SET memory_limit='{os.environ.get('DBT_DUCKDB_MEMORY_LIMIT', '24GB')}';")
    con.execute(
        f"SET temp_directory='{os.environ.get('DBT_DUCKDB_TEMP_DIR', '/tmp/duckdb-spill')}';"
    )
    con.execute(f"SET threads={os.environ.get('DBT_DUCKDB_THREADS', '32')};")
    con.execute(_create_secret_sql(cfg))
    return con


def attach_postgres(
    con: duckdb.DuckDBPyConnection, target: PostgresTarget, alias: str = "pg"
) -> None:
    """ATTACH une base Postgres/CNPG à la connexion DuckDB (extension `postgres`).

    Permet à un asset (index des profils, lot 5) d'écrire vers Postgres en SQL natif via
    ``CALL postgres_execute('<alias>', $$ ... $$)`` — les conversions ``::vector`` y sont
    évaluées par Postgres (DuckDB ne les connaît pas). Le mot de passe vient de
    l'environnement (Secret pg-role-pgvector), jamais codé en dur ; il n'apparaît pas dans
    les logs Dagster (pas de print de la DSN).
    """
    con.execute("INSTALL postgres; LOAD postgres;")
    dsn = (
        f"host={target.host} port={target.port} dbname={target.dbname} "
        f"user={target.user} password={target.password}"
    )
    con.execute(f"ATTACH '{dsn}' AS {alias} (TYPE postgres)")


def postgres_execute(con: duckdb.DuckDBPyConnection, sql: str, alias: str = "pg") -> None:
    """Exécute du SQL NATIF Postgres via DuckDB (``CALL postgres_execute``).

    À utiliser pour tout ce que DuckDB ne sait pas traduire — conversions ``::vector``,
    transactions de chargement idempotent. ``sql`` est passé tel quel à Postgres (délimité
    par ``$PG$`` pour éviter les collisions de quotes).
    """
    con.execute(f"CALL postgres_execute('{alias}', $PG${sql}$PG$)")


def read_parquet(con: duckdb.DuckDBPyConnection, s3_glob: str) -> duckdb.DuckDBPyRelation:
    """Lit un (ou des) Parquet du lakehouse en relation DuckDB (colonnaire natif).

    ``s3_glob`` ex. : ``s3://scholar-network/raw/works/**/*.parquet``. La lecture Parquet
    lit **par colonne** depuis le footer : projeter un sous-ensemble de colonnes
    (``SELECT id, publication_year, …``) ne désérialise JAMAIS les colonnes lourdes non
    demandées (``abstract_inverted_index``, ``referenced_works``). C'est le socle de la
    lecture bornée du snapshot Parquet OpenAlex et du brut pré-filtré projeté (ADR 0103).
    """
    return con.sql(f"SELECT * FROM read_parquet('{s3_glob}')")


def read_parquet_footer(con: duckdb.DuckDBPyConnection, s3_glob: str) -> duckdb.DuckDBPyRelation:
    """Relation ``(file, num_rows)`` lue des **footers** Parquet (aucun scan de données).

    ``parquet_file_metadata`` lit uniquement le pied de page de chaque fichier : le
    nombre de lignes (``num_rows``) y est **déjà** inscrit par le producteur (OpenAlex),
    donc ce comptage est quasi gratuit. Sert à dimensionner des lots homogènes (cumul de
    ``num_rows``) sans jamais ouvrir le corps des fichiers.
    """
    return con.sql(f"SELECT file_name AS file, num_rows FROM parquet_file_metadata('{s3_glob}')")


def copy_to_parquet(
    con: duckdb.DuckDBPyConnection,
    select_sql: str,
    dest_dir: str,
    partition_by: list[str] | None = None,
) -> None:
    """Écrit le résultat de ``select_sql`` en Parquet sous ``dest_dir`` (partition Hive).

    ``dest_dir`` ex. : ``s3://scholar-network/prefiltered/works`` ; ``partition_by`` ex. :
    ``["dt"]`` → arborescence Hive ``dt=…/``. Réécriture autorisée du dossier cible
    (``OVERWRITE_OR_IGNORE``) ; l'immutabilité par run est gérée en amont (``run=<id>``).
    """
    options = ["FORMAT PARQUET"]
    if partition_by:
        cols = ", ".join(partition_by)
        options.append(f"PARTITION_BY ({cols})")
        options.append("OVERWRITE_OR_IGNORE")
    con.execute(f"COPY ({select_sql}) TO '{dest_dir}' ({', '.join(options)})")
