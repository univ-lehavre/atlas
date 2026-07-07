"""Suivi de DÉRIVE du modèle de prévision des vues — asset check à porte de sécurité (ADR 0098).

Première brique de drift de pageviews (jusqu'ici sans modèle, donc sans signal de dérive).
Compare le run courant (N) au run consigné précédent (N-1) sur deux signaux :

1. **distribution des prévisions** (``ColumnDriftMetric`` Evidently sur ``views_pred``)
   — décalage des volumes de vues prédits ;
2. **bascule ``served_mode``** — passage ``predictive → descriptive`` (perte totale de
   pouvoir prédictif honnête).

PORTE DE SÉCURITÉ (parité ADR 0068/0098) : un décalage de distribution est **informatif**
(check marqué, loggué MLflow, run NON interrompu) ; la seule bascule
``predictive → descriptive`` est **BLOQUANTE** — servir silencieusement une baseline là où
l'on servait un modèle est un changement de contrat majeur qui doit ARRÊTER le pipeline pour
intervention humaine.

Architecture calquée sur ``mediawatch`` ``drift_forecast.py`` : corps purs testables +
wrapper ``@asset_check``. Best-effort MLflow. Le mart de prévisions est partitionné par jour
d'exécution (``dt=``), donc ``_list_runs`` parcourt toutes les partitions.

NB : pas de ``from __future__ import annotations`` (Dagster introspecte, drift D9). Les
helpers rclone/partitions sont inlinés ici (pageviews n'a pas encore de module ``manifest``
ni ``partitions`` partagé) tout en gardant la frontière pur/glue.
"""

import json
import os
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from dagster import AssetCheckExecutionContext, AssetCheckResult, AssetKey, asset_check

from pageviews_dagster import lakehouse
from pageviews_dagster.resources import ceph_target_from_env, render_rclone_config

# Sous-répertoire du mart de prévision servi (même nom neutre que lakehouse/lineage/dbt).
_FORECAST_SUBDIR = "marts/views_forecast"

# Préfixe du brut des vues mensuelles ingéré (``raw/pageviews/dt=<month>/…``). Son avancée
# est le signal de « donnée neuve » (garde-fou anti-emballement de la boucle drift→retrain).
_RAW_SUBDIR = "raw/pageviews"

# Colonne des prévisions servie par le mart (contrat ge_suites ``_MARTS_FORECAST_COLS``).
_PRED_COLUMN = "views_pred"

# Experiment MLflow DÉDIÉ au drift de prévision — convention `pageviews`, jamais une marque.
_DRIFT_EXPERIMENT = "pageviews_forecast_drift"

# Clé S3 du VERDICT de dérive du modèle de prévision (signal de contrôle, hors marts
# immuables — comme mediawatch/citation). Écrasée à chaque run ; l'historique reste dans
# MLflow. C'est la SOURCE LISIBLE par le sensor de boucle fermée (definitions.py) : le
# verdict n'était jusqu'ici qu'un AssetCheckResult (illisible d'un sensor externe). On
# persiste donc un document JSON dédié, lu via rclone.
DRIFT_VERDICT_KEY = "drift/views_forecast/_drift_verdict.json"
DRIFT_VERDICT_SCHEMA_VERSION = 1

# Partition ingérée = un dossier ``dt=<valeur>`` sous ``raw/pageviews/`` (série mensuelle :
# la valeur est un mois, mais le scan reste agnostique du format pour rester robuste).
_DT_RE = re.compile(r"(?:^|/)dt=([^/]+)(?:/|$)")


# ── Corps purs (sans I/O ni Dagster) ─────────────────────────────────────────


