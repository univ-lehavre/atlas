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

import os

import duckdb

from citation_dagster.resources import (
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
    con = _new_connection()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    # Robustesse HTTP sur RGW en prod : keep-alive réutilise TCP/TLS entre fichiers ;
    # timeout élargi + retries absorbent la latence d'un .gz lourd (works OpenAlex ~10-19 s
    # par fichier) et les erreurs transitoires RGW. NB : ces réglages ne SUBSTITUENT PAS le
    # bornage de la lecture (check_raw échantillonne) — un http_timeout seul masquerait le
    # symptôme (le faux « Could not resolve hostname » de httpfs) sans réduire le volume.
    con.execute("SET http_keep_alive=true;")
    con.execute("SET http_timeout=120000;")
    con.execute("SET http_retries=5;")
    # Scalabilité (parité avec le profil dbt) : borne la RAM, autorise le SPILLING disque et
    # PARALLÉLISE. Les assets Python DuckDB en aval (embeddings, uplift, index_load) lisent des
    # marts volumineux au datalake complet — sans borne, un tri/jointure fait OOM le pod. Au-delà
    # de memory_limit, DuckDB déborde ses opérateurs dans temp_directory (emptyDir monté, cf.
    # definitions._SPILL_MOUNT). `threads=60` exploite les nœuds (80 cœurs) pour paralléliser
    # les gros tris/jointures ; le pod de run RÉSERVE ces ressources (requests/limits, cf.
    # definitions._RUN_RESOURCES) → le scheduler place et cadre. On garde ~20 cœurs de marge.
    # Tout dérivé de l'env (ADR 0023 : le banc léger baisse ; défauts prod généreux, nœuds à
    # ~235 GiB / 80 cœurs).
    con.execute(f"SET memory_limit='{os.environ.get('DBT_DUCKDB_MEMORY_LIMIT', '64GB')}';")
    con.execute(
        f"SET temp_directory='{os.environ.get('DBT_DUCKDB_TEMP_DIR', '/tmp/duckdb-spill')}';"
    )
    con.execute(f"SET threads={os.environ.get('DBT_DUCKDB_THREADS', '60')};")
    con.execute(_create_secret_sql(cfg))
    return con


def attach_postgres(
    con: duckdb.DuckDBPyConnection, target: PostgresTarget, alias: str = "pg"
) -> None:
    """ATTACH une base Postgres/CNPG à la connexion DuckDB (extension `postgres`).

    Permet à un asset (index_load, étape 4) d'écrire vers Postgres en SQL natif via
    ``CALL postgres_execute('<alias>', $$ ... $$)`` — les conversions ``::vector`` et
    ``to_tsvector`` y sont évaluées par Postgres (DuckDB ne les connaît pas). Le mot de
    passe vient de l'environnement (Secret pg-role-pgvector), jamais codé en dur ; il
    n'apparaît pas dans les logs Dagster (pas de print de la DSN).
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
    ``to_tsvector(...)``, transactions de chargement idempotent. ``sql`` est passé tel
    quel à Postgres (délimité par ``$PG$`` pour éviter les collisions de quotes).
    """
    con.execute(f"CALL postgres_execute('{alias}', $PG${sql}$PG$)")


def read_jsonl_gz(con: duckdb.DuckDBPyConnection, s3_glob: str) -> duckdb.DuckDBPyRelation:
    """Lit un (ou des) JSONL gzippé(s) du lakehouse en relation DuckDB.

    ``s3_glob`` ex. : ``s3://citation/raw/works/**/*.gz``. DuckDB infère le schéma
    et décompresse le gzip de façon transparente.
    """
    return con.sql(f"SELECT * FROM read_json_auto('{s3_glob}')")


def read_parquet(con: duckdb.DuckDBPyConnection, s3_glob: str) -> duckdb.DuckDBPyRelation:
    """Lit un (ou des) Parquet du lakehouse en relation DuckDB (colonnaire natif).

    ``s3_glob`` ex. : ``s3://citation/raw/works/**/*.parquet``. Contrairement à
    ``read_jsonl_gz`` (qui parse tout le JSON imbriqué → OOM au datalake complet),
    ``read_parquet`` lit **par colonne** depuis le footer : projeter un sous-ensemble
    de colonnes (``SELECT id, publication_year, …``) ne désérialise JAMAIS les
    colonnes lourdes non demandées (``abstract_inverted_index``, ``referenced_works``).
    C'est le socle de la lecture bornée du snapshot Parquet OpenAlex (ADR 0105).
    """
    return con.sql(f"SELECT * FROM read_parquet('{s3_glob}')")


def read_parquet_footer(con: duckdb.DuckDBPyConnection, s3_glob: str) -> duckdb.DuckDBPyRelation:
    """Relation ``(file, num_rows)`` lue des **footers** Parquet (aucun scan de données).

    ``parquet_file_metadata`` lit uniquement le pied de page de chaque fichier : le
    nombre de lignes (``num_rows``) y est **déjà** inscrit par le producteur (OpenAlex),
    donc ce comptage est quasi gratuit (~0,2 s/fichier, mesuré sur le lac). Sert à
    dimensionner les lots homogènes du batch EUNICoast (cumul de ``num_rows``, ADR 0105)
    sans jamais ouvrir le corps des fichiers.
    """
    return con.sql(f"SELECT file_name AS file, num_rows FROM parquet_file_metadata('{s3_glob}')")


def write_works_manifest(con: duckdb.DuckDBPyConnection, bucket: str) -> int:
    """Écrit ``raw/manifest_works.parquet`` (``file, num_rows``) depuis les footers.

    Recense chaque Parquet de ``raw/works/`` et son nombre de works (footer). Le
    manifest est relu par l'asset de batch pour composer des lots ~homogènes en nombre
    de works (les fichiers OpenAlex vont de quelques dizaines à ~360k works chacun →
    un découpage par nombre de fichiers serait très déséquilibré). Renvoie le nombre de
    fichiers recensés (0 si ``raw/works/`` est vide → manifest non écrit).
    """
    src = f"s3://{bucket}/raw/works/**/*.parquet"
    dest = f"s3://{bucket}/raw/manifest_works.parquet"
    # `parquet_file_metadata` LÈVE une IOException si le glob ne matche AUCUN fichier
    # (elle ne renvoie pas 0 lignes) : on traite « raw/works/ vide » comme un no-op
    # explicite plutôt que de laisser l'exception remonter (ingestion sans works = rien
    # à recenser, pas une erreur).
    try:
        n = con.sql(f"SELECT count(*) FROM parquet_file_metadata('{src}')").fetchone()[0]
    except duckdb.IOException:
        return 0
    if n == 0:
        return 0
    con.execute(
        f"COPY (SELECT file_name AS file, num_rows FROM parquet_file_metadata('{src}')) "
        f"TO '{dest}' (FORMAT PARQUET)"
    )
    return n


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
