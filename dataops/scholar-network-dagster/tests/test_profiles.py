"""Tests du profilage sémantique (profiles.py, ADR 0103 §2, lot 5).

Deux niveaux :
  1. LOGIQUE d'agrégation (build_profiles) avec un embedder FACTICE déterministe — prouve la
     moyenne non pondérée + L2 par chercheur et la restriction aux chercheurs identifiés,
     sans dépendre du modèle ONNX (rapide, hermétique).
  2. PARITÉ avec le vrai modèle (via ONNX_MODEL_DIR pointant le modèle vendoré de citation) —
     self-skip si le modèle est absent.
"""

import os
from pathlib import Path

import numpy as np
import pytest

from scholar_network_dagster import embedding
from scholar_network_dagster.assets.profiles import _labels, build_profiles


class _FakeEmbedder:
    """Embedder déterministe : associe un vecteur fixe par texte (pas de modèle ONNX)."""

    def __init__(self, mapping):
        self._mapping = mapping  # texte -> vecteur(EMBEDDING_DIM)

    def embed_text(self, text):
        return self._mapping.get(text, np.zeros(embedding.EMBEDDING_DIM, dtype=np.float32))


def _topic(name, score):
    return {"display_name": name, "score": score}


def _kw(name):
    return {"display_name": name}


def test_labels_filters_topics_by_score_keeps_all_keywords():
    """_labels : topics gardés SSI score ≥ seuil ; keywords tous gardés (parité citation)."""
    topics = [_topic("A", 0.9), _topic("B", 0.1)]  # B sous le seuil 0,3
    keywords = [_kw("k1"), _kw("k2")]
    topic_labels, keyword_labels = _labels(topics, keywords)
    assert topic_labels == ["A"]
    assert keyword_labels == ["k1", "k2"]


def test_build_profiles_averages_then_l2_per_researcher():
    """Un chercheur à 2 articles → moyenne non pondérée + L2 (parité aggregate_author)."""
    dim = embedding.EMBEDDING_DIM
    v1 = np.zeros(dim, dtype=np.float32)
    v1[0] = 3.0
    v2 = np.zeros(dim, dtype=np.float32)
    v2[1] = 4.0
    fake = _FakeEmbedder({"t1": v1, "t2": v2})  # work_to_text([topic], []) → "topic, "

    rows = [
        {"work_id": "W1", "author_ids": ["A1"], "topics": [_topic("t1", 0.9)], "keywords": []},
        {"work_id": "W2", "author_ids": ["A1"], "topics": [_topic("t2", 0.9)], "keywords": []},
    ]
    profiles = build_profiles(rows, researcher_ids={"A1"}, embedder=fake)

    assert set(profiles) == {"A1"}
    # moyenne (v1+v2)/2 = [1.5, 2.0, 0…] puis L2.
    expected = embedding.aggregate_author([v1, v2])
    assert np.allclose(profiles["A1"], expected)
    assert pytest.approx(float(np.linalg.norm(profiles["A1"])), abs=1e-6) == 1.0  # L2


def test_build_profiles_only_identified_researchers():
    """Seuls les chercheurs identifiés sont profilés — un co-auteur externe est ignoré."""
    dim = embedding.EMBEDDING_DIM
    v = np.zeros(dim, dtype=np.float32)
    v[0] = 1.0
    fake = _FakeEmbedder({"t": v})
    rows = [
        {
            "work_id": "W1",
            "author_ids": ["A1", "EXT"],
            "topics": [_topic("t", 0.9)],
            "keywords": [],
        },
    ]
    profiles = build_profiles(rows, researcher_ids={"A1"}, embedder=fake)
    assert set(profiles) == {"A1"}  # EXT (non identifié) n'a pas de profil


def test_build_profiles_deterministic_order():
    """Ordre de sortie stable par author_id (déterminisme ADR 0057)."""
    dim = embedding.EMBEDDING_DIM
    v = np.ones(dim, dtype=np.float32)
    fake = _FakeEmbedder({"t": v})
    rows = [
        {
            "work_id": "W1",
            "author_ids": ["Z", "A", "M"],
            "topics": [_topic("t", 0.9)],
            "keywords": [],
        },
    ]
    profiles = build_profiles(rows, researcher_ids={"A", "M", "Z"}, embedder=fake)
    assert list(profiles) == ["A", "M", "Z"]


# ── Parité avec le vrai modèle ONNX (self-skip si absent) ────────────────────────────────

_CITATION_MODEL = (
    Path(__file__).resolve().parents[2]
    / "citation-dagster"
    / "src"
    / "citation_dagster"
    / "models"
    / "all-MiniLM-L6-v2"
)


