"""Instrumentation MLflow de l'asset ``researcher_embeddings`` (MLOps 1→2, atlas#397).

Suivi de modèles : à chaque matérialisation, on logge un *run* MLflow (params + métriques)
et on enregistre le modèle ``all-MiniLM-L6-v2`` au *model registry* avec sa provenance
figée (révision HF + sha256, ``model_provenance``). L'instrumentation est du **code
applicatif** (frontière ADR 0033) : le SERVEUR MLflow est fourni par le socle ; ici on lit
seulement ``MLFLOW_TRACKING_URI`` et on instrumente — exactement le partage acté pour le
lineage (``OPENLINEAGE_URL``).

Patron de ``resources.py`` (``*_from_env`` + ``_require``). **No-op sans
``MLFLOW_TRACKING_URI``** (comme ``lineage.emit`` / le drift) : la code-location reste
chargeable et l'asset matérialisable hors cluster (tests/CI hermétiques, ADR 0057).
Aucune PII dans params/métriques/tags (ADR 0030) ; identifiants ``citation-*`` (ADR 0022).

NB : pas de ``from __future__ import annotations`` (cohérence avec les assets introspectés
par Dagster, drift D9).
"""

import contextlib
import os
from dataclasses import dataclass

from citation_dagster import embedding, model_provenance

# Identifiants partagés MLflow — convention `citation`, jamais une marque (ADR 0022).
EXPERIMENT = "citation_researcher_embeddings"
REGISTERED_MODEL = "citation-researcher-embeddings"
# Expérience DÉDIÉE au modèle d'uplift FWCI (ADR 0067) : ses runs ne doivent pas se
# noyer dans l'expérience des embeddings (dérives suivies séparément).
EXPERIMENT_UPLIFT = "citation_uplift_fwci"


@dataclass(frozen=True)
class MlflowConfig:
    """Configuration MLflow lue de l'environnement (tracking URI + nom d'experiment)."""

    tracking_uri: str
    experiment: str


def mlflow_config_from_env(env: dict | None = None) -> MlflowConfig | None:
    """Construit la config MLflow depuis l'environnement, ou ``None`` si non configuré.

    ``MLFLOW_TRACKING_URI`` absent → ``None`` (instrumentation no-op, dev/CI hors cluster).
    Le nom d'experiment est surchargeable par ``MLFLOW_EXPERIMENT`` (valeur d'instance),
    défaut ``citation_researcher_embeddings``.
    """
    env = env if env is not None else os.environ
    uri = env.get("MLFLOW_TRACKING_URI")
    if not uri:
        return None
    return MlflowConfig(tracking_uri=uri, experiment=env.get("MLFLOW_EXPERIMENT", EXPERIMENT))


def build_params(run_id: str, dt: str) -> dict:
    """Params du run (provenance figée + constantes du modèle). Aucune PII : noms techniques.

    Réutilise les constantes de ``model_provenance`` (révision HF + sha256) et
    ``embedding`` (dimension, longueur, seuil) plutôt que de les redéfinir (atlas#397).
    """
    params = {
        "hf_repo": model_provenance.HF_REPO,
        "hf_revision": model_provenance.HF_REVISION,
        "embedding_dim": embedding.EMBEDDING_DIM,
        "max_length": embedding.MAX_LENGTH,
        "text_topic_score_min": embedding.TEXT_TOPIC_SCORE_MIN,
        "dt": dt,
        "run_id": run_id,
    }
    # sha256 par fichier du modèle (provenance vérifiable de la version enregistrée).
    for name, sha in model_provenance.file_sha256().items():
        params[f"sha256_{name}"] = sha
    return params


def _model_version_tags(run_id: str, dt: str) -> dict:
    """Tags de la version registry : provenance figée (révision exacte, pas `main`)."""
    tags = {
        "hf_repo": model_provenance.HF_REPO,
        "hf_revision": model_provenance.HF_REVISION,
        "dt": dt,
        "run_id": run_id,
    }
    for name, sha in model_provenance.file_sha256().items():
        tags[f"sha256_{name}"] = sha
    return tags


