"""Suivi de DÉRIVE du modèle d'uplift FWCI — asset check à porte de sécurité (ADR 0068).

Pendant du drift d'embeddings (``drift.py``), mais sur le MODÈLE et ses SORTIES, pas sur
ses entrées. Compare le run courant (N) au run consigné précédent (N-1) sur quatre
signaux (ADR 0068) :

1. **distribution des uplift prédits** (``ColumnDriftMetric`` Evidently sur la colonne
   ``uplift`` du mart ``pair_uplift_predictions``) — décalage des prédictions ;
2. **qualité honnête** — R² et ratio MAE/baseline du run vs le précédent (lus du Parquet
   de prédictions via ``served_mode`` et, quand disponible, des métriques d'évaluation) ;
3. **bascule ``served_mode``** — passage ``predictive → descriptive`` (perte totale de
   pouvoir prédictif) ;
4. **couverture embedding** — part d'auteurs disposant d'un embedding utilisable.

PORTE DE SÉCURITÉ (ADR 0068) : informatif pour un décalage / une dégradation / une baisse
de couverture (check marqué, loggué MLflow, run NON interrompu) ; **BLOQUANT** sur la
seule bascule ``predictive → descriptive`` — servir silencieusement du descriptif là où
l'on servait du prédictif est un changement de contrat majeur qui doit ARRÊTER le pipeline.

Architecture calquée sur ``drift.py`` : corps pur testable + wrapper ``@asset_check``.
Sélectionne le baseline ``N-1`` par récence ``ModTime`` (``_previous_run``, ADR 0101) et
logge dans MLflow (best-effort).

NB : pas de ``from __future__ import annotations`` (Dagster introspecte, drift D9).
"""

import json
import os
import subprocess
import tempfile
from pathlib import Path

from dagster import AssetCheckExecutionContext, AssetCheckResult, AssetKey, asset_check

from citation_dagster import lakehouse, last_run
from citation_dagster.dbt import CURATED_DT
from citation_dagster.resources import ceph_target_from_env, render_rclone_config

_PREDICTIONS_SUBDIR = "marts/pair_uplift_predictions"


