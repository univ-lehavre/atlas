"""Tests du lot 3 : module d'embedding pur + smoke hermétique de l'asset.

Deux niveaux, comme test_dbt_models.py :
  - tests PURS de citation_dagster.embedding (modèle vendoré, pas de réseau ni
    Docker) : parité du texte source, invariants de pooling, déterminisme ;
  - smoke hermétique : dbt build (provenance) puis l'asset researcher_embeddings
    contre MinIO, relecture des Parquet, golden + déterminisme intra-archi.
    S'auto-saute sans Docker.

Tolérance (décision projet) : déterminisme INTRA-archi prouvé (2 runs → contenu
canonique identique aux arrondis près) ; PAS de bit-exact cross-archi (onnxruntime
NEON arm64 vs AVX amd64, admis ADR 0059). Normes validées par pytest.approx.
"""

import hashlib
import json

import numpy as np
import pytest
from dagster import build_asset_context

import citation_dagster.assets.manifest as cm
from citation_dagster import embedding, lakehouse
from citation_dagster.assets import quality as q
from citation_dagster.assets.researcher_embeddings import researcher_embeddings
from citation_dagster.dbt import CURATED_DT
from citation_dagster.resources import DuckDBS3Config
from tests.conftest import load_raw_fixtures, requires_rclone
from tests.test_dbt_models import _dbt_build, _set_minio_env

# ── Tests purs du module embedding (sans réseau, sans Docker) ────────────────


def test_work_to_text_parite_ts():
    """Texte = topics puis keywords, joints par ', ' (embedding-profile.ts:31-35)."""
    text = embedding.work_to_text(
        ["Magnetic confinement fusion research", "Fusion materials and technologies"],
        ["Plasma", "Shield"],
    )
    assert text == (
        "Magnetic confinement fusion research, Fusion materials and technologies, Plasma, Shield"
    )


def test_work_to_text_vide():
    """Aucun label → texte vide (publication sans contenu lexical)."""
    assert embedding.work_to_text([], []) == ""


def test_embed_text_dim_et_type(embedding_model):
    """embed_text renvoie un vecteur(384) float32."""
    e = embedding.Embedder()
    v = e.embed_text("Plasma, Shield")
    assert v.shape == (embedding.EMBEDDING_DIM,)
    assert v.dtype == np.float32


def test_embed_text_vide_est_nul(embedding_model):
    """Un texte vide donne un vecteur nul (parité embedding-profile.ts:66)."""
    e = embedding.Embedder()
    v = e.embed_text("")
    assert np.array_equal(v, np.zeros(embedding.EMBEDDING_DIM, dtype=np.float32))


def test_embed_text_non_normalise(embedding_model):
    """Le vecteur PAR PUBLICATION n'est PAS L2-normalisé (re-poolable, ADR 0059)."""
    e = embedding.Embedder()
    v = e.embed_text("Plasma, Shield")
    assert abs(float(np.linalg.norm(v)) - 1.0) > 1e-3  # norme nettement != 1


def test_embed_text_deterministe(embedding_model):
    """Deux appels sur le même texte (même process) sont identiques bit-à-bit."""
    e = embedding.Embedder()
    a = e.embed_text("Glycosylation and Glycoproteins Research, Chemistry")
    b = e.embed_text("Glycosylation and Glycoproteins Research, Chemistry")
    assert np.array_equal(a, b)


def test_aggregate_author_l2_normalise(embedding_model):
    """L'agrégat par author_id est L2-normalisé (norme ≈ 1)."""
    e = embedding.Embedder()
    vecs = [e.embed_text("Plasma, Shield"), e.embed_text("Chemistry")]
    agg = embedding.aggregate_author(vecs)
    assert agg.shape == (embedding.EMBEDDING_DIM,)
    assert float(np.linalg.norm(agg)) == pytest.approx(1.0, abs=1e-5)


def test_aggregate_author_vide_est_nul():
    """Aucun vecteur → agrégat nul (chercheur sans publication exploitable)."""
    agg = embedding.aggregate_author([])
    assert np.array_equal(agg, np.zeros(embedding.EMBEDDING_DIM, dtype=np.float32))


