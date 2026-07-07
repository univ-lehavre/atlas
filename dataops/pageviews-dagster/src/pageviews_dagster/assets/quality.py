"""Asset checks Great Expectations BLOQUANTS de la code-location « pageviews ».

Deux *asset checks* Dagster en **porte de qualité bloquante** (``blocking=True``) : un
échec d'attente fait échouer le run et empêche l'aval (transformations dbt, puis
écriture du manifest sentinelle du mart de prévisions). Ils s'appliquent à deux couches :

- ``ge_raw_pageviews`` sur ``raw_pageviews`` — le brut de la série mensuelle des vues
  (aucun test dbt ici : le brut ``(university_id, month, views)`` est projeté avant le
  staging) ;
- ``ge_marts_views_forecast`` sur ``forecast_views`` — l'asset qui sert le mart de
  prévision ``marts/views_forecast`` : contrat de colonnes + domaines (horizons, mode de
  service) + bornes + unicité du grain ``(university_id, horizon_label)``.

Ils **complètent** les *asset checks* que dagster-dbt génère à partir des tests dbt et
l'``evidently_forecast_drift`` (noms distincts ``ge_*`` → aucune collision). La donnée est
chargée via DuckDB (``lakehouse.connect``) en ``DataFrame`` pandas, puis validée par les
suites pures de ``ge_suites`` (contexte GE éphémère, hermétique — aucune I/O disque ni
réseau).

Le run courant est résolu par ``context.run.run_id`` (l'``AssetCheckExecutionContext``
n'expose PAS ``run_id`` directement, contrairement à l'``AssetExecutionContext``). Le mart
de prévisions étant partitionné par JOUR d'exécution (``dt=<run_day>/run=<run_id>/``, photo
au jour J — asset ``forecast_views`` non partitionné Dagster), on ne reconstruit PAS le
jour : on lit toutes les partitions ``dt=*`` filtrées par le ``run={run_id}`` courant
(même patron que ``evidently_forecast_drift``), robuste aux bascules de date.

Le brut des vues est une série mensuelle LÉGÈRE ``(university_id, month, views)`` : on
projette DIRECTEMENT les seules colonnes que la suite valide (au lieu d'un SELECT *) —
plus robuste si le schéma évolue, plus léger, et sans aucun risque de matérialiser une
colonne lourde (contrairement au brut works OpenAlex de citation, aux structs imbriqués
qui débordaient la RAM — drift OOM 2026-07-06 ; ici, aucune colonne imbriquée).

NB : pas de ``from __future__ import annotations`` (Dagster introspecte, drift D9).
"""

import json
import os

from dagster import AssetCheckExecutionContext, AssetCheckResult, AssetKey, asset_check

from pageviews_dagster import ge_suites, lakehouse
from pageviews_dagster.resources import ceph_target_from_env
from pageviews_dagster.tracking import EXPERIMENT_FORECAST

_RAW_SUBDIR = "raw/pageviews"
_FORECAST_SUBDIR = "marts/views_forecast"

# Experiment MLflow où l'on republie le verdict des portes GE (à côté des runs du
# modèle de prévision) : vue « rapports qualité » unifiée. Convention neutre `pageviews`.
_QUALITY_EXPERIMENT = EXPERIMENT_FORECAST


def _log_ge_to_mlflow(check_name: str, run_id: str, result: AssetCheckResult) -> bool:
    """Logge le RÉSULTAT d'un asset check GE dans MLflow (best-effort).

    Les suites GE sont validées in-process : leur verdict n'était visible que dans l'UI
    Dagster. On publie ici, comme run MLflow (UI MLflow déjà exposée par le socle), le
    verdict + les métadonnées (suite, evaluated, failed) pour une vue « rapports
    qualité » unifiée à côté du modèle de prévision. Best-effort : MLflow ne doit JAMAIS
    faire échouer une porte de qualité. ``MLFLOW_TRACKING_URI`` absent (dev/CI
    hermétique) → no-op. Renvoie True si loggué, False sinon (le check ne DÉPEND pas de
    MLflow).
    """
    if not os.environ.get("MLFLOW_TRACKING_URI"):
        return False
    try:
        import mlflow

        # Les valeurs de métadonnée sont des MetadataValue Dagster → .value/.text ; on
        # sérialise leur représentation texte (robuste quel que soit le type).
        meta = {k: getattr(v, "value", getattr(v, "text", v)) for k, v in result.metadata.items()}
        payload = {"check": check_name, "run_id": run_id, "passed": result.passed, **meta}
        mlflow.set_experiment(_QUALITY_EXPERIMENT)
        with mlflow.start_run(run_name=f"{check_name}:{run_id}"):
            mlflow.log_param("check", check_name)
            mlflow.log_param("run_id", run_id)
            mlflow.log_metric("passed", int(result.passed))
            mlflow.log_text(json.dumps(payload, ensure_ascii=False, indent=2), f"{check_name}.json")
    except Exception:  # noqa: BLE001 — best-effort : MLflow ne casse jamais la porte GE
        return False
    return True


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


