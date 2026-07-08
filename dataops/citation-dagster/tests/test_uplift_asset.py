"""Tests de l'asset pair_uplift_model (câblage : lecture → décision → écriture).

La logique ML pure est testée dans test_uplift_model. Ici on valide l'orchestration de
l'asset : porte de décision (prédictif vs repli descriptif), métadonnées, écriture —
avec lakehouse + MLflow mockés (hermétique, sans S3 ni serveur MLflow).
"""

import re
import sys
import tempfile

import duckdb
import numpy as np
from dagster import build_asset_context

from citation_dagster.assets import uplift as mod

_MODULE = sys.modules["citation_dagster.assets.uplift"]

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "seaweedfs.s3.svc.cluster.local",
    "BUCKET_PORT": "8333",
    "BUCKET_NAME": "citation",
}


class _FakeCon:
    """Connexion DuckDB HYBRIDE pour les tests de l'asset.

    Les LECTURES S3 (profils/labels/embeddings, via ``con.sql(...).fetchall()``) sont mockées
    — pas de vrai S3. Mais le chemin d'ÉCRITURE (drift L92 : ``CREATE TABLE preds`` +
    ``executemany`` streamé + ``COPY`` avec fenêtre SQL) tourne sur une VRAIE base DuckDB en
    mémoire, pour prouver la logique SQL réelle (dédup, top-N par fenêtre). Les ``COPY ... TO
    's3://…'`` sont redirigés vers un fichier Parquet LOCAL temporaire (l'écriture réussit,
    les count() qui suivent lisent la vraie table)."""

    def __init__(self, profiles_rows, labels_rows, embedding_rows=None) -> None:
        self._profiles = profiles_rows
        self._labels = labels_rows
        self._embeddings = embedding_rows or []
        self.executed: list[str] = []
        self._db = duckdb.connect(":memory:")
        self._tmp = tempfile.mkdtemp(prefix="uplift-test-")

    def sql(self, query: str):
        if "author_profiles" in query:
            return _FakeRel(self._profiles)
        if "curated_pair_uplift_labels" in query:
            return _FakeRel(self._labels)
        if "researcher_vectors" in query:
            return _FakeRel(self._embeddings)
        return _FakeRel([])

    def _rewrite(self, query: str) -> str:
        # Redirige tout COPY vers un Parquet local temporaire (pas de S3 en test).
        return re.sub(r"'s3://[^']*'", f"'{self._tmp}/out.parquet'", query)

    def execute(self, query: str):
        self.executed.append(query)
        self._last = self._db.execute(self._rewrite(query))
        return self

    def executemany(self, query: str, params):
        self.executed.append(query)
        self._db.executemany(query, params)
        return self

    def fetchone(self):
        return self._last.fetchone()


class _FakeRel:
    def __init__(self, rows) -> None:
        self._rows = rows

    def fetchall(self):
        return self._rows


def _patch(monkeypatch, con):
    from citation_dagster.resources import ceph_target_from_env

    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(_MODULE.lakehouse, "connect", lambda cfg=None: con)
    # MLflow + lineage no-op (pas de serveur ni de Marquez en test).
    monkeypatch.setattr(_MODULE.tracking, "mlflow_config_from_env", lambda: None)
    monkeypatch.setattr(_MODULE.tracking, "log_run", lambda *a, **k: None)
    monkeypatch.setattr(_MODULE.lineage, "emit", lambda *a, **k: None)


def _signal_data(n_authors: int):
    """Profils + labels avec un VRAI signal thématique (uplift = f(cosinus))."""
    rng = np.random.default_rng(0)
    subs = [f"S{i}" for i in range(6)]
    vecs, profiles = {}, []
    for i in range(n_authors):
        a = f"A{i}"
        v = rng.random(len(subs))
        v = v / np.linalg.norm(v)
        vecs[a] = v
        for j, s in enumerate(subs):
            profiles.append((a, s, float(v[j])))
    labels = []
    for i in range(n_authors):
        for j in range(i + 1, n_authors):
            a, b = f"A{i}", f"A{j}"
            cos = float(vecs[a] @ vecs[b])
            labels.append((a, b, 5.0 * (1 - cos) ** 2 - 1.0 + rng.normal(0, 0.1)))
    return profiles, labels


def test_asset_serves_predictive_on_signal(monkeypatch) -> None:
    profiles, labels = _signal_data(40)
    con = _FakeCon(profiles, labels)
    _patch(monkeypatch, con)
    result = mod.pair_uplift_model(build_asset_context())
    # Signal réel → porte de décision = prédictif ; R² honnête positif.
    assert result.metadata["served_mode"].text == "predictive"
    assert result.metadata["r2_honest"].value > 0.2
    # Prédictif sert TOUTES les paires d'auteurs profilés (y compris inédites) :
    # 40 auteurs → C(40,2) = 780 paires.
    assert result.metadata["pairs_served"].value == 780
    # Recommandations par auteur produites (top-N partenaires).
    assert result.metadata["recommendations"].value > 0
    # Deux écritures Parquet (prédictions + recommandations).
    assert sum(1 for q in con.executed if "COPY" in q) == 2
    # Sans mart d'embeddings servi (FakeCon vide) → couverture nulle, mais l'asset tourne
    # (dégradation propre sur les seules features thématiques).
    assert result.metadata["embedding_coverage"].value == 0.0
    # Métadonnées d'observabilité (drift L96) : durée + débit du scoring, historisées par Dagster.
    assert result.metadata["scoring_duration_s"].value >= 0.0
    assert result.metadata["scoring_pairs_per_s"].value >= 0.0


