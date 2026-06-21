"""Asset checks Great Expectations BLOQUANTS (étape 3.5a).

Trois *asset checks* Dagster en **porte de qualité bloquante** (``blocking=True``) :
un échec d'attente fait échouer le run et empêche l'aval (p. ex. l'écriture du
manifest sentinelle après le mart). Ils s'appliquent à trois couches :

- ``ge_raw_contract`` sur ``raw_snapshot`` — le brut JSONL.gz (aucun test dbt ici) ;
- ``ge_curated_edges`` sur ``curated_edges`` — format des ids + pas d'auto-citation ;
- ``ge_marts_collab`` sur ``marts_collab_pairs`` — contrat de colonnes + bornes.

Ils **complètent** les *asset checks* que dagster-dbt génère automatiquement à partir
des tests dbt (noms distincts ``ge_*`` → aucune collision). La donnée est chargée via
DuckDB (``lakehouse.connect``) en ``DataFrame`` pandas, puis validée par les suites
pures de ``ge_suites`` (contexte GE éphémère, hermétique).

Le run courant est résolu par ``context.run.run_id`` (l'``AssetCheckExecutionContext``
n'expose PAS ``run_id`` directement, contrairement à l'``AssetExecutionContext``).

NB : pas de ``from __future__ import annotations`` (Dagster introspecte, drift D9).
"""

import json

from dagster import AssetCheckExecutionContext, AssetCheckResult, AssetKey, asset_check

from citation_dagster import embedding, ge_suites, lakehouse
from citation_dagster.dbt import CURATED_DT
from citation_dagster.resources import ceph_target_from_env, postgres_target_from_env

_MART_GLOB = "marts/collab"


def _result(passed: bool, metadata: dict) -> AssetCheckResult:
    """Mappe un résultat de validation GE en ``AssetCheckResult`` Dagster."""
    return AssetCheckResult(
        passed=passed,
        metadata={
            "suite": metadata["suite"],
            "evaluated": metadata["evaluated"],
            "failed_expectations": ", ".join(metadata["failed"]) or "—",
        },
    )


# ── Corps purs (chargement + validation), testables sans Dagster ─────────────


def check_raw(bucket: str) -> AssetCheckResult:
    """Valide le brut works + authors (contrat structurel + format des ids)."""
    con = lakehouse.connect()
    # On PROJETTE les seules colonnes que les suites GE valident (cf. ge_suites :
    # raw_works → id/referenced_works/authorships ; raw_authors → id) au lieu d'un
    # SELECT * : sur le brut OpenAlex réel, l'inférence de schéma complète de
    # read_json_auto bute sur des objets JSON à clés dupliquées (p. ex.
    # abstract_inverted_index converti en MAP) → DuckDB lève « Map keys must be
    # unique » et fait échouer ce check pourtant satisfait. Projeter évite de
    # parser ces champs non validés (plus robuste, plus léger). hive_partitioning
    # =false : neutralise la colonne fantôme updated_date (cf. staging).
    works = con.sql(
        f"SELECT id, referenced_works, authorships "
        f"FROM read_json_auto('s3://{bucket}/raw/works/**/*.gz', "
        "hive_partitioning=false, union_by_name=true)"
    ).df()
    authors = con.sql(
        f"SELECT id FROM read_json_auto('s3://{bucket}/raw/authors/**/*.gz', "
        "hive_partitioning=false, union_by_name=true)"
    ).df()
    ok_w, meta_w = ge_suites.validate_df(works, "raw_works", ge_suites.raw_works_expectations())
    ok_a, meta_a = ge_suites.validate_df(
        authors, "raw_authors", ge_suites.raw_authors_expectations()
    )
    failed = meta_w["failed"] + meta_a["failed"]
    return _result(
        ok_w and ok_a,
        {
            "suite": "raw_works+raw_authors",
            "evaluated": meta_w["evaluated"] + meta_a["evaluated"],
            "failed": failed,
        },
    )


def check_curated_edges(bucket: str, run_id: str) -> AssetCheckResult:
    """Valide curated_edges (format ids + invariant pas d'auto-citation, colonne dérivée)."""
    con = lakehouse.connect()
    glob = f"s3://{bucket}/curated/curated_edges/dt={CURATED_DT}/run={run_id}/*.parquet"
    df = con.sql(
        f"SELECT citing_work_id, cited_work_id, "
        f"(citing_work_id <> cited_work_id) AS _no_self_edge "
        f"FROM read_parquet('{glob}')"
    ).df()
    ok, meta = ge_suites.validate_df(df, "curated_edges", ge_suites.curated_edges_expectations())
    return _result(ok, meta)


def check_marts(bucket: str, run_id: str) -> AssetCheckResult:
    """Valide le mart servi (contrat de colonnes + bornes + invariant somme dérivé)."""
    con = lakehouse.connect()
    glob = f"s3://{bucket}/{_MART_GLOB}/dt={CURATED_DT}/run={run_id}/*.parquet"
    # WHERE author_a IS NOT NULL : un mart vide (aucune paire de collaboration sur
    # le jeu courant) reste un état VALIDE. La matérialisation `external` de
    # dbt-duckdb écrit alors une ligne fantôme à clés NULL (placeholder de schéma
    # sur relation vide) ; on l'écarte ici pour que le contrat not_null porte sur
    # les paires RÉELLES (zéro ou plus), pas sur ce placeholder. Mêmes clés non
    # nulles par construction côté modèle (least()/greatest() sur author_id non nuls).
    df = con.sql(
        f"SELECT author_a, author_b, cross_citations, a_to_b, b_to_a, "
        f"(a_to_b + b_to_a = cross_citations) AS _sum_ok "
        f"FROM read_parquet('{glob}') WHERE author_a IS NOT NULL"
    ).df()
    ok, meta = ge_suites.validate_df(df, "marts_collab", ge_suites.marts_collab_expectations())
    return _result(ok, meta)


