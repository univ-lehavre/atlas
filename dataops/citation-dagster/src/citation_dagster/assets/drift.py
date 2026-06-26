"""Détection de DÉRIVE (drift) des embeddings — asset check NON bloquant (MLOps 1→2).

Pendant des suites Great Expectations (``quality.py``) sur l'axe TEMPOREL : là où GE
valide la VALIDITÉ structurelle d'un run (dimension 384, norme L2, non-null) en porte
BLOQUANTE, ce check mesure si la DISTRIBUTION des vecteurs a DÉRIVÉ entre le run courant
et le précédent (N vs N-1). Le drift n'est pas une erreur de qualité (le run reste
valide) → ``blocking=False`` : il INFORME (score loggué dans MLflow, alerte) et nourrit
la décision de RÉ-ENTRAÎNER (entraînement continu, ``definitions.py``).

Architecture calquée sur ``quality.py`` : un CORPS PUR testable sans Dagster
(``check_embedding_drift``), un wrapper ``@asset_check`` mince qui résout le run et
délègue. Le drift est calculé par Evidently (``EmbeddingsDriftMetric`` sur les 384
colonnes denses) ; les métriques sont loguées dans MLflow (serveur du socle,
``MLFLOW_TRACKING_URI``, contrat cluster ADR 0043) — best-effort si MLflow injoignable.

NB : pas de ``from __future__ import annotations`` (Dagster introspecte, drift D9).
"""

import json
import os
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from dagster import AssetCheckExecutionContext, AssetCheckResult, AssetKey, asset_check

from citation_dagster import embedding, lakehouse, watermark
from citation_dagster.dbt import CURATED_DT
from citation_dagster.resources import ceph_target_from_env, render_rclone_config

_VECTORS_SUBDIR = "marts/researcher_vectors"

# Clé S3 du VERDICT de dérive (signal de contrôle, hors marts/curated immuables — comme
# raw/_watermark.json). Écrasée à chaque run ; l'historique reste dans MLflow. C'est la
# SOURCE LISIBLE par le sensor de boucle fermée (definitions.py) : le verdict journalisé
# en MLflow est best-effort et non atomique, illisible d'un sensor — on persiste donc un
# document JSON dédié, lu via rclone comme le watermark.
DRIFT_VERDICT_KEY = "drift/researcher_embeddings/_drift_verdict.json"
DRIFT_VERDICT_SCHEMA_VERSION = 1
# Le verdict de drift est celui d'Evidently (`drift_detected`), PAS un seuil maison :
# EmbeddingsDriftMetric entraîne par défaut un classifieur ref↔cur et mesure son ROC AUC
# (`drift_score`). AUC ≈ 0.5 = indiscernables (pas de drift) ; AUC → 1 = distribution
# nettement séparée (drift). Sur 384 dimensions, un seuil arbitraire sur le score
# produirait des faux positifs — on délègue la décision au test statistique d'Evidently.


def _list_runs(con, bucket: str) -> list[str]:
    """Les run_id présents sous ``marts/researcher_vectors/dt=…/``, triés (ordre S3 lexical
    = chronologique car run_id Dagster horodaté). DuckDB lit la colonne de partition
    ``run`` via ``hive_partitioning`` ; ``DISTINCT`` dédoublonne les multiples part.parquet."""
    glob = f"s3://{bucket}/{_VECTORS_SUBDIR}/dt={CURATED_DT}/run=*/*.parquet"
    rows = con.sql(
        f"SELECT DISTINCT run FROM read_parquet('{glob}', hive_partitioning=true) ORDER BY run"
    ).fetchall()
    return [r[0] for r in rows]


def _load_vectors_df(con, bucket: str, run_id: str):
    """Charge les vecteurs d'un run en DataFrame à 384 colonnes denses (e0..e383), une
    ligne par author_id. Evidently attend des colonnes scalaires, pas une liste — on
    éclate ``vector`` (LIST de 384 floats) en colonnes via ``vector[i]`` (DuckDB 1-indexé)."""
    dim = embedding.EMBEDDING_DIM
    cols = ", ".join(f"vector[{i + 1}] AS e{i}" for i in range(dim))
    glob = f"s3://{bucket}/{_VECTORS_SUBDIR}/dt={CURATED_DT}/run={run_id}/*.parquet"
    return con.sql(f"SELECT {cols} FROM read_parquet('{glob}')").df()


