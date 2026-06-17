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

import os

from dagster import AssetCheckExecutionContext, AssetCheckResult, AssetKey, asset_check

from citation_dagster import embedding, lakehouse
from citation_dagster.dbt import CURATED_DT
from citation_dagster.resources import ceph_target_from_env

_VECTORS_SUBDIR = "marts/researcher_vectors"
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
    return {
        "drift_score": float(result["drift_score"]),
        "drift_detected": bool(result["drift_detected"]),
        "method": result.get("method_name", "—"),
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
    except Exception:  # noqa: BLE001 — best-effort : MLflow ne doit jamais casser le check
        return False
    return True


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
    detected = drift["drift_detected"]  # verdict statistique d'Evidently (pas un seuil maison)
    return AssetCheckResult(
        passed=not detected,
        metadata={
            "baseline_run": baseline_run,
            "drift_score": round(drift["drift_score"], 4),
            "drift_detected": detected,
            "method": drift["method"],
            "mlflow_logged": logged,
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