def log_run(
    run_name: str,
    experiment: str,
    dt: str,
    metrics: dict,
    params: dict,
    config: MlflowConfig | None,
) -> str | None:
    """Logge un run MLflow GÉNÉRIQUE (params + métriques), sans toucher au registry.

    Brique partagée : ``log_embeddings_run`` l'enrichit du registry du modèle d'embeddings ;
    les autres assets (p. ex. ``pair_uplift_model``) l'appellent directement avec leur propre
    ``experiment``/``run_name`` pour que leurs runs soient correctement RANGÉS et NOMMÉS
    (pas mêlés à l'expérience des embeddings). Best-effort : ``config`` ``None`` → no-op,
    MLflow injoignable → erreur avalée. Renvoie ``runs:/<id>`` si loggué, sinon ``None``.
    Aucune PII (ADR 0030) ; l'``experiment`` passé prime sur ``config.experiment``.
    """
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


def log_embeddings_run(run_id: str, dt: str, metrics: dict, config: MlflowConfig | None) -> bool:
    """Logge un run MLflow (params + métriques) et enregistre le modèle au registry.

    Best-effort : ``config`` ``None`` (MLFLOW_TRACKING_URI absent) → no-op, renvoie False.
    MLflow injoignable → on avale l'erreur (l'asset ne DÉPEND pas de MLflow). Renvoie l'URI
    ``runs:/<id>`` du run loggué (str) si réussi, sinon ``None``.

    ``metrics`` : mesures de l'asset (work_vectors, author_vectors, null_vectors…).
    Le modèle est enregistré sous ``citation-researcher-embeddings``, version taguée avec
    la provenance figée (révision HF + sha256) — la version pointe la révision EXACTE.
    """
    if config is None:
        return None
    try:
        import mlflow
        from mlflow.tracking import MlflowClient

        mlflow.set_tracking_uri(config.tracking_uri)
        mlflow.set_experiment(config.experiment)
        with mlflow.start_run(run_name=f"researcher_embeddings:{run_id}") as run:
            mlflow.log_params(build_params(run_id, dt))
            for name, value in metrics.items():
                mlflow.log_metric(name, value)
            # Le modèle est figé hors MLflow (cuit dans l'image, ADR 0059) : on enregistre
            # une VERSION au registry portant sa provenance en tags, sans ré-uploader les
            # poids. La provenance JSON sert d'artefact de traçabilité du run.
            import json

            mlflow.log_text(
                json.dumps(_model_version_tags(run_id, dt), indent=2, ensure_ascii=False),
                "model_provenance.json",
            )
            mlflow_run_id = run.info.run_id
        _register_model_version(MlflowClient(config.tracking_uri), mlflow_run_id, run_id, dt)
    except Exception:  # noqa: BLE001 — best-effort : MLflow ne casse jamais la matérialisation
        return None
    return f"runs:/{mlflow_run_id}"


def _register_model_version(client, mlflow_run_id: str, run_id: str, dt: str) -> None:
    """Crée (idempotent) le modèle enregistré et une version taguée de la provenance.

    ``create_registered_model`` lève si le modèle existe déjà → toléré (idempotent). La
    version pointe l'artefact de provenance du run ; ses tags portent la révision HF exacte
    et les sha256 (la version référence la révision chargée, pas ``main``)."""
    # create_registered_model lève si le modèle existe déjà (runs précédents) → toléré.
    with contextlib.suppress(Exception):
        client.create_registered_model(REGISTERED_MODEL)
    version = client.create_model_version(
        name=REGISTERED_MODEL,
        source=f"runs:/{mlflow_run_id}/model_provenance.json",
        run_id=mlflow_run_id,
        tags=_model_version_tags(run_id, dt),
    )
    return version
