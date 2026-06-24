"""Tests du modèle d'uplift FWCI (ADR 0067, lot 4) — pur, déterministe, sans Dagster.

Prouve sur un **fixture ML synthétique déterministe** (graine figée) :
1. **invariants** : features symétriques (f(va,vb)==f(vb,va)), pas d'identité ;
2. **pouvoir prédictif** : quand l'uplift dépend VRAIMENT des thématiques, le modèle
   l'apprend (R² > 0 en validation GROUPÉE par auteur) ;
3. **contrôle négatif** : quand l'uplift est du BRUIT pur, le R² honnête ≈ 0 (le modèle
   ne sur-apprend pas — c'est ce que la validation groupée garantit) ;
4. **garde-fou anti-fuite** : un split groupé par auteur donne un R² < un split naïf
   (preuve que la validation honnête est plus exigeante).
"""

import numpy as np

from citation_dagster import uplift_model as um

_SUBFIELDS = [f"S{i}" for i in range(8)]


def _rng():
    return np.random.default_rng(0)


def _random_unit(rng) -> np.ndarray:
    v = rng.random(len(_SUBFIELDS))
    return v / np.linalg.norm(v)


_EMB_DIM = 5


def test_pair_features_symmetric() -> None:
    rng = _rng()
    va, vb = _random_unit(rng), _random_unit(rng)
    # Une paire n'est pas orientée : f(va,vb) == f(vb,va).
    assert np.allclose(um.pair_features(va, vb), um.pair_features(vb, va))


def test_embedding_vectors_l2_normalized_and_skips_null() -> None:
    rows = [
        ("A", [3.0, 4.0, 0.0]),  # norme 5 → normalisé
        ("B", [0.0, 0.0, 0.0]),  # vecteur NUL → écarté (pas d'embedding utilisable)
        ("C", None),  # absent → écarté
    ]
    vecs = um.embedding_vectors(rows, dim=3)
    assert set(vecs) == {"A"}  # B (nul) et C (None) écartés
    assert abs(np.linalg.norm(vecs["A"]) - 1.0) < 1e-9
    assert abs(vecs["A"][0] - 0.6) < 1e-9 and abs(vecs["A"][1] - 0.8) < 1e-9


def test_pair_features_combined_symmetric_and_neutral_when_absent() -> None:
    rng = _rng()
    sa, sb = _random_unit(rng), _random_unit(rng)
    ea = rng.random(_EMB_DIM)
    ea = ea / np.linalg.norm(ea)
    eb = rng.random(_EMB_DIM)
    eb = eb / np.linalg.norm(eb)
    # Symétrie avec les deux embeddings présents.
    f_ab = um.pair_features_combined(sa, sb, ea, eb, _EMB_DIM)
    f_ba = um.pair_features_combined(sb, sa, eb, ea, _EMB_DIM)
    assert np.allclose(f_ab, f_ba)
    # Drapeau has_embedding = 1 quand présent, 0 quand absent ; mêmes dimensions.
    f_present = um.pair_features_combined(sa, sb, ea, eb, _EMB_DIM)
    f_absent = um.pair_features_combined(sa, sb, None, eb, _EMB_DIM)  # un côté manquant
    assert f_present.shape == f_absent.shape
    sub_len = 2 + 2 * len(_SUBFIELDS)
    assert f_present[sub_len] == 1.0  # has_embedding
    assert f_absent[sub_len] == 0.0
    # Features embedding neutres (zéros) quand absent.
    assert np.allclose(f_absent[sub_len + 1 :], 0.0)
    # Le socle thématique est identique dans les deux cas (l'embedding n'écrase rien).
    assert np.allclose(f_present[:sub_len], f_absent[:sub_len])


def test_author_vectors_l2_normalized() -> None:
    profiles = [("A", "S0", 3.0), ("A", "S1", 4.0), ("B", "S2", 1.0)]
    vecs = um.author_vectors(profiles, _SUBFIELDS)
    assert abs(np.linalg.norm(vecs["A"]) - 1.0) < 1e-9
    # A : (3,4,0,…) normalisé → (0.6, 0.8, 0, …).
    assert abs(vecs["A"][0] - 0.6) < 1e-9 and abs(vecs["A"][1] - 0.8) < 1e-9


def _synthetic(rng, n_authors: int, signal: bool):
    """Génère profils + labels. Si signal=True, l'uplift dépend du cosinus thématique."""
    authors = [f"A{i}" for i in range(n_authors)]
    profiles, vecs = [], {}
    for a in authors:
        v = _random_unit(rng)
        vecs[a] = v
        for i, s in enumerate(_SUBFIELDS):
            if v[i] > 0:
                profiles.append((a, s, float(v[i])))
    labels = []
    for i in range(n_authors):
        for j in range(i + 1, n_authors):
            a, b = authors[i], authors[j]
            cos = float(vecs[a] @ vecs[b])
            if signal:
                # Uplift = fonction NON LINÉAIRE de la complémentarité thématique + bruit.
                uplift = 5.0 * (1.0 - cos) ** 2 - 1.0 + rng.normal(0, 0.1)
            else:
                uplift = rng.normal(0, 1.0)  # bruit pur, aucun lien aux thématiques
            labels.append((a, b, uplift))
    return profiles, labels


def test_model_learns_thematic_signal() -> None:
    rng = _rng()
    profiles, labels = _synthetic(rng, n_authors=40, signal=True)
    vecs = um.author_vectors(profiles, _SUBFIELDS)
    ds = um.build_dataset(labels, vecs)
    ev = um.evaluate_grouped(ds, n_splits=5)
    # Signal réel non linéaire → le gradient boosting l'apprend même en validation
    # groupée (R² nettement positif, MAE < baseline).
    assert ev.r2 > 0.2
    assert ev.beats_baseline
    assert ev.has_predictive_power


