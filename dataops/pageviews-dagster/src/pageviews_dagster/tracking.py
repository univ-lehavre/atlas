"""Instrumentation MLflow de pageviews (modèle de prévision des vues, ADR 0098).

À chaque matérialisation du modèle de prévision, on logge un *run* MLflow (params +
métriques de la validation honnête). C'est du **code applicatif** (frontière ADR 0033) :
le SERVEUR MLflow est fourni par le socle ; ici on lit seulement ``MLFLOW_TRACKING_URI``
et on instrumente — comme le lineage lit ``OPENLINEAGE_URL``.

Pas de model registry (aucun modèle vendoré ; le gradient boosting est ré-entraîné à
chaque run, sa provenance est la graine figée + ``uv.lock``). **No-op sans
``MLFLOW_TRACKING_URI``** (code-location chargeable et asset matérialisable hors cluster —
tests/CI hermétiques, ADR 0057). Aucune PII (ADR 0030) ; identifiants ``pageviews_*``,
jamais une marque (ADR 0022).

NB : pas de ``from __future__ import annotations`` (cohérence avec les assets introspectés
par Dagster, drift D9).
"""

import os
from dataclasses import dataclass

# Expérience DÉDIÉE au modèle de prévision — convention `pageviews`, jamais une marque.
EXPERIMENT_FORECAST = "pageviews_views_forecast"


@dataclass(frozen=True)
class MlflowConfig:
    """Configuration MLflow lue de l'environnement (tracking URI + nom d'experiment)."""

    tracking_uri: str
    experiment: str


def mlflow_config_from_env(env: dict | None = None) -> MlflowConfig | None:
    """Construit la config MLflow depuis l'environnement, ou ``None`` si non configuré.

    ``MLFLOW_TRACKING_URI`` absent → ``None`` (instrumentation no-op, dev/CI hors cluster).
    Le nom d'experiment est surchargeable par ``MLFLOW_EXPERIMENT`` (valeur d'instance),
    défaut ``pageviews_views_forecast``."""
    env = env if env is not None else os.environ
    uri = env.get("MLFLOW_TRACKING_URI")
    if not uri:
        return None
    return MlflowConfig(
        tracking_uri=uri, experiment=env.get("MLFLOW_EXPERIMENT", EXPERIMENT_FORECAST)
    )


def log_run(
    run_name: str,
    experiment: str,
    dt: str,
    metrics: dict,
    params: dict,
    config: MlflowConfig | None,
) -> str | None:
    """Logge un run MLflow GÉNÉRIQUE (params + métriques). Best-effort : ``config`` ``None``
    → no-op ; MLflow injoignable → erreur avalée (l'asset ne DÉPEND pas de MLflow). Renvoie
    ``runs:/<id>`` si loggué, sinon ``None``. Aucune PII (ADR 0030) ; l'``experiment`` passé
    prime sur ``config.experiment``."""
    if config is None:
        return None
    try:
        import mlflow

        mlflow.set_tracking_uri(config.tracking_uri)
        mlflow.set_experiment(experiment)
        with mlflow.start_run(run_name=run_name) as run:
            mlflow.log_params(params)
            for name, value in metrics.items():
                mlflow.log_metric(name, value)
            return f"runs:/{run.info.run_id}"
    except Exception:  # noqa: BLE001 — best-effort : MLflow ne casse jamais la matérialisation
        return None
