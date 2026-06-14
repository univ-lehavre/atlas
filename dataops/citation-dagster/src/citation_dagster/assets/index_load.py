"""Asset de chargement de l'index recherche par chercheur (étape 4, index_load).

Réactive l'asset que l'ADR 0058 avait reporté faute de producteur (désormais livré,
lots 1-5). Charge le mart `researchers` SERVI vers l'index Postgres/pgvector (CNPG) :
- FTS lexical : `marts_researchers_fts` (document texte par author_id) → colonne `fts`
  (tsvector) ;
- kNN sémantique : `marts/researcher_vectors` (vecteur(384) par author_id) → colonne
  `embedding` (pgvector).

Python-natif via DuckDB `ATTACH ... (TYPE postgres)` (ADR 0055 : pas de Node, pas de
psycopg2/LGPL). Les conversions `::vector` et `to_tsvector` sont évaluées par Postgres
(`postgres_execute`), pas par DuckDB qui ne les connaît pas.

Contrat (ADR 0029/0058) : on VALIDE le manifest de chaque artefact (schema_version +
row_count + sha256 des octets réels) AVANT de charger. Idempotence par partition :
`DELETE WHERE dt,run` puis `INSERT` dans une transaction — un rejeu (même run_id)
remplace, jamais de doublon. Mapping `author_id` → `researcher_id` (ADR 0059 : la clé
chercheur du schéma EST l'author_id du producteur).

Ce qui N'EST PAS du ressort de cet asset (frontière capacité/décision, infra) : créer le
schéma de l'index (migrations appliquées au déploiement) ; brancher le Secret
`pg-role-pgvector` au pod (déployeur). L'asset CONSOMME ces capacités.

NB : pas de ``from __future__ import annotations`` (drift D9).
"""

import json

from dagster import (
    AssetExecutionContext,
    AssetKey,
    Failure,
    MaterializeResult,
    MetadataValue,
    asset,
)
from openlineage.client.event_v2 import RunState

from citation_dagster import lakehouse, lineage, manifest_read
from citation_dagster.dbt import CURATED_DT
from citation_dagster.resources import ceph_target_from_env, postgres_target_from_env

# Artefacts servis consommés (mart_subdir → AssetKey du manifest producteur).
_FTS_SUBDIR = "marts/researchers_fts"
_VECTORS_SUBDIR = "marts/researcher_vectors"


def _read_manifest(con, bucket, subdir, dt, run_id):
    """Lit le manifest.json voisin d'un artefact (DuckDB read_text)."""
    path = f"s3://{bucket}/{subdir}/dt={dt}/run={run_id}/manifest.json"
    rows = con.sql(f"SELECT content FROM read_text('{path}')").fetchall()
    if not rows:
        raise Failure(description=f"manifest absent (artefact incomplet) : {path}")
    return json.loads(rows[0][0])


def _validate_artifact(con, bucket, subdir, dt, run_id):
    """Valide le contrat d'un artefact servi avant chargement (ADR 0058).

    Recompte les lignes et recalcule le sha256 des parts via DuckDB, puis confronte au
    manifest. Lève Failure si le contrat est violé (chargement avorté).
    """
    manifest = _read_manifest(con, bucket, subdir, dt, run_id)
    glob = f"s3://{bucket}/{subdir}/dt={dt}/run={run_id}/*.parquet"
    actual_rows = con.sql(f"SELECT count(*) FROM read_parquet('{glob}')").fetchone()[0]
    # sha256 par part, recalculé sur les octets réels (read_blob).
    blobs = con.sql(
        f"SELECT regexp_replace(filename, '.*/', '') AS name, content FROM read_blob('{glob}')"
    ).fetchall()
    actual_sha = {name: manifest_read.sha256_bytes(content) for name, content in blobs}
    try:
        manifest_read.validate_manifest(manifest, actual_rows, actual_sha)
    except manifest_read.ManifestError as exc:
        raise Failure(description=f"contrat {subdir} invalide : {exc}") from exc
    return manifest


