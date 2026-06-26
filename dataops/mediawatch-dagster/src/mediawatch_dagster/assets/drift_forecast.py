"""Suivi de DÉRIVE du modèle de prévision — asset check à porte de sécurité (ADR 0081/0068).

Première brique de drift de mediawatch (jusqu'ici sans modèle, donc sans signal de dérive).
Compare le run courant (N) au run consigné précédent (N-1) sur deux signaux :

1. **distribution des prévisions** (``ColumnDriftMetric`` Evidently sur ``n_articles_pred``)
   — décalage des volumes prédits ;
2. **bascule ``served_mode``** — passage ``predictive → descriptive`` (perte totale de
   pouvoir prédictif honnête).

PORTE DE SÉCURITÉ (parité ADR 0068) : un décalage de distribution est **informatif** (check
marqué, loggué MLflow, run NON interrompu) ; la seule bascule ``predictive → descriptive``
est **BLOQUANTE** — servir silencieusement une baseline là où l'on servait un modèle est un
changement de contrat majeur qui doit ARRÊTER le pipeline pour intervention humaine.

Architecture calquée sur ``citation`` ``drift_uplift.py`` : corps purs testables + wrapper
``@asset_check``. Best-effort MLflow. Le mart de prévisions est partitionné par jour
d'exécution (``dt=``), donc ``_list_runs`` parcourt toutes les partitions.

NB : pas de ``from __future__ import annotations`` (Dagster introspecte, drift D9).
"""

import os

from dagster import AssetCheckExecutionContext, AssetCheckResult, AssetKey, asset_check

from mediawatch_dagster import lakehouse
from mediawatch_dagster.resources import ceph_target_from_env

_FORECAST_SUBDIR = "marts/university_timeline_forecast"


def _list_runs(con, bucket: str) -> list[str]:
    """run_id présents sous ``marts/university_timeline_forecast/dt=…/``, triés (ordre S3
    lexical = chronologique car run_id Dagster horodaté). Parcourt TOUTES les partitions
    ``dt=`` (le forecast est partitionné par jour d'exécution)."""
    glob = f"s3://{bucket}/{_FORECAST_SUBDIR}/dt=*/run=*/*.parquet"
    rows = con.sql(
        f"SELECT DISTINCT run FROM read_parquet('{glob}', hive_partitioning=true) ORDER BY run"
    ).fetchall()
    return [r[0] for r in rows]


def _load_run_summary(con, bucket: str, run_id: str) -> dict:
    """Résume un run de prévision : distribution des ``n_articles_pred`` (DataFrame une
    colonne, pour Evidently) et ``served_mode`` du run (constant par run)."""
    glob = f"s3://{bucket}/{_FORECAST_SUBDIR}/dt=*/run={run_id}/*.parquet"
    pred_df = con.sql(
        f"SELECT n_articles_pred FROM read_parquet('{glob}', hive_partitioning=true)"
    ).df()
    mode_rows = con.sql(
        f"SELECT DISTINCT served_mode FROM read_parquet('{glob}', hive_partitioning=true)"
    ).fetchall()
    served_mode = mode_rows[0][0] if mode_rows else "descriptive"
    return {"pred_df": pred_df, "served_mode": served_mode, "n": len(pred_df)}


def compute_distribution_drift(reference_df, current_df) -> dict:
    """Drift de la distribution des prévisions (PUR, sans I/O ni Dagster). Evidently
    ``ColumnDriftMetric`` sur ``n_articles_pred`` ; verdict statistique d'Evidently (pas un
    seuil maison). Imports différés (Evidently lourd au démarrage)."""
    from evidently import ColumnMapping
    from evidently.metrics import ColumnDriftMetric
    from evidently.report import Report

    mapping = ColumnMapping(numerical_features=["n_articles_pred"])
    report = Report(metrics=[ColumnDriftMetric(column_name="n_articles_pred")])
    report.run(reference_data=reference_df, current_data=current_df, column_mapping=mapping)
    result = report.as_dict()["metrics"][0]["result"]
    return {
        "drift_score": float(result.get("drift_score", 0.0)),
        "drift_detected": bool(result.get("drift_detected", False)),
        "method": result.get("stattest_name", "—"),
        "html": report.get_html(),
    }


