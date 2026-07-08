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


def test_pair_features_block_matches_unit_loop() -> None:
    """``pair_features_block`` (vectorisé) ≡ la boucle ``pair_features_combined`` par paire.

    Garde-fou de l'optim de débit (drift L96) : la version bloc doit rendre les MÊMES features
    que l'ancienne boucle Python — sinon les prédictions du modèle changeraient (déterminisme
    ADR 0057). Les colonnes vectorielles (|a−b|, a·b) sont bit-à-bit identiques ; les 2 scalaires
    ``cos``/``dist`` peuvent différer d'1 ULP (~1e-16) car ``a @ b`` (BLAS ddot) et ``np.sum``
    accumulent dans un ordre différent — écart sans effet sur le modèle (seuils de split très au-
    dessus). On exige donc l'égalité au dernier bit près (``atol=1e-12``), pas un array_equal
    trompeur. Couvre les 4 cas d'embedding : (présent,présent), (présent,absent), (absent,*)."""
    rng = _rng()
    # 6 auteurs : indices 0-2 avec embedding, 3-5 sans (embedding neutre = zéros).
    subs = np.stack([_random_unit(rng) for _ in range(6)])
    embs = np.stack([rng.random(_EMB_DIM) for _ in range(6)])
    embs = embs / np.linalg.norm(embs, axis=1, keepdims=True)
    present = np.array([True, True, True, False, False, False])
    emb_matrix = np.where(present[:, None], embs, 0.0)  # zéros là où absent

    # Toutes les paires (i<j) : couvre les 4 combinaisons présent/absent.
    pairs = [(i, j) for i in range(6) for j in range(i + 1, 6)]
    ii = np.array([i for i, _ in pairs])
    jj = np.array([j for _, j in pairs])

    # Référence : boucle unitaire (le chemin AVANT l'optim).
    ref = np.stack(
        [
            um.pair_features_combined(
                subs[i],
                subs[j],
                embs[i] if present[i] else None,
                embs[j] if present[j] else None,
                _EMB_DIM,
            )
            for i, j in pairs
        ]
    )
    # Vectorisé : le chemin APRÈS l'optim.
    got = um.pair_features_block(
        subs[ii], subs[jj], emb_matrix[ii], emb_matrix[jj], present[ii] & present[jj], _EMB_DIM
    )
    assert got.shape == ref.shape
    # Écart maximal ≤ 1 ULP : seuls les scalaires cos/dist (thématique ET embedding) diffèrent
    # d'~1e-16 (BLAS ddot vs np.sum), le reste est identique. Aucun effet sur le modèle.
    assert np.allclose(got, ref, rtol=0, atol=1e-12)
    assert (
        np.abs(got - ref).max() < 1e-15
    )  # borne dure : c'est du bruit sub-ULP, pas un écart logique
    # Les parties vectorielles (|sub_diff|, sub_prod) sont EXACTEMENT identiques.
    sub_len = 2 + 2 * len(_SUBFIELDS)
    assert np.array_equal(got[:, 2:sub_len], ref[:, 2:sub_len])
    # Le drapeau has_embedding (colonne charnière) est exact (0.0/1.0), jamais bruité.
    assert np.array_equal(got[:, sub_len], ref[:, sub_len])