def check_raw_pageviews(bucket: str) -> AssetCheckResult:
    """Valide le brut de la série mensuelle des vues (contrat structurel + format du mois).

    Projette les SEULES colonnes que la suite valide (au lieu d'un SELECT *) : plus robuste
    si le schéma du brut évolue, plus léger, et sans aucun risque de matérialiser une
    colonne lourde. ``hive_partitioning=false`` neutralise les colonnes fantômes
    ``dt``/``run`` du chemin Hive (elles ne font pas partie du contrat de forme). Contrat
    de FORME couvrant toutes les partitions ``dt=<month>`` : la présence des colonnes, le
    format ``AAAAMM`` du mois et la borne ``views >= 0`` sont des invariants par-ligne
    homogènes.
    """
    con = lakehouse.connect()
    df = con.sql(
        "SELECT university_id, month, views "
        f"FROM read_parquet('s3://{bucket}/{_RAW_SUBDIR}/**/*.parquet', "
        "hive_partitioning=false)"
    ).df()
    ok, meta = ge_suites.validate_df(df, "raw_pageviews", ge_suites.raw_pageviews_expectations())
    return _result(ok, meta)


def check_marts_views_forecast(bucket: str, run_id: str) -> AssetCheckResult:
    """Valide le mart de prévision des vues servi (contrat de colonnes + domaines + bornes).

    Lit les parts servies par le ``run={run_id}`` courant sous ``marts/views_forecast/`` —
    toutes partitions ``dt=*`` (le mart est partitionné par jour d'exécution : on ne
    reconstruit pas le jour, on filtre par run, même patron que le drift). Valide le
    contrat consommé par l'application (défense en profondeur sur le Parquet servi).
    L'unicité composite du grain ``(university_id, horizon_label)`` — que GE 1.18 n'exprime
    pas nativement — est portée par la colonne dérivée booléenne ``_unique_grain`` calculée
    ici en SQL DuckDB (fenêtre ``count(*) OVER (PARTITION BY …) = 1``, sans matérialiser
    d'agrégat côté Python).
    """
    con = lakehouse.connect()
    glob = f"s3://{bucket}/{_FORECAST_SUBDIR}/dt=*/run={run_id}/*.parquet"
    df = con.sql(
        "SELECT university_id, horizon_label, views_pred, served_mode, "
        "(count(*) OVER (PARTITION BY university_id, horizon_label) = 1) AS _unique_grain "
        f"FROM read_parquet('{glob}', hive_partitioning=true)"
    ).df()
    ok, meta = ge_suites.validate_df(
        df, "marts_views_forecast", ge_suites.marts_views_forecast_expectations()
    )
    return _result(ok, meta)


# ── Asset checks Dagster (minces : résolvent le run puis délèguent) ───────────


# Chaque wrapper exécute le corps pur PUIS publie le résultat dans MLflow (best-effort)
# avant de le renvoyer à Dagster. Le logging vit au niveau wrapper (en cluster) pour que
# les corps purs (check_*) restent testables hermétiquement.


@asset_check(asset=AssetKey(["raw_pageviews"]), name="ge_raw_pageviews", blocking=True)
def ge_raw_pageviews(context: AssetCheckExecutionContext) -> AssetCheckResult:
    """Porte de qualité bloquante du brut de la série mensuelle des vues."""
    result = check_raw_pageviews(ceph_target_from_env().bucket)
    _log_ge_to_mlflow("ge_raw_pageviews", context.run.run_id, result)
    return result


@asset_check(
    asset=AssetKey(["forecast_views"]),
    name="ge_marts_views_forecast",
    blocking=True,
)
def ge_marts_views_forecast(context: AssetCheckExecutionContext) -> AssetCheckResult:
    """Porte de qualité bloquante du mart de prévision des vues servi."""
    result = check_marts_views_forecast(ceph_target_from_env().bucket, context.run.run_id)
    _log_ge_to_mlflow("ge_marts_views_forecast", context.run.run_id, result)
    return result