def test_stream_knn_predictions_logs_progress(monkeypatch) -> None:
    """Le scoring émet des lignes de PROGRESSION via ``log`` (drift L96 : run long observable).

    On appelle directement ``_stream_knn_predictions`` avec un ``log`` capteur et un modèle
    factice (predict constant). Un run rapide ne franchit pas le throttle de 60 s → on vérifie
    au minimum la ligne de DÉBUT (M, blocs) et la ligne de FIN (paires, durée), et que des
    paires ont bien été insérées dans ``preds``.
    """
    con = _FakeCon([], [])
    con.execute(
        "CREATE TABLE preds(author_a VARCHAR, author_b VARCHAR, uplift DOUBLE, served_mode VARCHAR)"
    )
    rng = np.random.default_rng(0)
    vecs = {f"A{i}": (lambda v: v / np.linalg.norm(v))(rng.random(6)) for i in range(30)}

    class _ConstModel:
        def predict(self, feats):
            return np.zeros(len(feats))

    lines: list[str] = []
    mod._stream_knn_predictions(con, _ConstModel(), vecs, {}, 5, log=lines.append)

    assert any("M=30" in ln for ln in lines)  # ligne de début
    assert any("TERMINÉ" in ln for ln in lines)  # ligne de fin
    n = con._db.execute("SELECT count(*) FROM preds").fetchone()[0]
    assert n > 0  # des paires ont été scorées et streamées


def test_asset_predict_is_batched_and_stable(monkeypatch) -> None:
    # drift L90 : le scoring des paires candidates est LOTI (features matérialisées par lot,
    # jamais toutes d'un coup → borne la RAM). On force un lot minuscule (2 paires) pour
    # emprunter le chemin multi-lots, et on vérifie que le résultat est IDENTIQUE au cas
    # 1-lot (mêmes 780 paires servies, aucune perdue ni dupliquée à la frontière des lots).
    monkeypatch.setattr(mod, "_PREDICT_BATCH", 2)
    profiles, labels = _signal_data(40)
    con = _FakeCon(profiles, labels)
    _patch(monkeypatch, con)
    result = mod.pair_uplift_model(build_asset_context())
    assert result.metadata["served_mode"].text == "predictive"
    assert result.metadata["pairs_served"].value == 780  # 780 = C(40,2), indépendant du lot


def test_asset_uses_embedding_family_when_available(monkeypatch) -> None:
    # Avec un mart researcher_vectors servi, la 2ᵉ famille de features est branchée :
    # la couverture embedding reflète les auteurs profilés disposant d'un vecteur. Les
    # embeddings ont la dimension RÉELLE (EMBEDDING_DIM), comme le mart de production.
    from citation_dagster import embedding

    profiles, labels = _signal_data(40)
    rng = np.random.default_rng(7)
    authors = sorted({a for a, _b, _u in labels} | {b for _a, b, _u in labels})
    # Embedding pour 30 des 40 auteurs (couverture partielle = 0,75).
    embeddings = []
    for a in authors[:30]:
        v = rng.random(embedding.EMBEDDING_DIM)
        embeddings.append((a, (v / np.linalg.norm(v)).tolist()))
    con = _FakeCon(profiles, labels, embedding_rows=embeddings)
    _patch(monkeypatch, con)
    result = mod.pair_uplift_model(build_asset_context())
    assert result.metadata["served_mode"].text == "predictive"
    assert abs(result.metadata["embedding_coverage"].value - 0.75) < 1e-9
    # Toujours servi (prédictif), les features combinées n'ont pas cassé la porte.
    assert result.metadata["pairs_served"].value == 780


def test_asset_falls_back_descriptive_on_noise(monkeypatch) -> None:
    rng = np.random.default_rng(1)
    subs = [f"S{i}" for i in range(6)]
    vecs, profiles = {}, []
    for i in range(40):
        a = f"A{i}"
        v = rng.random(len(subs))
        v = v / np.linalg.norm(v)
        vecs[a] = v
        for j, s in enumerate(subs):
            profiles.append((a, s, float(v[j])))
    # Uplift = bruit pur (aucun lien aux thématiques).
    labels = [
        (f"A{i}", f"A{j}", float(rng.normal(0, 1))) for i in range(40) for j in range(i + 1, 40)
    ]
    con = _FakeCon(profiles, labels)
    _patch(monkeypatch, con)
    result = mod.pair_uplift_model(build_asset_context())
    # Pas de pouvoir prédictif honnête → repli descriptif (uplift observé des paires).
    assert result.metadata["served_mode"].text == "descriptive"
    assert result.metadata["pairs_served"].value == len(labels)