def _researcher_insert_sql(author_id, doc_text, vector, dt, run_id):
    """Construit l'INSERT Postgres natif d'UN chercheur (pur, testable sans I/O).

    Mappe ``author_id`` → ``researcher_id`` (ADR 0059) ; ``embedding`` est ``NULL`` si le
    chercheur n'a pas de vecteur (LEFT JOIN), sinon ``'[…]'::vector`` (converti par PG) ;
    ``fts`` via ``to_tsvector('simple', …)`` (converti par PG). Quotes échappées.
    """
    rid = author_id.replace("'", "''")
    doc = (doc_text or "").replace("'", "''")
    if vector is None:
        emb_sql = "NULL"
    else:
        emb_sql = "'[" + ",".join(repr(float(x)) for x in vector) + "]'::vector"
    return (
        "INSERT INTO researchers (researcher_id, embedding, fts, dt, run) VALUES "
        f"('{rid}', {emb_sql}, to_tsvector('simple', '{doc}'), '{dt}', '{run_id}')"
    )


@asset(
    name="index_load",
    group_name="transform",
    deps=[AssetKey(["researchers_fts_manifest"]), AssetKey(["researcher_vectors_manifest"])],
)
def index_load(context: AssetExecutionContext) -> MaterializeResult:
    """Charge l'index researchers (FTS + kNN) dans Postgres, idempotent par partition."""
    dt = CURATED_DT
    run_id = context.run_id  # même run que les producteurs → même préfixe dt=…/run=…
    ceph = ceph_target_from_env()
    pg = postgres_target_from_env()
    bucket = ceph.bucket

    con = lakehouse.connect()

    # 1) Valider le contrat des DEUX artefacts servis AVANT tout chargement (lève si KO).
    fts_manifest = _validate_artifact(con, bucket, _FTS_SUBDIR, dt, run_id)
    _validate_artifact(con, bucket, _VECTORS_SUBDIR, dt, run_id)
    expected_rows = fts_manifest["row_count"]  # une ligne par chercheur (grain author_id)

    lineage.emit(
        RunState.START,
        run_id,
        "index_load",
        [lineage.mart_dataset(_FTS_SUBDIR), lineage.mart_dataset(_VECTORS_SUBDIR)],
        [lineage.index_dataset("researchers")],
    )

    # 2) ATTACH Postgres, charger en idempotent par partition (DELETE + INSERT en
    #    transaction). Le FTS (tous les chercheurs) porte la clé ; le vecteur est joint
    #    par author_id (LEFT JOIN : un chercheur sans vecteur garde embedding NULL, le
    #    schéma l'autorise). Conversions ::vector / to_tsvector évaluées par Postgres.
    lakehouse.attach_postgres(con, pg)
    fts_glob = f"s3://{bucket}/{_FTS_SUBDIR}/dt={dt}/run={run_id}/*.parquet"
    vec_glob = f"s3://{bucket}/{_VECTORS_SUBDIR}/dt={dt}/run={run_id}/*.parquet"

    # DuckDB lit les Parquet S3 et les expose à Postgres via des tables temporaires
    # côté DuckDB ; mais le chargement final (avec to_tsvector/::vector) est exécuté
    # PAR Postgres. On matérialise donc le résultat joint en mémoire DuckDB puis on
    # insère ligne par ligne via postgres_execute (conversions natives PG).
    rows = con.sql(
        f"""
        SELECT f.author_id, f.doc_text, v.vector
        FROM read_parquet('{fts_glob}') f
        LEFT JOIN read_parquet('{vec_glob}') v ON v.author_id = f.author_id
        ORDER BY f.author_id
        """
    ).fetchall()

    lakehouse.postgres_execute(con, "BEGIN")
    lakehouse.postgres_execute(
        con, f"DELETE FROM researchers WHERE dt = '{dt}' AND run = '{run_id}'"
    )
    for author_id, doc_text, vector in rows:
        lakehouse.postgres_execute(
            con, _researcher_insert_sql(author_id, doc_text, vector, dt, run_id)
        )
    lakehouse.postgres_execute(con, "COMMIT")

    lineage.emit(
        RunState.COMPLETE,
        run_id,
        "index_load",
        [lineage.mart_dataset(_FTS_SUBDIR), lineage.mart_dataset(_VECTORS_SUBDIR)],
        [lineage.index_dataset("researchers")],
    )

    return MaterializeResult(
        metadata={
            "researchers_loaded": MetadataValue.int(len(rows)),
            "expected_row_count": MetadataValue.int(expected_rows),
            "partition": MetadataValue.text(f"dt={dt}/run={run_id}"),
            "vectors_present": MetadataValue.int(sum(1 for _a, _d, v in rows if v is not None)),
        }
    )