def _previous_run(bucket: str, run_id: str) -> str | None:
    """``N-1`` = run le plus récent STRICTEMENT antérieur à ``N`` par ``ModTime`` S3 (ADR 0101).

    ``None`` si ``N`` est le premier run. Liste ``marts/pair_uplift_predictions`` via
    ``rclone`` : le contenu DuckDB n'est PAS requis pour ordonner les runs (la présence du
    part = run complet, ``COPY`` atomique) — on ordonne par ``ModTime``, PAS par l'ordre
    lexical du ``run=`` (uuid4 aléatoire ; l'ancien ``ORDER BY run`` élisait un baseline au
    hasard). Construit son ``rclone.conf`` temporaire."""
    target = ceph_target_from_env()
    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))
        root = f"ceph:{bucket}/{_PREDICTIONS_SUBDIR}"
        proc = subprocess.run(
            [
                "rclone",
                "--config",
                str(config_path),
                "lsjson",
                "-R",
                "--include",
                "*.parquet",
                root,
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            return None
        entries = json.loads(proc.stdout) if proc.stdout.strip() else []
        return last_run.previous_complete_run(entries, run_id)


def _load_run_summary(con, bucket: str, run_id: str) -> dict:
    """Résume un run d'uplift depuis son mart de prédictions : distribution des ``uplift``
    (DataFrame une colonne, pour Evidently) et ``served_mode`` du run (constant par run).

    Renvoie ``{uplift_df, served_mode, n}``. Le ``served_mode`` est porté identiquement par
    toutes les lignes du run → on lit la première valeur distincte."""
    glob = f"s3://{bucket}/{_PREDICTIONS_SUBDIR}/dt={CURATED_DT}/run={run_id}/*.parquet"
    uplift_df = con.sql(f"SELECT uplift FROM read_parquet('{glob}')").df()
    mode_rows = con.sql(f"SELECT DISTINCT served_mode FROM read_parquet('{glob}')").fetchall()
    served_mode = mode_rows[0][0] if mode_rows else "descriptive"
    return {"uplift_df": uplift_df, "served_mode": served_mode, "n": len(uplift_df)}


def compute_distribution_drift(reference_df, current_df) -> dict:
    """Drift de la distribution des ``uplift`` prédits (PUR, sans I/O ni Dagster).

    Evidently ``ColumnDriftMetric`` sur la colonne ``uplift``. Renvoie
    ``{drift_score, drift_detected, method, html}``. Le verdict est celui d'Evidently
    (test statistique), pas un seuil maison — cohérence avec ``drift.py``."""
    from evidently import ColumnMapping
    from evidently.metrics import ColumnDriftMetric
    from evidently.report import Report

    mapping = ColumnMapping(numerical_features=["uplift"])
    report = Report(metrics=[ColumnDriftMetric(column_name="uplift")])
    report.run(reference_data=reference_df, current_data=current_df, column_mapping=mapping)
    result = report.as_dict()["metrics"][0]["result"]
    return {
        "drift_score": float(result.get("drift_score", 0.0)),
        "drift_detected": bool(result.get("drift_detected", False)),
        "method": result.get("stattest_name", "—"),
        "html": report.get_html(),
    }


def evaluate_regression(reference: dict, current: dict) -> dict:
    """Verdict de dérive du modèle (PUR) à partir des résumés N-1 (``reference``) et N
    (``current``). Distingue la bascule GRAVE (predictive → descriptive) des signaux
    informatifs. Renvoie ``{regressed, served_from, served_to, verdict}``.

    ``regressed`` = True UNIQUEMENT si on passe de ``predictive`` à ``descriptive`` — c'est
    le seul motif BLOQUANT (ADR 0068) : perte totale de pouvoir prédictif honnête."""
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
    """Logge le drift d'uplift dans MLflow (best-effort). True si loggué, False si MLflow
    n'est pas configuré/joignable (le check ne DÉPEND pas de MLflow). ``MLFLOW_TRACKING_URI``
    absent → on n'essaie pas (dev local hors cluster)."""
    if not os.environ.get("MLFLOW_TRACKING_URI"):
        return False
    try:
        import mlflow

        mlflow.set_experiment("citation_uplift_drift")
        with mlflow.start_run(run_name=run_id):
            mlflow.log_param("run_id", run_id)
            mlflow.log_param("dt", CURATED_DT)
            mlflow.log_param("served_from", payload["served_from"])
            mlflow.log_param("served_to", payload["served_to"])
            mlflow.log_metric("uplift_drift_score", payload["drift_score"])
            mlflow.log_metric("uplift_drift_detected", int(payload["drift_detected"]))
            mlflow.log_metric("served_mode_regressed", int(payload["regressed"]))
            html = payload.get("html")
            if html:
                mlflow.log_text(html, "evidently_uplift_drift_report.html")
    except Exception:  # noqa: BLE001 — best-effort : MLflow ne casse jamais le check
        return False
    return True


def check_uplift_drift(bucket: str, run_id: str) -> AssetCheckResult:
    """Mesure la dérive du modèle d'uplift (N vs N-1) — porte de sécurité (ADR 0068).

    Premier run (aucun N-1) : check PASSÉ, « baseline absente ». Sinon : drift de
    distribution (Evidently) + verdict de bascule ``served_mode``. ``passed`` est False
    UNIQUEMENT sur la bascule ``predictive → descriptive`` (bloquant) ; un simple décalage
    de distribution est rapporté en métadonnée sans faire échouer le run (informatif)."""
    con = lakehouse.connect()
    # Baseline = le run complet le plus récent STRICTEMENT antérieur à N par ModTime (ADR 0101),
    # PAS l'ancien previous[-1] d'un tri lexical de run= uuid4 (baseline aléatoire).
    baseline_run = _previous_run(bucket, run_id)
    if baseline_run is None:
        return AssetCheckResult(
            passed=True,
            metadata={"drift": "baseline absente (1er run) — rien à comparer", "run_id": run_id},
        )
    reference = _load_run_summary(con, bucket, baseline_run)
    current = _load_run_summary(con, bucket, run_id)

    dist = compute_distribution_drift(reference["uplift_df"], current["uplift_df"])
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
            "uplift_drift_score": round(dist["drift_score"], 4),
            "uplift_distribution_drift": dist["drift_detected"],
            "method": dist["method"],
            "mlflow_logged": logged,
            "verdict": reg["verdict"],
        },
    )


# ── Asset check Dagster (mince : résout le run puis délègue) ──────────────────


@asset_check(
    asset=AssetKey(["pair_uplift_model"]),
    name="evidently_uplift_drift",
    blocking=True,
)
def evidently_uplift_drift(context: AssetCheckExecutionContext) -> AssetCheckResult:
    return check_uplift_drift(ceph_target_from_env().bucket, context.run.run_id)