def ingested_partitions(entries: list) -> set:
    """Extrait les partitions ``dt=…`` distinctes d'un lsjson de ``raw/pageviews`` (PUR).

    ``entries`` = sortie ``rclone lsjson -R`` (champs ``Path`` relatif au préfixe listé).
    Best-effort : un chemin sans ``dt=`` conforme est ignoré (ne casse pas le scan). Ce
    signal d'avancée de l'ingestion alimente le garde-fou anti-emballement : la boucle ne
    réentraîne que si ces partitions ont AVANCÉ (réentraîner sur la même donnée ne fait pas
    disparaître le drift)."""
    found = set()
    for entry in entries:
        match = _DT_RE.search(entry.get("Path", ""))
        if match:
            found.add(match.group(1))
    return found


def parse_lsjson_entries(stdout: str) -> list:
    """Parse la sortie ``rclone lsjson`` (récursive) en liste d'entrées brutes (PUR)."""
    return json.loads(stdout) if stdout.strip() else []


def compute_distribution_drift(reference_df, current_df) -> dict:
    """Drift de la distribution des prévisions (PUR, sans I/O ni Dagster). Evidently
    ``ColumnDriftMetric`` sur ``views_pred`` ; verdict statistique d'Evidently (pas un seuil
    maison). Imports différés (Evidently lourd au démarrage)."""
    from evidently import ColumnMapping
    from evidently.metrics import ColumnDriftMetric
    from evidently.report import Report

    mapping = ColumnMapping(numerical_features=[_PRED_COLUMN])
    report = Report(metrics=[ColumnDriftMetric(column_name=_PRED_COLUMN)])
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


def build_drift_verdict(
    run_id: str, baseline_run: str, dist: dict, reg: dict, partitions: list
) -> dict:
    """Document de verdict de dérive (PUR, sans I/O). Source lisible par le sensor de boucle
    fermée (ADR 0082). Le champ ``partitions`` (mois de vues ingérés vus au moment de la
    mesure) est la clé du garde-fou anti-emballement : la boucle ne réentraîne que si ces
    partitions ont AVANCÉ depuis le dernier retrain. ``produced_at`` injecté par l'appelant
    (horloge hors du pur).

    ``drift_detected`` combine le décalage de distribution OU la bascule de mode : la boucle
    se déclenche sur l'un ou l'autre (un changement de régime du modèle justifie un retrain)."""
    return {
        "schema_version": DRIFT_VERDICT_SCHEMA_VERSION,
        "run_id": run_id,
        "baseline_run": baseline_run,
        "drift_detected": bool(dist["drift_detected"]) or bool(reg["regressed"]),
        "drift_score": round(float(dist["drift_score"]), 4),
        "served_mode_regressed": bool(reg["regressed"]),
        "partitions": sorted(partitions),
    }


# ── Glue I/O (DuckDB + rclone) ───────────────────────────────────────────────


def _run_rclone(args: list, config_path: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["rclone", "--config", str(config_path), *args],
        capture_output=True,
        text=True,
        check=False,
    )


def _list_runs(con, bucket: str) -> list:
    """run_id présents sous ``marts/views_forecast/dt=…/``, triés (ordre S3 lexical =
    chronologique car run_id Dagster horodaté). Parcourt TOUTES les partitions ``dt=`` (le
    forecast est partitionné par jour d'exécution)."""
    glob = f"s3://{bucket}/{_FORECAST_SUBDIR}/dt=*/run=*/*.parquet"
    rows = con.sql(
        f"SELECT DISTINCT run FROM read_parquet('{glob}', hive_partitioning=true) ORDER BY run"
    ).fetchall()
    return [r[0] for r in rows]


def _load_run_summary(con, bucket: str, run_id: str) -> dict:
    """Résume un run de prévision : distribution des ``views_pred`` (DataFrame une colonne,
    pour Evidently) et ``served_mode`` du run (constant par run)."""
    glob = f"s3://{bucket}/{_FORECAST_SUBDIR}/dt=*/run={run_id}/*.parquet"
    pred_df = con.sql(
        f"SELECT {_PRED_COLUMN} FROM read_parquet('{glob}', hive_partitioning=true)"
    ).df()
    mode_rows = con.sql(
        f"SELECT DISTINCT served_mode FROM read_parquet('{glob}', hive_partitioning=true)"
    ).fetchall()
    served_mode = mode_rows[0][0] if mode_rows else "descriptive"
    return {"pred_df": pred_df, "served_mode": served_mode, "n": len(pred_df)}