def compute_drift(reference_df, current_df) -> dict:
    """Score de drift entre deux jeux d'embeddings (PUR, sans I/O ni Dagster).

    ``reference_df``/``current_df`` : DataFrames à colonnes e0..e(dim-1). Renvoie un
    dict ``{drift_score, drift_detected, method}`` via Evidently EmbeddingsDriftMetric.
    Isolé pour être testable sans S3 (DataFrames en mémoire)."""
    # Imports locaux : Evidently est lourd (pandas/scipy/sklearn) — on ne le charge
    # qu'à l'exécution du check, pas à l'import du module (démarrage Dagster rapide).
    from evidently import ColumnMapping
    from evidently.metrics import EmbeddingsDriftMetric
    from evidently.report import Report

    emb_cols = list(reference_df.columns)
    mapping = ColumnMapping(embeddings={"researcher_vectors": emb_cols})
    report = Report(metrics=[EmbeddingsDriftMetric("researcher_vectors")])
    report.run(reference_data=reference_df, current_data=current_df, column_mapping=mapping)
    result = report.as_dict()["metrics"][0]["result"]
    # Le RAPPORT VISUEL (HTML autonome) est capturé ici, en mémoire (get_html, pas de
    # fichier ni de réseau → la fonction reste pure/testable) pour être loggué comme
    # artefact MLflow par l'appelant : seules les métriques étaient visibles jusqu'ici
    # (atlas#431), le HTML rend le drift consultable dans l'UI MLflow (déjà exposée).
    return {
        "drift_score": float(result["drift_score"]),
        "drift_detected": bool(result["drift_detected"]),
        "method": result.get("method_name", "—"),
        "html": report.get_html(),
    }


def _log_to_mlflow(run_id: str, drift: dict) -> bool:
    """Logge le drift dans MLflow (best-effort). Renvoie True si loggué, False si MLflow
    n'est pas configuré/joignable (le check ne DÉPEND pas de MLflow — il reste informatif).

    ``MLFLOW_TRACKING_URI`` absent → on n'essaie même pas (dev local hors cluster)."""
    if not os.environ.get("MLFLOW_TRACKING_URI"):
        return False
    try:
        import mlflow

        mlflow.set_experiment("researcher_embeddings_drift")
        with mlflow.start_run(run_name=run_id):
            mlflow.log_param("run_id", run_id)
            mlflow.log_param("dt", CURATED_DT)
            mlflow.log_metric("drift_score", drift["drift_score"])
            mlflow.log_metric("drift_detected", int(drift["drift_detected"]))
            # Rapport visuel Evidently consultable dans l'UI MLflow (atlas#431).
            # log_text écrit la string directement comme artefact (artefact store S3
            # côté serveur) — pas de fichier temporaire local. Toléré absent (1er run
            # sans HTML, ou compute_drift d'une version antérieure).
            html = drift.get("html")
            if html:
                mlflow.log_text(html, "evidently_drift_report.html")
    except Exception:  # noqa: BLE001 — best-effort : MLflow ne doit jamais casser le check
        return False
    return True


def build_drift_verdict(run_id: str, dt: str, baseline_run: str, drift: dict, wm: dict) -> dict:
    """Document de verdict de dérive (PUR, sans I/O). Source lisible par le sensor de
    boucle fermée. Le champ ``watermark`` (état d'ingestion vu au moment de la mesure)
    est la clé du garde-fou anti-emballement : la boucle ne réentraîne que si ce
    watermark a AVANCÉ depuis le dernier retrain (réentraîner sur la même donnée ne fait
    pas disparaître le drift). ``produced_at`` injecté par l'appelant (horloge hors du pur)."""
    return {
        "schema_version": DRIFT_VERDICT_SCHEMA_VERSION,
        "run_id": run_id,
        "dt": dt,
        "baseline_run": baseline_run,
        "drift_detected": bool(drift["drift_detected"]),
        "drift_score": round(float(drift["drift_score"]), 4),
        "watermark": wm,
    }