def _real_embedder():
    """Embedder réel : ONNX_MODEL_DIR si posé, sinon le modèle vendoré de citation ; skip sinon."""
    override = os.environ.get("ONNX_MODEL_DIR")
    model_dir = Path(override) if override else _CITATION_MODEL
    if not (model_dir / "model_quantized.onnx").exists():
        pytest.skip("Modèle ONNX absent (non versionné) — test de parité sauté (self-skipping).")
    return embedding.Embedder(model_path=str(model_dir))


def test_real_model_profile_is_unit_norm():
    """Avec le VRAI modèle : un profil non vide est L2-normalisé (norme ≈ 1), dim 384."""
    embedder = _real_embedder()
    rows = [
        {
            "work_id": "W1",
            "author_ids": ["A1"],
            "topics": [_topic("machine learning", 0.9)],
            "keywords": [_kw("neural networks")],
        }
    ]
    profiles = build_profiles(rows, researcher_ids={"A1"}, embedder=embedder)
    assert profiles["A1"].shape == (embedding.EMBEDDING_DIM,)
    assert pytest.approx(float(np.linalg.norm(profiles["A1"])), abs=1e-5) == 1.0


# ── Intégration MinIO : l'asset scholar_profiles de bout en bout (vrai modèle) ────────────

_TSTRUCT = "STRUCT(display_name VARCHAR, score DOUBLE)[]"
_EMPTY = f"[]::{_TSTRUCT}"


def _topics(name):
    """Littéral SQL d'une liste topics à un élément (nom + score au-dessus du seuil)."""
    return f"[{{'display_name': '{name}', 'score': 0.9}}]::{_TSTRUCT}"


def test_asset_scholar_profiles_end_to_end(minio, monkeypatch):
    """L'asset scholar_profiles de bout en bout : researchers + scholar_works → profils.

    Utilise le VRAI modèle ONNX (self-skip si absent). Couvre le chemin I/O complet :
    lecture des deux entrées, embedding, agrégation, écriture du Parquet des profils."""
    if not (_CITATION_MODEL / "model_quantized.onnx").exists():
        pytest.skip("Modèle ONNX absent — test d'intégration profils sauté.")
    monkeypatch.setenv("ONNX_MODEL_DIR", str(_CITATION_MODEL))

    from scholar_network_dagster.assets.passes import RESEARCHERS_SUBDIR, SCHOLAR_WORKS_SUBDIR
    from scholar_network_dagster.assets.profiles import PROFILES_SUBDIR, scholar_profiles
    from scholar_network_dagster.lakehouse import connect
    from scholar_network_dagster.resources import DuckDBS3Config

    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    seed = connect(cfg)
    # Table des chercheurs (préfixe stable) : A1 identifié.
    seed.execute(
        f"COPY (SELECT * FROM (VALUES ('A1')) AS t(author_id)) "
        f"TO 's3://{minio.bucket}/{RESEARCHERS_SUBDIR}/part-00000.parquet' (FORMAT PARQUET)"
    )
    # Périmètre final : 2 articles de A1, avec topics (utilisés par l'embedding).
    author = "[{'author': {'id': 'A1'}}]"
    seed.execute(
        f"""
        COPY (SELECT * FROM (VALUES
            ('W1', {_topics("machine learning")}, {_EMPTY}, {author}),
            ('W2', {_topics("databases")}, {_EMPTY}, {author})
        ) AS t(id, topics, keywords, authorships))
        TO 's3://{minio.bucket}/{SCHOLAR_WORKS_SUBDIR}/run=r1/part-00000.parquet' (FORMAT PARQUET)
        """
    )

    host, port = minio.endpoint.split(":")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", minio.access_key)
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", minio.secret_key)
    monkeypatch.setenv("BUCKET_HOST", host)
    monkeypatch.setenv("BUCKET_PORT", port)
    monkeypatch.setenv("BUCKET_NAME", minio.bucket)
    monkeypatch.setenv("DBT_DUCKDB_MEMORY_LIMIT", "2GB")
    monkeypatch.setenv("DBT_DUCKDB_THREADS", "2")
    monkeypatch.setenv("DBT_DUCKDB_TEMP_DIR", "/tmp/scholar-network-spill")

    result = scholar_profiles()
    assert result.metadata["profiles"].value == 1  # un profil pour A1
    assert result.metadata["embedding_dim"].value == embedding.EMBEDDING_DIM

    # Le Parquet des profils est écrit et relisible (grain author_id × embedding).
    n = seed.execute(
        f"SELECT count(*) FROM read_parquet('s3://{minio.bucket}/{PROFILES_SUBDIR}/run=*/*.parquet')"
    ).fetchone()[0]
    assert n == 1
