"""Tests de l'instrumentation MLflow de researcher_embeddings (atlas#397).

Hermétiques (MLflow stubé, aucun réseau) : couvre la lecture d'env (no-op sans
MLFLOW_TRACKING_URI), la construction des params (provenance figée réutilisée, pas de
PII), et log_embeddings_run (no-op, succès avec registry stubé, gestion d'échec).
"""

import contextlib

import pytest

from citation_dagster import embedding, model_provenance, tracking

# ── mlflow_config_from_env ────────────────────────────────────────────────────


def test_config_none_without_uri():
    # Pas de MLFLOW_TRACKING_URI → None → instrumentation no-op (dev/CI hermétique).
    assert tracking.mlflow_config_from_env({}) is None


def test_config_from_uri_default_experiment():
    cfg = tracking.mlflow_config_from_env({"MLFLOW_TRACKING_URI": "http://mlflow.local:5000"})
    assert cfg is not None
    assert cfg.tracking_uri == "http://mlflow.local:5000"
    assert cfg.experiment == tracking.EXPERIMENT  # citation_* (ADR 0022)


def test_config_experiment_overridable():
    cfg = tracking.mlflow_config_from_env(
        {"MLFLOW_TRACKING_URI": "http://mlflow.local:5000", "MLFLOW_EXPERIMENT": "citation_custom"}
    )
    assert cfg.experiment == "citation_custom"


# ── build_params (provenance réutilisée, pas de PII) ─────────────────────────


def test_build_params_reuses_provenance_and_constants():
    params = tracking.build_params("run-2026-01", "0000-00")
    # Réutilise les constantes (atlas#397 : ne pas redéfinir).
    assert params["hf_repo"] == model_provenance.HF_REPO
    assert params["hf_revision"] == model_provenance.HF_REVISION
    assert params["embedding_dim"] == embedding.EMBEDDING_DIM
    assert params["max_length"] == embedding.MAX_LENGTH
    assert params["text_topic_score_min"] == embedding.TEXT_TOPIC_SCORE_MIN
    # sha256 par fichier du modèle (provenance vérifiable).
    assert (
        params["sha256_model_quantized.onnx"]
        == model_provenance.file_sha256()["model_quantized.onnx"]
    )


def test_build_params_no_pii():
    # Aucune valeur ne doit ressembler à un id de personne/œuvre OpenAlex (A…/W…).
    params = tracking.build_params("run1", "0000-00")
    for value in params.values():
        text = str(value)
        assert "openalex.org" not in text
        assert not (text.startswith("A") and text[1:].isdigit())
        assert not (text.startswith("W") and text[1:].isdigit())


# ── log_embeddings_run (best-effort) ──────────────────────────────────────────


def test_log_run_noop_without_config():
    # config None (MLFLOW_TRACKING_URI absent) → no-op, renvoie None, aucun import MLflow.
    assert tracking.log_embeddings_run("run1", "0000-00", {"author_vectors": 3}, None) is None


class _FakeRun:
    class info:  # noqa: N801 — mimique l'attribut MLflow run.info.run_id
        run_id = "mlflow-abc"


class _FakeClient:
    """MlflowClient stubé : enregistre les appels registry pour assertion."""

    instances = []

    def __init__(self, *a, **k):
        self.created = []
        self.versions = []
        _FakeClient.instances.append(self)

    def create_registered_model(self, name):
        self.created.append(name)

    def create_model_version(self, name, source, run_id, tags):
        self.versions.append({"name": name, "source": source, "run_id": run_id, "tags": tags})
        return {"name": name, "version": "1"}


@pytest.fixture
def _mlflow_stub(monkeypatch):
    """Stube mlflow + MlflowClient → succès offline, capture params/métriques/artefacts."""
    import mlflow
    from mlflow import tracking as mltracking

    captured = {"params": {}, "metrics": {}, "texts": {}, "experiment": None, "uri": None}
    monkeypatch.setattr(mlflow, "set_tracking_uri", lambda u: captured.__setitem__("uri", u))
    monkeypatch.setattr(mlflow, "set_experiment", lambda n: captured.__setitem__("experiment", n))
    monkeypatch.setattr(mlflow, "start_run", lambda **k: contextlib.nullcontext(_FakeRun()))
    monkeypatch.setattr(mlflow, "log_params", lambda d: captured["params"].update(d))
    monkeypatch.setattr(mlflow, "log_metric", lambda k, v: captured["metrics"].__setitem__(k, v))
    monkeypatch.setattr(mlflow, "log_text", lambda t, p: captured["texts"].__setitem__(p, t))
    _FakeClient.instances = []
    monkeypatch.setattr(mltracking, "MlflowClient", _FakeClient)
    return captured


def test_log_run_success_logs_and_registers(_mlflow_stub):
    cfg = tracking.MlflowConfig("http://mlflow.local:5000", "citation_researcher_embeddings")
    out = tracking.log_embeddings_run(
        "runX", "0000-00", {"work_vectors": 10, "author_vectors": 4, "null_vectors": 0}, cfg
    )
    assert out == "runs:/mlflow-abc"
    # Params (provenance) + métriques loggés.
    assert _mlflow_stub["params"]["hf_revision"] == model_provenance.HF_REVISION
    assert _mlflow_stub["metrics"]["author_vectors"] == 4
    assert _mlflow_stub["uri"] == "http://mlflow.local:5000"
    # Modèle enregistré au registry avec tags de provenance.
    client = _FakeClient.instances[-1]
    assert tracking.REGISTERED_MODEL in client.created
    assert client.versions[0]["tags"]["hf_revision"] == model_provenance.HF_REVISION


def test_log_run_handles_failure(monkeypatch):
    # MLflow lève → best-effort, renvoie None sans propager (l'asset ne dépend pas de MLflow).
    import mlflow

    def _boom(*a, **k):
        raise RuntimeError("unreachable")

    monkeypatch.setattr(mlflow, "set_tracking_uri", _boom)
    cfg = tracking.MlflowConfig("http://127.0.0.1:1/unreachable", "citation_researcher_embeddings")
    assert tracking.log_embeddings_run("runX", "0000-00", {"author_vectors": 1}, cfg) is None