def _log_to_mlflow(run_id: str, payload: dict) -> bool:
    """Logge le drift de prévision dans MLflow (best-effort). False si non configuré/joignable
    (le check ne DÉPEND pas de MLflow). ``MLFLOW_TRACKING_URI`` absent → on n'essaie pas."""
    if not os.environ.get("MLFLOW_TRACKING_URI"):
        return False
    try:
        import mlflow

        mlflow.set_experiment(_DRIFT_EXPERIMENT)
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


def _verdict_path(bucket: str) -> str:
    return f"ceph:{bucket}/{DRIFT_VERDICT_KEY}"


def write_drift_verdict(verdict: dict, bucket: str, config_path: Path) -> bool:
    """Écrit le verdict en S3 (rclone rcat, clé unique écrasée). Best-effort : True si écrit,
    False sinon — la persistance ne doit jamais casser le check (informatif)."""
    payload = json.dumps(verdict, sort_keys=True)
    result = subprocess.run(
        ["rclone", "--config", str(config_path), "rcat", _verdict_path(bucket)],
        input=payload,
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


def read_drift_verdict(bucket: str, config_path: Path) -> dict:
    """Lit le verdict de dérive (``{}`` si absent ou illisible — bootstrap/dev). Lu par le
    sensor de boucle fermée (definitions.py)."""
    result = subprocess.run(
        ["rclone", "--config", str(config_path), "cat", _verdict_path(bucket)],
        capture_output=True,
        text=True,
        check=False,
    )
    raw = result.stdout.lstrip("﻿").strip()
    if result.returncode != 0 or not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _persist_verdict(bucket: str, run_id: str, baseline_run: str, dist: dict, reg: dict) -> bool:
    """Liste les partitions de vues ingérées (signal de donnée neuve) et écrit le verdict en
    S3 (best-effort). Rend un rclone.conf temporaire (comme les assets). Sans accès S3,
    no-op."""
    try:
        target = ceph_target_from_env()
        with tempfile.TemporaryDirectory() as tmp:
            config_path = Path(tmp) / "rclone.conf"
            config_path.write_text(render_rclone_config(target))
            proc = _run_rclone(
                ["lsjson", "-R", "--dirs-only", f"ceph:{target.bucket}/{_RAW_SUBDIR}"],
                config_path,
            )
            partitions = (
                ingested_partitions(parse_lsjson_entries(proc.stdout))
                if proc.returncode == 0
                else set()
            )
            verdict = build_drift_verdict(run_id, baseline_run, dist, reg, list(partitions))
            verdict["produced_at"] = datetime.now(timezone.utc).isoformat()
            return write_drift_verdict(verdict, target.bucket, config_path)
    except Exception:  # noqa: BLE001 — best-effort : la persistance ne casse jamais le check
        return False


def check_forecast_drift(bucket: str, run_id: str) -> AssetCheckResult:
    """Mesure la dérive du modèle de prévision (N vs N-1) — porte de sécurité (ADR 0068/0098).

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
    # Persiste le verdict en S3 (avec les partitions de vues ingérées) : source lisible par
    # le sensor de boucle fermée drift→retrain (definitions.py, ADR 0082). Best-effort.
    persisted = _persist_verdict(bucket, run_id, baseline_run, dist, reg)

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
            "verdict_persisted": persisted,
            "verdict": reg["verdict"],
        },
    )


# ── Asset check Dagster (mince : résout le run puis délègue) ──────────────────


@asset_check(
    asset=AssetKey(["forecast_views"]),
    name="evidently_forecast_drift",
    blocking=True,
)
def evidently_forecast_drift(context: AssetCheckExecutionContext) -> AssetCheckResult:
    return check_forecast_drift(ceph_target_from_env().bucket, context.run.run_id)