def test_aggregate_author_mean_pool_non_pondere():
    """L'agrégat = L2(moyenne simple) : sur des vecteurs synthétiques, le résultat
    est la moyenne normalisée, indépendante d'une pondération par publication."""
    a = np.array([3.0] + [0.0] * (embedding.EMBEDDING_DIM - 1), dtype=np.float32)
    b = np.array([0.0, 4.0] + [0.0] * (embedding.EMBEDDING_DIM - 2), dtype=np.float32)
    agg = embedding.aggregate_author([a, b])
    # moyenne = (1.5, 2.0, 0…) ; norme = 2.5 ; normalisé = (0.6, 0.8, 0…)
    assert agg[0] == pytest.approx(0.6, abs=1e-6)
    assert agg[1] == pytest.approx(0.8, abs=1e-6)
    assert float(np.linalg.norm(agg)) == pytest.approx(1.0, abs=1e-6)


# ── Smoke hermétique : dbt build (provenance) + asset researcher_embeddings ──


def _connect(minio):
    return lakehouse.connect(
        DuckDBS3Config(
            key_id=minio.access_key,
            secret=minio.secret_key,
            endpoint=minio.endpoint,
            use_ssl=False,
            region="us-east-1",
            bucket=minio.bucket,
        )
    )


def _read_vectors(con, bucket, subdir, id_col, run):
    glob = f"s3://{bucket}/{subdir}/dt={CURATED_DT}/run={run}/*.parquet"
    return con.sql(
        f"SELECT {id_col}, vector FROM read_parquet('{glob}') ORDER BY {id_col}"
    ).fetchall()


def _canonical_sha256(rows, ndigits=6):
    """sha256 du dump trié des vecteurs ARRONDIS (déterminisme intra-archi, pas
    bit-exact cross-archi — ADR 0059)."""
    payload = "\n".join(str(r[0]) + "|" + ",".join(f"{x:.{ndigits}f}" for x in r[1]) for r in rows)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


# Les 10 works des fixtures portent tous topics+keywords → 10 vecteurs publication.
# Trois auteurs EUNICoast → 3 vecteurs auteur. Alice (A1000000001) agrège
# W1,W2,W3,W4,W5,W6,W7 ; Bob (A1000000002) W1,W2,W4,W8,W9 ; Carol (A1000000003) W3,W4,W10.
_ALICE = "https://openalex.org/A1000000001"
_BOB = "https://openalex.org/A1000000002"
_CAROL = "https://openalex.org/A1000000003"
_W = "https://openalex.org/W"


def test_asset_researcher_embeddings_golden_and_deterministic(embedding_model, minio, monkeypatch):
    """e2e : dbt écrit la provenance, l'asset écrit curated_work_vectors (par
    publication, sans L2) + marts/researcher_vectors (par author_id, L2≈1).
    Golden structurel + déterminisme intra-archi sur 2 runs."""
    requires_rclone()  # le chargement des fixtures brutes shelle rclone
    load_raw_fixtures(minio)
    _set_minio_env(monkeypatch, minio)

    # run_id de l'invocation directe = 'EPHEMERAL' ; on aligne le dbt build dessus.
    run_id = "EPHEMERAL"
    r = _dbt_build(minio, curated_run=run_id, curated_dt=CURATED_DT)
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"

    res = researcher_embeddings(build_asset_context())
    assert res.metadata["work_vectors"].value == 10  # W1..W10
    assert res.metadata["author_vectors"].value == 3  # Alice, Bob, Carol

    con = _connect(minio)
    works = _read_vectors(con, minio.bucket, "curated/curated_work_vectors", "work_id", run_id)
    authors = _read_vectors(con, minio.bucket, "marts/researcher_vectors", "author_id", run_id)

    # Grain & dimension.
    assert len(works) == 10
    assert len(authors) == 3
    assert all(len(v) == embedding.EMBEDDING_DIM for _id, v in works)
    assert all(len(v) == embedding.EMBEDDING_DIM for _id, v in authors)

    # Vecteur PAR PUBLICATION : PAS normalisé (re-poolable, ADR 0059).
    for _wid, v in works:
        assert abs(float(np.linalg.norm(v)) - 1.0) > 1e-3

    # Agrégat PAR author_id : L2-normalisé (norme ≈ 1), Alice, Bob, Carol (ordre id).
    author_ids = [a[0] for a in authors]
    assert author_ids == [_ALICE, _BOB, _CAROL]
    for _aid, v in authors:
        assert float(np.linalg.norm(v)) == pytest.approx(1.0, abs=1e-5)

    # Déterminisme intra-archi : un 2ᵉ run produit le même contenu canonique.
    sha_works1 = _canonical_sha256(works)
    sha_authors1 = _canonical_sha256(authors)
    r2 = _dbt_build(minio, curated_run=run_id, curated_dt=CURATED_DT)
    assert r2.returncode == 0
    researcher_embeddings(build_asset_context())
    works2 = _read_vectors(con, minio.bucket, "curated/curated_work_vectors", "work_id", run_id)
    authors2 = _read_vectors(con, minio.bucket, "marts/researcher_vectors", "author_id", run_id)
    assert _canonical_sha256(works2) == sha_works1
    assert _canonical_sha256(authors2) == sha_authors1


