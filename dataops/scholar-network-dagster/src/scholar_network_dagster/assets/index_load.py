"""Chargement de l'index pgvector des profils de chercheurs — asset ``index_load`` (lot 5c).

Charge le Parquet des profils (``scholar_profiles``, grain ``author_id`` × vecteur 384) vers
la table Postgres ``scholar_profiles`` (CNPG + extension pgvector). Le chargement est
Python-natif via DuckDB ``ATTACH ... (TYPE postgres)`` (ADR 0055 : pas de psycopg2/LGPL) ;
la conversion ``::vector`` est évaluée PAR Postgres (``postgres_execute``), DuckDB ne la
connaît pas.

Idempotent par partition (``DELETE WHERE dt, run`` puis ``INSERT`` en transaction) : un rejeu
du même run réécrit sa partition sans doublon. Le SCHÉMA est fourni HORS de cet asset (la
migration ``0001_scholar_profiles_index.sql``, appliquée au déploiement — frontière ADR 0033).

NB : pas de ``from __future__ import annotations`` (Dagster introspecte à l'exécution).
"""

import os

from dagster import AssetExecutionContext, AssetKey, MaterializeResult, MetadataValue, asset
from openlineage.client.event_v2 import RunState

from scholar_network_dagster import lakehouse, lineage
from scholar_network_dagster.assets.profiles import PROFILES_SUBDIR
from scholar_network_dagster.resources import ceph_target_from_env, postgres_target_from_env


def _partition_dt(env=None) -> str:
    """Mois logique de la partition (valeur d'instance ``SCHOLAR_NETWORK_DT``, défaut vide).

    Le ``dt`` partitionne l'index (``WHERE dt, run`` pour l'idempotence). Valeur d'instance
    (ADR 0023) : le déployeur la pose (mois du run mensuel) ; vide par défaut n'empêche pas le
    chargement (la clé effective d'idempotence reste le ``run_id``, unique par run)."""
    env = env if env is not None else os.environ
    return env.get("SCHOLAR_NETWORK_DT", "")


def profile_insert_sql(researcher_id, vector, dt, run_id) -> str:
    """INSERT Postgres natif d'UN profil (PURE, testable sans I/O ; conversion ::vector par PG).

    ``vector`` : liste de floats (384). Le littéral ``'[...]'::vector`` est converti par
    Postgres. Quotes échappées (researcher_id = author_id OpenAlex, jamais une entrée libre,
    mais on échappe par principe)."""
    rid = str(researcher_id).replace("'", "''")
    emb = "'[" + ",".join(repr(float(x)) for x in vector) + "]'::vector"
    return (
        "INSERT INTO scholar_profiles (researcher_id, embedding, dt, run) VALUES "
        f"('{rid}', {emb}, '{dt}', '{run_id}')"
    )


def _profiles_glob(bucket: str, run_id: str) -> str:
    return f"s3://{bucket}/{PROFILES_SUBDIR}/run={run_id}/*.parquet"


@asset(
    name="index_load",
    group_name="profiling",
    deps=[AssetKey("scholar_profiles")],
    description="Charge les profils de chercheurs (vecteur 384) dans l'index pgvector, "
    "idempotent par partition (ADR 0103 §2).",
)
def index_load(context: AssetExecutionContext) -> MaterializeResult:
    """Charge la table pgvector ``scholar_profiles`` depuis le Parquet du run courant."""
    ceph = ceph_target_from_env()
    pg = postgres_target_from_env()
    run_id = context.run_id  # même run que scholar_profiles → même préfixe run=
    dt = _partition_dt()

    con = lakehouse.connect()
    glob = _profiles_glob(ceph.bucket, run_id)
    rows = con.execute(
        f"SELECT researcher_id, embedding FROM read_parquet('{glob}') ORDER BY researcher_id"
    ).fetchall()

    lineage.emit(
        RunState.START,
        run_id,
        "index_load",
        [lineage.index_dataset("profiles")],
        [lineage.index_dataset("scholar_profiles")],
    )

    lakehouse.attach_postgres(con, pg)
    lakehouse.postgres_execute(con, "BEGIN")
    lakehouse.postgres_execute(
        con, f"DELETE FROM scholar_profiles WHERE dt = '{dt}' AND run = '{run_id}'"
    )
    for researcher_id, vector in rows:
        lakehouse.postgres_execute(con, profile_insert_sql(researcher_id, vector, dt, run_id))
    lakehouse.postgres_execute(con, "COMMIT")

    lineage.emit(
        RunState.COMPLETE,
        run_id,
        "index_load",
        [lineage.index_dataset("profiles")],
        [lineage.index_dataset("scholar_profiles")],
    )
    return MaterializeResult(
        metadata={
            "loaded_profiles": MetadataValue.int(len(rows)),
            "dt": MetadataValue.text(dt),
            "run": MetadataValue.text(run_id),
        }
    )