def _verdict_path(bucket: str) -> str:
    return f"ceph:{bucket}/{DRIFT_VERDICT_KEY}"


def write_drift_verdict(verdict: dict, bucket: str, config_path: Path) -> bool:
    """Écrit le verdict en S3 (rclone rcat, clé unique écrasée). Best-effort : renvoie
    True si écrit, False sinon — la persistance ne doit jamais casser le check (informatif)."""
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
    sensor de boucle fermée (definitions.py), à la manière de ``watermark.read_all``."""
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


def _persist_verdict(bucket: str, run_id: str, baseline_run: str, drift: dict) -> bool:
    """Lit le watermark d'ingestion courant et écrit le verdict en S3 (best-effort).
    Réutilise rclone.conf temporaire (comme les assets). Sans accès S3 (dev/CI), no-op."""
    try:
        target = ceph_target_from_env()
        with tempfile.TemporaryDirectory() as tmp:
            config_path = Path(tmp) / "rclone.conf"
            config_path.write_text(render_rclone_config(target))
            wm = watermark.read_all(target.bucket, config_path)
            verdict = build_drift_verdict(run_id, CURATED_DT, baseline_run, drift, wm)
            verdict["produced_at"] = datetime.now(timezone.utc).isoformat()
            return write_drift_verdict(verdict, target.bucket, config_path)
    except Exception:  # noqa: BLE001 — best-effort : la persistance ne casse jamais le check
        return False


def check_embedding_drift(bucket: str, run_id: str) -> AssetCheckResult:
    """Mesure le drift des vecteurs du run courant vs le run PRÉCÉDENT (N vs N-1).

    Premier run (aucun N-1) : pas de baseline → check PASSÉ avec métadonnée « baseline
    absente » (on ne peut pas dériver de rien). Sinon : Evidently compare les 384
    colonnes, le score est loggué dans MLflow (best-effort). ``passed`` reflète l'ABSENCE
    de drift notable mais le check est NON bloquant (cf. wrapper) : un drift n'arrête pas
    le pipeline, il alerte."""
    con = lakehouse.connect()
    runs = _list_runs(con, bucket)
    # Le run courant est le dernier ; sa baseline est l'avant-dernier run consigné.
    previous = [r for r in runs if r < run_id]
    if not previous:
        return AssetCheckResult(
            passed=True,
            metadata={"drift": "baseline absente (1er run) — rien à comparer", "run_id": run_id},
        )
    baseline_run = previous[-1]
    reference_df = _load_vectors_df(con, bucket, baseline_run)
    current_df = _load_vectors_df(con, bucket, run_id)
    drift = compute_drift(reference_df, current_df)
    logged = _log_to_mlflow(run_id, drift)
    # Persiste le verdict en S3 (avec le watermark d'ingestion vu) : source lisible par le
    # sensor de boucle fermée drift→retrain (definitions.py). Best-effort, ne casse pas le check.
    persisted = _persist_verdict(bucket, run_id, baseline_run, drift)
    detected = drift["drift_detected"]  # verdict statistique d'Evidently (pas un seuil maison)
    return AssetCheckResult(
        passed=not detected,
        metadata={
            "baseline_run": baseline_run,
            "drift_score": round(drift["drift_score"], 4),
            "drift_detected": detected,
            "method": drift["method"],
            "mlflow_logged": logged,
            "verdict_persisted": persisted,
            "verdict": "drift détecté — envisager un ré-entraînement" if detected else "stable",
        },
    )


# ── Asset check Dagster (mince : résout le run puis délègue) ──────────────────


@asset_check(
    asset=AssetKey(["researcher_embeddings"]),
    name="evidently_embedding_drift",
    blocking=False,
)
def evidently_embedding_drift(context: AssetCheckExecutionContext) -> AssetCheckResult:
    return check_embedding_drift(ceph_target_from_env().bucket, context.run.run_id)