def check_researchers(bucket: str, run_id: str) -> AssetCheckResult:
    """Valide le mart lexical servi researchers (contrat de colonnes + bornes weight/freq)."""
    con = lakehouse.connect()
    glob = f"s3://{bucket}/marts/researchers/dt={CURATED_DT}/run={run_id}/*.parquet"
    df = con.sql(
        f"SELECT author_id, kind, label_id, label, weight, freq, "
        f"(weight > 0) AS _weight_ok FROM read_parquet('{glob}')"
    ).df()
    ok, meta = ge_suites.validate_df(
        df, "marts_researchers", ge_suites.marts_researchers_expectations()
    )
    return _result(ok, meta)


def check_researcher_vectors(bucket: str, run_id: str) -> AssetCheckResult:
    """Valide l'agrégat vecteur par author_id (dimension 384 + norme L2 tolérante {0, ≈1}).

    Le vecteur nul d'un author_id sans publication vectorisable est ACCEPTÉ (norme 0) —
    cf. ``embedding.aggregate_author``. Les colonnes dérivées ``_dim_ok``/``_norm_ok``
    sont calculées en SQL DuckDB (``list_aggregate`` pour la norme, sans matérialiser).
    """
    con = lakehouse.connect()
    glob = f"s3://{bucket}/marts/researcher_vectors/dt={CURATED_DT}/run={run_id}/*.parquet"
    dim = embedding.EMBEDDING_DIM
    df = con.sql(
        f"SELECT author_id, vector, "
        f"(len(vector) = {dim}) AS _dim_ok, "
        f"(abs(sqrt(list_aggregate(list_transform(vector, x -> x * x), 'sum')) - 1.0) < 1e-4 "
        f" OR list_aggregate(list_transform(vector, x -> x * x), 'sum') = 0.0) AS _norm_ok "
        f"FROM read_parquet('{glob}')"
    ).df()
    ok, meta = ge_suites.validate_df(
        df, "marts_researcher_vectors", ge_suites.marts_researcher_vectors_expectations()
    )
    return _result(ok, meta)


def check_index_load(bucket: str, run_id: str) -> AssetCheckResult:
    """Vérifie que l'index Postgres a EXACTEMENT le nombre de chercheurs attendu (étape 4).

    Confronte count(researchers en base pour la partition courante) au row_count du
    manifest FTS servi (une ligne par chercheur). Un écart signale un chargement
    partiel/dupliqué (l'idempotence DELETE+INSERT a échoué) — porte bloquante.
    """
    con = lakehouse.connect()
    manifest_path = (
        f"s3://{bucket}/marts/researchers_fts/dt={CURATED_DT}/run={run_id}/manifest.json"
    )
    manifest = json.loads(
        con.sql(f"SELECT content FROM read_text('{manifest_path}')").fetchone()[0]
    )
    expected = manifest["row_count"]

    lakehouse.attach_postgres(con, postgres_target_from_env())
    loaded = con.sql(
        f"SELECT count(*) FROM pg.researchers WHERE dt = '{CURATED_DT}' AND run = '{run_id}'"
    ).fetchone()[0]
    passed = loaded == expected
    return _result(
        passed,
        {
            "suite": "index_load",
            "evaluated": 1,
            "failed": []
            if passed
            else [f"count Postgres={loaded} != manifest row_count={expected}"],
        },
    )


# ── Asset checks Dagster (minces : résolvent le run puis délèguent) ───────────


@asset_check(asset=AssetKey(["raw_snapshot"]), name="ge_raw_contract", blocking=True)
def ge_raw_contract(context: AssetCheckExecutionContext) -> AssetCheckResult:
    return check_raw(ceph_target_from_env().bucket)


@asset_check(asset=AssetKey(["curated_edges"]), name="ge_curated_edges", blocking=True)
def ge_curated_edges(context: AssetCheckExecutionContext) -> AssetCheckResult:
    return check_curated_edges(ceph_target_from_env().bucket, context.run.run_id)


@asset_check(asset=AssetKey(["marts_collab_pairs"]), name="ge_marts_collab", blocking=True)
def ge_marts_collab(context: AssetCheckExecutionContext) -> AssetCheckResult:
    return check_marts(ceph_target_from_env().bucket, context.run.run_id)


@asset_check(asset=AssetKey(["marts_researchers"]), name="ge_marts_researchers", blocking=True)
def ge_marts_researchers(context: AssetCheckExecutionContext) -> AssetCheckResult:
    return check_researchers(ceph_target_from_env().bucket, context.run.run_id)


@asset_check(asset=AssetKey(["researcher_embeddings"]), name="ge_researcher_vectors", blocking=True)
def ge_researcher_vectors(context: AssetCheckExecutionContext) -> AssetCheckResult:
    return check_researcher_vectors(ceph_target_from_env().bucket, context.run.run_id)


@asset_check(asset=AssetKey(["index_load"]), name="ge_index_load", blocking=True)
def ge_index_load(context: AssetCheckExecutionContext) -> AssetCheckResult:
    return check_index_load(ceph_target_from_env().bucket, context.run.run_id)