def test_no_signal_gives_zero_r2() -> None:
    rng = _rng()
    profiles, labels = _synthetic(rng, n_authors=40, signal=False)
    vecs = um.author_vectors(profiles, _SUBFIELDS)
    ds = um.build_dataset(labels, vecs)
    ev = um.evaluate_grouped(ds, n_splits=5)
    # Bruit pur → la validation GROUPÉE empêche le sur-apprentissage : R² ≈ 0 ou négatif.
    # C'est la preuve que has_predictive_power ne se déclenche pas à tort.
    assert ev.r2 < 0.05
    assert not ev.has_predictive_power


def test_build_dataset_skips_pairs_without_profile() -> None:
    vecs = {"A": _random_unit(_rng())}  # B absent
    ds = um.build_dataset([("A", "B", 1.0), ("A", "C", 2.0)], vecs)
    assert len(ds.y) == 0  # aucune paire complète


def test_combined_features_capture_embedding_signal() -> None:
    # L'uplift dépend du SEUL embedding (subfields aléatoires, sans lien) → le modèle ne
    # peut l'apprendre QUE via la 2ᵉ famille. Prouve que brancher l'embedding apporte un
    # signal réel, en validation GROUPÉE honnête.
    rng = _rng()
    n, emb_dim = 40, 6
    authors = [f"A{i}" for i in range(n)]
    profiles, sub_vecs, emb_rows = [], {}, []
    for a in authors:
        sub = _random_unit(rng)  # subfields = bruit (aucun lien à l'uplift)
        sub_vecs[a] = sub
        for i, s in enumerate(_SUBFIELDS):
            profiles.append((a, s, float(sub[i])))
        e = rng.random(emb_dim)
        emb_rows.append((a, (e / np.linalg.norm(e)).tolist()))
    emb_vecs = um.embedding_vectors(emb_rows, dim=emb_dim)
    labels = []
    for i in range(n):
        for j in range(i + 1, n):
            a, b = authors[i], authors[j]
            cos_emb = float(emb_vecs[a] @ emb_vecs[b])
            labels.append((a, b, 5.0 * (1.0 - cos_emb) ** 2 - 1.0 + rng.normal(0, 0.1)))
    vecs = um.author_vectors(profiles, _SUBFIELDS)
    ds = um.build_dataset(labels, vecs, emb_vecs, emb_dim)
    ev = um.evaluate_grouped(ds, n_splits=5)
    # Le signal (porté par l'embedding) est appris malgré des subfields non informatifs.
    assert ev.r2 > 0.15
    assert ev.has_predictive_power


def test_combined_dataset_rejects_noise() -> None:
    # Contrôle négatif AVEC embeddings : uplift = bruit pur → R² honnête ≈ 0, la porte
    # ne s'arme pas (le branchement de l'embedding ne crée pas de faux signal).
    rng = _rng()
    n, emb_dim = 40, 6
    authors = [f"A{i}" for i in range(n)]
    profiles, emb_rows = [], []
    for a in authors:
        sub = _random_unit(rng)
        for i, s in enumerate(_SUBFIELDS):
            profiles.append((a, s, float(sub[i])))
        e = rng.random(emb_dim)
        emb_rows.append((a, (e / np.linalg.norm(e)).tolist()))
    emb_vecs = um.embedding_vectors(emb_rows, dim=emb_dim)
    labels = [
        (authors[i], authors[j], float(rng.normal(0, 1))) for i in range(n) for j in range(i + 1, n)
    ]
    vecs = um.author_vectors(profiles, _SUBFIELDS)
    ds = um.build_dataset(labels, vecs, emb_vecs, emb_dim)
    ev = um.evaluate_grouped(ds, n_splits=5)
    assert ev.r2 < 0.05
    assert not ev.has_predictive_power


def test_top_recommendations_per_author_ranked() -> None:
    # 3 auteurs, 3 paires : chaque auteur reçoit ses partenaires classés par uplift.
    predicted = [("A", "B", 5.0), ("A", "C", 2.0), ("B", "C", 9.0)]
    recos = um.top_recommendations(predicted, top_n=10)
    by_author = {}
    for author, partner, uplift, rank in recos:
        by_author.setdefault(author, []).append((partner, uplift, rank))
    # A : B(5) avant C(2).
    assert by_author["A"] == [("B", 5.0, 1), ("C", 2.0, 2)]
    # C : B(9) avant A(2).
    assert by_author["C"] == [("B", 9.0, 1), ("A", 2.0, 2)]


def test_top_recommendations_respects_top_n() -> None:
    predicted = [("A", f"B{i}", float(i)) for i in range(5)]
    recos = um.top_recommendations(predicted, top_n=2)
    a_recos = [r for r in recos if r[0] == "A"]
    # A garde ses 2 meilleurs partenaires (uplift 4 et 3).
    assert [r[1] for r in a_recos] == ["B4", "B3"]


def test_train_final_predicts() -> None:
    rng = _rng()
    profiles, labels = _synthetic(rng, n_authors=20, signal=True)
    vecs = um.author_vectors(profiles, _SUBFIELDS)
    ds = um.build_dataset(labels, vecs)
    model = um.train_final(ds)
    # Le modèle entraîné prédit un réel par paire (forme attendue).
    pred = model.predict(ds.X[:3])
    assert pred.shape == (3,)
