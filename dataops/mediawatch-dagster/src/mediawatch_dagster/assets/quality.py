"""Asset checks Great Expectations BLOQUANTS des couches brutes GKG.

Un *asset check* Dagster en **porte de qualité bloquante** (``blocking=True``) : un
échec d'attente fait échouer le run et empêche l'aval (transformations dbt). Ils
s'appliquent à ``raw_native_gkg`` (couche native 27 champs) et ``raw_gkg`` (couche
projetée 6 champs) — le brut Parquet n'a aucun test dbt (ADR 0100).

La donnée est chargée via DuckDB (``lakehouse.connect``) en ``DataFrame`` pandas,
puis validée par la suite pure de ``ge_suites`` (contexte GE éphémère, hermétique).

Le run courant est résolu par ``context.run.run_id`` (l'``AssetCheckExecutionContext``
n'expose PAS ``run_id`` directement, contrairement à l'``AssetExecutionContext``).

NB : pas de ``from __future__ import annotations`` (Dagster introspecte, drift D9).
"""

from dagster import AssetCheckExecutionContext, AssetCheckResult, AssetKey, asset_check

from mediawatch_dagster import ge_suites, lakehouse
from mediawatch_dagster.resources import ceph_target_from_env


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


def check_raw_native_gkg(bucket: str) -> AssetCheckResult:
    """Valide le brut GKG NATIF (les 27 colonnes V2.1, ADR 0100).

    Lit le Parquet natif (``hive_partitioning=false`` neutralise les colonnes fantômes
    ``dt``/``run`` du chemin Hive) et valide le contrat structurel des 27 champs +
    non-vacuité de l'identifiant/date + format du timestamp.
    """
    con = lakehouse.connect()
    df = con.sql(
        f"SELECT * FROM read_parquet('s3://{bucket}/raw_native/gkg/**/*.parquet', "
        "hive_partitioning=false, union_by_name=true)"
    ).df()
    ok, meta = ge_suites.validate_df(df, "raw_native_gkg", ge_suites.raw_native_gkg_expectations())
    return _result(ok, meta)


def check_raw_gkg(bucket: str) -> AssetCheckResult:
    """Valide le brut GKG projeté (contrat structurel + format du timestamp).

    Projette les seules colonnes que la suite valide (au lieu d'un SELECT *) : plus
    robuste si le schéma évolue, plus léger. Le brut projeté est en Parquet (ADR 0100) ;
    ``hive_partitioning=false`` neutralise les colonnes fantômes ``dt``/``run`` du chemin.
    """
    con = lakehouse.connect()
    df = con.sql(
        "SELECT record_id, date, organization, source_common_name, "
        "document_identifier, translated "
        f"FROM read_parquet('s3://{bucket}/raw/gkg/**/*.parquet', "
        "hive_partitioning=false, union_by_name=true)"
    ).df()
    ok, meta = ge_suites.validate_df(df, "raw_gkg", ge_suites.raw_gkg_expectations())
    return _result(ok, meta)


def check_curated_universities(bucket: str, dt: str, run_id: str) -> AssetCheckResult:
    """Valide le curated des mentions qualifiées « université » (contrat servi).

    Lit la partition immuable ``dt=<jour>/run=<run_id>/`` du modèle dbt
    ``curated_university_mentions`` et valide le contrat de colonnes + non-vacuité.
    """
    con = lakehouse.connect()
    glob = f"s3://{bucket}/curated/curated_university_mentions/dt={dt}/run={run_id}/*.parquet"
    df = con.sql(
        f"SELECT record_id, event_date, university_id, university_name FROM read_parquet('{glob}')"
    ).df()
    ok, meta = ge_suites.validate_df(
        df, "curated_university_mentions", ge_suites.curated_university_mentions_expectations()
    )
    return _result(ok, meta)


@asset_check(asset=AssetKey(["raw_native_gkg"]), name="ge_raw_native_gkg", blocking=True)
def ge_raw_native_gkg(context: AssetCheckExecutionContext) -> AssetCheckResult:
    """Porte de qualité bloquante du brut GKG natif (27 champs, ADR 0100)."""
    return check_raw_native_gkg(ceph_target_from_env().bucket)


@asset_check(asset=AssetKey(["raw_gkg"]), name="ge_raw_gkg", blocking=True)
def ge_raw_gkg(context: AssetCheckExecutionContext) -> AssetCheckResult:
    """Porte de qualité bloquante du brut GKG projeté."""
    return check_raw_gkg(ceph_target_from_env().bucket)


def check_marts_timeline(bucket: str, dt: str, run_id: str) -> AssetCheckResult:
    """Valide le mart timeline servi (contrat de colonnes + bornes de sanité).

    Lit la partition immuable ``dt=<jour>/run=<run_id>/`` du modèle dbt
    ``marts_university_timeline`` et valide le contrat consommé par l'application.
    """
    con = lakehouse.connect()
    glob = f"s3://{bucket}/marts/university_timeline/dt={dt}/run={run_id}/*.parquet"
    df = con.sql(
        f"SELECT university_id, university_name, event_date, n_articles FROM read_parquet('{glob}')"
    ).df()
    ok, meta = ge_suites.validate_df(
        df, "marts_university_timeline", ge_suites.marts_university_timeline_expectations()
    )
    return _result(ok, meta)


@asset_check(
    asset=AssetKey(["curated_university_mentions"]),
    name="ge_curated_universities",
    blocking=True,
)
def ge_curated_universities(context: AssetCheckExecutionContext) -> AssetCheckResult:
    """Porte de qualité bloquante du curated des mentions université."""
    return check_curated_universities(
        ceph_target_from_env().bucket, context.partition_key, context.run.run_id
    )


@asset_check(
    asset=AssetKey(["marts_university_timeline"]),
    name="ge_marts_timeline",
    blocking=True,
)
def ge_marts_timeline(context: AssetCheckExecutionContext) -> AssetCheckResult:
    """Porte de qualité bloquante du mart timeline servi."""
    return check_marts_timeline(
        ceph_target_from_env().bucket, context.partition_key, context.run.run_id
    )