def test_vector_opposition_rgpd(embedding_model, minio, monkeypatch):
    """PURGE CHIRURGICALE RGPD du VECTEUR (lot 5) : opposition (Alice, W1) re-dérive le
    vecteur d'Alice sans W1, laisse Bob INCHANGÉ (co-auteur de W1, non opposé), et garde
    la provenance COMPLÈTE."""
    requires_rclone()
    load_raw_fixtures(minio)
    _set_minio_env(monkeypatch, minio)
    run_id = "EPHEMERAL"

    # 1) Run de référence SANS opposition.
    r = _dbt_build(minio, curated_run=run_id, curated_dt=CURATED_DT)
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"
    monkeypatch.delenv("OPPOSITION_PAIRS", raising=False)
    researcher_embeddings(build_asset_context())
    con = _connect(minio)
    authors_ref = dict(
        _read_vectors(con, minio.bucket, "marts/researcher_vectors", "author_id", run_id)
    )
    works_ref = _read_vectors(con, minio.bucket, "curated/curated_work_vectors", "work_id", run_id)

    # 2) Run AVEC opposition (Alice, W1) — MÊME source env que dbt (cohérence). W1 est
    # co-écrit Alice+Bob : Alice s'oppose à SA participation, celle de Bob est intacte.
    monkeypatch.setenv("OPPOSITION_PAIRS", json.dumps([{"author_id": _ALICE, "work_id": _W + "1"}]))
    researcher_embeddings(build_asset_context())
    authors_opp = dict(
        _read_vectors(con, minio.bucket, "marts/researcher_vectors", "author_id", run_id)
    )
    works_opp = _read_vectors(con, minio.bucket, "curated/curated_work_vectors", "work_id", run_id)

    # Provenance INCHANGÉE : la couche curated reste complète (10 works, non filtrée).
    assert _canonical_sha256(works_opp) == _canonical_sha256(works_ref)
    assert len(works_opp) == 10

    # Bob INCHANGÉ : son vecteur (agrégé sur W1,W2,W4,W8,W9) est byte-identique — sa
    # participation à W1 n'est PAS opposée.
    # PREUVE anti-sur-effacement : l'opposition d'Alice ne touche pas le co-auteur.
    assert _canonical_sha256([(_BOB, authors_opp[_BOB])]) == _canonical_sha256(
        [(_BOB, authors_ref[_BOB])]
    )
    # Alice TOUJOURS présente (garde W2..W7), re-dérivée → vecteur différent de la réf.
    assert _ALICE in authors_opp
    assert float(np.linalg.norm(authors_opp[_ALICE])) == pytest.approx(1.0, abs=1e-5)
    assert _canonical_sha256([(_ALICE, authors_opp[_ALICE])]) != _canonical_sha256(
        [(_ALICE, authors_ref[_ALICE])]
    )


def test_vector_manifests_and_ge_check(embedding_model, minio, monkeypatch):
    """e2e lot 4 : dbt + asset embeddings, puis les manifests des deux artefacts
    vecteur (marts/researcher_vectors + curated/curated_work_vectors) s'écrivent
    correctement, et la porte GE du vecteur (dim 384 + norme tolérante) passe."""
    requires_rclone()
    load_raw_fixtures(minio)
    _set_minio_env(monkeypatch, minio)

    run_id = "EPHEMERAL"  # = run_id de build_asset_context
    r = _dbt_build(minio, curated_run=run_id, curated_dt=CURATED_DT)
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"
    researcher_embeddings(build_asset_context())  # écrit les deux Parquet vecteur

    # Manifests : agrégat author_id (3 lignes) + provenance work_id (10 lignes).
    res_agg = cm.researcher_vectors_manifest(build_asset_context())
    assert res_agg.metadata["row_count"].value == 3  # Alice, Bob, Carol
    res_prov = cm.work_vectors_manifest(build_asset_context())
    assert res_prov.metadata["row_count"].value == 10  # W1..W10

    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    con = lakehouse.connect(cfg)
    for subdir, n in [("marts/researcher_vectors", 3), ("curated/curated_work_vectors", 10)]:
        man = json.loads(
            con.sql(
                f"SELECT content FROM read_text("
                f"'s3://{minio.bucket}/{subdir}/dt={CURATED_DT}/run={run_id}/manifest.json')"
            ).fetchone()[0]
        )
        assert man["schema_version"] == cm.MANIFEST_SCHEMA_VERSION == 1
        assert man["row_count"] == n
        # Clé voisine du bon artefact (preuve du paramétrage mart_subdir).
        assert man["parts"][0]["key"].startswith(f"{subdir}/dt={CURATED_DT}/run={run_id}/")

    # Porte GE du vecteur : dimension 384 + norme tolérante {0, ≈1}, verte sur le réel.
    assert q.check_researcher_vectors(minio.bucket, run_id).passed is True