def test_knn_block_size_derives_from_budget() -> None:
    # Source unique de la taille de bloc : bornée, ≥ 64, ≤ m ; m < 2 → 1.
    assert um.knn_block_size(1) == 1
    assert um.knn_block_size(0) == 1
    assert um.knn_block_size(100) == 100  # petit m → tout tient (min(m, budget//..))
    big = um.knn_block_size(242_000)
    assert 64 <= big <= 242_000
    # cohérent avec le budget : block ≈ budget_bytes // (m*8)
    assert big == max(64, min(242_000, um._KNN_SIMS_BUDGET_BYTES // (242_000 * 8)))


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


def test_build_dataset_caps_training_labels(monkeypatch) -> None:
    # drift L93 : au-delà de _MAX_TRAIN_LABELS, l'entraînement est échantillonné (borne la RAM
    # de la matrice X). On plafonne à 10 sur 50 paires → X a AU PLUS 10 lignes.
    monkeypatch.setattr(um, "_MAX_TRAIN_LABELS", 10)
    rng = _rng()
    authors = [f"A{i}" for i in range(50)]
    vecs = {a: _random_unit(rng) for a in authors}
    labels = [(authors[i], authors[i + 1], float(i)) for i in range(49)]  # 49 paires complètes
    ds = um.build_dataset(labels, vecs)
    assert len(ds.y) == 10  # plafonné


def test_sample_labels_deterministic_and_passthrough(monkeypatch) -> None:
    labels = [(f"A{i}", f"A{i + 1}", float(i)) for i in range(100)]
    # Sous le plafond → tout est conservé (rétro-compat).
    monkeypatch.setattr(um, "_MAX_TRAIN_LABELS", 200)
    assert um._sample_labels(labels) == labels
    # Au-dessus → échantillon REPRODUCTIBLE (graine figée, ADR 0057) : deux appels identiques.
    monkeypatch.setattr(um, "_MAX_TRAIN_LABELS", 20)
    s1, s2 = um._sample_labels(labels), um._sample_labels(labels)
    assert len(s1) == 20 and s1 == s2


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


def _unit_rows(n, d, rng):
    """n vecteurs (d) L2-normalisés (contrat d'entrée de knn_candidate_pairs)."""
    m = rng.random((n, d))
    return m / np.linalg.norm(m, axis=1, keepdims=True)


def _collect_pairs(vectors, **kw):
    """Consomme le GÉNÉRATEUR knn_candidate_pairs (yield d'arrays par bloc, drift L92) et
    déduplique globalement en un set de tuples (i, j) — la dédup globale que l'asset délègue
    au DISTINCT DuckDB. Pour les tests : matérialise le résultat complet."""
    pairs = set()
    for block in um.knn_candidate_pairs(vectors, **kw):
        for i, j in block:
            pairs.add((int(i), int(j)))
    return sorted(pairs)


def test_knn_candidate_pairs_degenerates_to_all_pairs_when_k_ge_n() -> None:
    # k ≥ N-1 → chaque ligne voisine toutes les autres → union = TOUTES les paires C(N,2).
    # (préserve le comportement historique "toutes les paires" au petit N, ex. tests d'asset).
    pairs = _collect_pairs(_unit_rows(6, 4, _rng()), k=50)
    assert len(pairs) == 6 * 5 // 2  # C(6,2) = 15
    assert all(i < j for i, j in pairs)  # invariant (i < j), non orienté
    assert len(pairs) == len(set(pairs))  # dédupliqué


def test_knn_candidate_pairs_bounded_by_k_at_scale() -> None:
    # À grand N, le nombre de paires est borné par ~N*k (≪ N²) — c'est tout l'objet du fix L89.
    rng = _rng()
    n, k = 400, 5
    pairs = _collect_pairs(_unit_rows(n, 8, rng), k=k, block=64)
    assert len(pairs) <= n * k  # union symétrisée, borne haute
    assert len(pairs) < n * (n - 1) // 2  # STRICTEMENT moins que toutes les paires
    assert all(i < j for i, j in pairs) and len(pairs) == len(set(pairs))


def test_knn_candidate_pairs_yields_blocks_bounded_by_block_size() -> None:
    # drift L92 : générateur → chaque yield est un array (≤ block·k, 2), jamais l'union complète.
    rng = _rng()
    blocks = list(um.knn_candidate_pairs(_unit_rows(300, 8, rng), k=5, block=64))
    assert len(blocks) >= 2  # 300 lignes / bloc 64 → plusieurs blocs (pas tout d'un coup)
    for arr in blocks:
        assert arr.shape[1] == 2 and arr.shape[0] <= 64 * 5  # borné par bloc·k
        assert (arr[:, 0] < arr[:, 1]).all()  # (i < j) par bloc


def test_knn_candidate_pairs_picks_nearest() -> None:
    # 3 vecteurs : 0 et 1 quasi colinéaires (voisins), 2 orthogonal. k=1 → la paire (0,1)
    # doit sortir ; (0,2) non (2 n'est le plus proche de personne ; 0 et 1 se choisissent).
    vecs = np.array([[1.0, 0.0], [0.9987, 0.0500], [0.0, 1.0]])
    vecs = vecs / np.linalg.norm(vecs, axis=1, keepdims=True)
    pairs = _collect_pairs(vecs, k=1)
    assert (0, 1) in pairs
    assert (0, 2) not in pairs