def evaluate_regression(reference: dict, current: dict) -> dict:
    """Verdict de dérive (PUR) à partir des résumés N-1 et N. ``regressed`` = True UNIQUEMENT
    si on passe de ``predictive`` à ``descriptive`` — le seul motif BLOQUANT (ADR 0068)."""
    served_from = reference["served_mode"]
    served_to = current["served_mode"]
    regressed = served_from == "predictive" and served_to == "descriptive"
    if regressed:
        verdict = "BASCULE predictive → descriptive : perte de pouvoir prédictif (bloquant)"
    elif served_from == "descriptive" and served_to == "predictive":
        verdict = "rétablissement descriptive → predictive (favorable)"
    else:
        verdict = f"served_mode stable ({served_to})"
    return {
        "regressed": regressed,
        "served_from": served_from,
        "served_to": served_to,
        "verdict": verdict,
    }


def _log_to_mlflow(run_id: str, payload: dict) -> bool:
    """Logge le drift de prévision dans MLflow (best-effort). False si non configuré/joignable
    (le check ne DÉPEND pas de MLflow). ``MLFLOW_TRACKING_URI`` absent → on n'essaie pas."""
    if not os.environ.get("MLFLOW_TRACKING_URI"):
        return False
    try:
        import mlflow

        mlflow.set_experiment("mediawatch_forecast_drift")
        with mlflow.start_run(run_name=run_id):
            mlflow.log_param("run_id", run_id)
            mlflow.log_param("served_from", payload["served_from"])
            mlflow.log_param("served_to", payload["served_to"])
            mlflow.log_metric("forecast_drift_score", payload["drift_score"])
            mlflow.log_metric("forecast_drift_detected", int(payload["drift_detected"]))
            mlflow.log_metric("served_mode_regressed", int(payload["regressed"]))
            html = payload.get("html")
            if html:
                mlflow.log_text(html, "evidently_forecast_drift_report.html")
    except Exception:  # noqa: BLE001 — best-effort : MLflow ne casse jamais le check
        return False
    return True


def check_forecast_drift(bucket: str, run_id: str) -> AssetCheckResult:
    """Mesure la dérive du modèle de prévision (N vs N-1) — porte de sécurité (ADR 0068).

    Premier run (aucun N-1) : check PASSÉ, « baseline absente ». Sinon : drift de
    distribution (informatif) + verdict de bascule ``served_mode``. ``passed`` est False
    UNIQUEMENT sur la bascule ``predictive → descriptive`` (bloquant)."""
    con = lakehouse.connect()
    runs = _list_runs(con, bucket)
    previous = [r for r in runs if r < run_id]
    if not previous:
        return AssetCheckResult(
            passed=True,
            metadata={"drift": "baseline absente (1er run) — rien à comparer", "run_id": run_id},
        )
    baseline_run = previous[-1]
    reference = _load_run_summary(con, bucket, baseline_run)
    current = _load_run_summary(con, bucket, run_id)

    dist = compute_distribution_drift(reference["pred_df"], current["pred_df"])
    reg = evaluate_regression(reference, current)

    payload = {**dist, **reg}
    logged = _log_to_mlflow(run_id, payload)

    return AssetCheckResult(
        # Porte de sécurité : seule la bascule predictive→descriptive bloque (ADR 0068).
        passed=not reg["regressed"],
        metadata={
            "baseline_run": baseline_run,
            "served_from": reg["served_from"],
            "served_to": reg["served_to"],
            "served_mode_regressed": reg["regressed"],
            "forecast_drift_score": round(dist["drift_score"], 4),
            "forecast_distribution_drift": dist["drift_detected"],
            "method": dist["method"],
            "mlflow_logged": logged,
            "verdict": reg["verdict"],
        },
    )


# ── Asset check Dagster (mince : résout le run puis délègue) ──────────────────


@asset_check(
    asset=AssetKey(["forecast_university_timeline"]),
    name="evidently_forecast_drift",
    blocking=True,
)
def evidently_forecast_drift(context: AssetCheckExecutionContext) -> AssetCheckResult:
    return check_forecast_drift(ceph_target_from_env().bucket, context.run.run_id)