# ── Corps de l'asset piloté par des fakes (sans Docker ni modèle ONNX) ───────
# Couvre la logique I/O de l'asset (lecture provenance, agrégat par author_id,
# écriture Parquet, lineage) en CI où Docker/MinIO est absent — le smoke e2e
# ci-dessus ne tourne qu'avec Docker.


class _FakeCon:
    """Connexion DuckDB factice : répond aux execute() selon la requête.

    - SELECT sur curated_work_topics/keywords → lignes (work_id, topic_labels, keyword_labels) ;
    - SELECT sur curated_authorships → couples (author_id, work_id) ;
    - CREATE/INSERT/DROP (matérialisation) → no-op.
    """

    def __init__(self, work_label_rows, authorship_rows):
        self._work_label_rows = work_label_rows
        self._authorship_rows = authorship_rows

    def execute(self, query):
        self._last = query
        return self

    def executemany(self, query, rows):  # matérialisation _vec_tmp : no-op
        return self

    def fetchall(self):
        if "curated_authorships" in self._last:
            return self._authorship_rows
        if "all_works" in self._last:  # la requête de _read_work_labels
            return self._work_label_rows
        return []


class _FakeEmbedder:
    """Embedder factice : vecteur déterministe par texte, sans charger le modèle."""

    def embed_text(self, text):
        # Vecteur non nul dépendant de la longueur du texte (suffit à exercer le flux).
        base = float(len(text) or 1)
        return np.full(embedding.EMBEDDING_DIM, base, dtype=np.float32)


def test_asset_body_with_fakes(monkeypatch):
    """Exerce le corps de l'asset (lecture provenance → agrégat author_id → écriture)
    sans Docker ni modèle : loader, embedder et écriture Parquet mockés."""
    import importlib

    re_mod = importlib.import_module("citation_dagster.assets.researcher_embeddings")

    work_label_rows = [
        ("https://openalex.org/W101", ["Plasma"], ["Shield"]),
        ("https://openalex.org/W102", ["Plasma"], []),
    ]
    authorship_rows = [
        ("https://openalex.org/A1", "https://openalex.org/W101"),
        ("https://openalex.org/A1", "https://openalex.org/W102"),
    ]
    fake_con = _FakeCon(work_label_rows, authorship_rows)
    writes: list[str] = []

    monkeypatch.setattr(re_mod.lakehouse, "connect", lambda cfg=None: fake_con)
    monkeypatch.setattr(
        re_mod.lakehouse,
        "duckdb_s3_config_from_env",
        lambda: type("Cfg", (), {"bucket": "citation"})(),
    )
    monkeypatch.setattr(
        re_mod.lakehouse, "copy_to_parquet", lambda con, sql, dest: writes.append(dest)
    )
    monkeypatch.setattr(re_mod.embedding, "Embedder", _FakeEmbedder)
    monkeypatch.delenv("OPENLINEAGE_URL", raising=False)  # lineage no-op

    res = re_mod.researcher_embeddings(build_asset_context())
    assert res.metadata["work_vectors"].value == 2  # W101, W102
    assert res.metadata["author_vectors"].value == 1  # A1 (porte W101 + W102)
    # Deux écritures Parquet : provenance work_id puis agrégat author_id.
    assert any("curated/curated_work_vectors" in d for d in writes)
    assert any("marts/researcher_vectors" in d for d in writes)


def test_read_work_labels_applies_topic_threshold(monkeypatch):
    """_read_work_labels assemble le texte via work_to_text (topics puis keywords)."""
    import importlib

    re_mod = importlib.import_module("citation_dagster.assets.researcher_embeddings")

    rows = [("https://openalex.org/W1", ["Topic A", "Topic B"], ["kw"])]
    fake_con = _FakeCon(rows, [])
    out = re_mod._read_work_labels(fake_con, "citation", "run1")
    assert out == [("https://openalex.org/W1", "Topic A, Topic B, kw")]
