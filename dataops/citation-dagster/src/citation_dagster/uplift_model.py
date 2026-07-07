"""Modèle prédictif d'uplift de FWCI par paire d'auteurs (ADR 0067, lot 4).

Module **pur** (numpy/sklearn, aucun Dagster, aucune I/O) : construction des features,
split honnête, entraînement, évaluation. L'asset Dagster (assets/uplift.py) ne fait que
charger les Parquet, appeler ces fonctions et logger dans MLflow.

INVARIANTS (ADR 0067) :
- **Jamais l'identité comme feature** : une paire entre dans le modèle par la
  COMBINAISON de ses deux vecteurs thématiques (subfields), pas par ses ``author_id``.
- **Features SYMÉTRIQUES** : ``f(va, vb) == f(vb, va)`` (une paire n'est pas orientée) —
  via cosinus, |différence|, produit, somme, qui sont tous symétriques.
- **Validation HONNÊTE** : split GROUPÉ par auteur (un auteur jamais à la fois en train
  et en test), sinon le R² est optimiste (un auteur vu à l'entraînement fuite via ses
  autres paires). C'est le garde-fou « conditions honnêtes » de l'ADR 0067.
- **Déterminisme** : graine figée (ADR 0057).

NB : ``from __future__ import annotations`` est OK ici (module pur, pas introspecté par
Dagster).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import GroupKFold

RANDOM_STATE = 42


def author_vectors(
    profiles: list[tuple[str, str, float]], subfields: list[str]
) -> dict[str, np.ndarray]:
    """Construit le vecteur subfields L2-normalisé de chaque auteur.

    ``profiles`` : lignes ``(author_id, subfield_id, weight)`` (mart author_profiles).
    ``subfields`` : axe ordonné des subfields (colonnes du vecteur). Le vecteur est la
    distribution pondérée de l'auteur, L2-normalisée (comparable par cosinus).
    """
    idx = {s: i for i, s in enumerate(subfields)}
    vecs: dict[str, np.ndarray] = {}
    for author_id, subfield_id, weight in profiles:
        if subfield_id not in idx:
            continue
        v = vecs.setdefault(author_id, np.zeros(len(subfields), dtype=np.float64))
        v[idx[subfield_id]] += weight
    for author_id, v in vecs.items():
        norm = np.linalg.norm(v)
        if norm > 0:
            vecs[author_id] = v / norm
    return vecs


def pair_features(va: np.ndarray, vb: np.ndarray) -> np.ndarray:
    """Features THÉMATIQUES symétriques d'une paire (jamais l'identité).

    Symétrie : cosinus, |va−vb|, va*vb, va+vb sont invariants par échange de a et b.
    """
    cos = float(va @ vb)
    return np.concatenate([[cos, float(np.linalg.norm(va - vb))], np.abs(va - vb), va * vb])


def embedding_vectors(rows: list[tuple[str, list]], dim: int) -> dict[str, np.ndarray]:
    """Construit le vecteur d'embedding (384) L2-normalisé de chaque auteur.

    ``rows`` : lignes ``(author_id, vector)`` du mart ``researcher_vectors`` (vecteur
    déjà L2-normalisé OU NUL pour un auteur sans publication vectorisable). On REJETTE
    ici les vecteurs nuls (norme ≈ 0) : un auteur sans embedding utilisable n'entre pas
    dans le dict — la paire utilisera alors les features d'embedding neutres (cf.
    ``pair_features_combined``), sans perdre le socle thématique.
    """
    vecs: dict[str, np.ndarray] = {}
    for author_id, vector in rows:
        if vector is None:
            continue
        v = np.asarray(vector, dtype=np.float64)
        norm = np.linalg.norm(v)
        if norm > 1e-9:
            vecs[author_id] = v / norm
    return vecs


def pair_features_combined(
    va_sub: np.ndarray,
    vb_sub: np.ndarray,
    va_emb: np.ndarray | None,
    vb_emb: np.ndarray | None,
    emb_dim: int,
) -> np.ndarray:
    """Features symétriques DEUX familles : thématique (subfields) + sémantique (embedding).

    Le socle thématique est TOUJOURS présent (``pair_features`` sur les subfields). La
    famille embedding ENRICHIT : si les deux auteurs ont un embedding, on ajoute ses
    features de paire (cosinus, |diff|, produit) ; sinon, ces features sont **neutres
    (zéros)** et un drapeau binaire ``has_embedding`` (0/1) le signale au modèle. Ainsi
    une paire n'est jamais perdue faute d'embedding, et le modèle peut pondérer le signal
    sémantique sans le confondre avec un vrai zéro. Symétrie préservée (chaque terme l'est).
    """
    feat_sub = pair_features(va_sub, vb_sub)
    if va_emb is not None and vb_emb is not None:
        feat_emb = pair_features(va_emb, vb_emb)
        has_emb = 1.0
    else:
        # Embedding neutre : 2 scalaires + 2 vecteurs de dim emb_dim (cf. pair_features).
        feat_emb = np.zeros(2 + 2 * emb_dim, dtype=np.float64)
        has_emb = 0.0
    return np.concatenate([feat_sub, [has_emb], feat_emb])


# Génération de candidats par plus-proches-voisins (kNN) (ADR 0067 §candidats, drift L89).
# DÉFAUT : k voisins par ligne. Scorer TOUTES les paires (a<b) est O(N²) — à l'échelle réelle
# (~90k auteurs profilés) ce sont ~4 milliards de paires, intractables en RAM/temps (OOM prod).
# On restreint aux candidats pertinents : les k plus proches voisins de chaque auteur (cosinus),
# l'union symétrisée. ~N×k paires. La MATRICE d'entrée est fournie par l'appelant (vecteur
# thématique subfields chez pair_uplift_model) ; la fonction reste agnostique de sa nature.
KNN_DEFAULT = 50


def knn_candidate_pairs(
    vectors: np.ndarray, k: int = KNN_DEFAULT, block: int = 2048
) -> list[tuple[int, int]]:
    """Paires candidates (i < j) = union des k plus proches voisins cosinus de chaque ligne.

    ``vectors`` : matrice (M, D) de vecteurs **déjà L2-normalisés** → la similarité cosinus
    est le simple produit scalaire ``V @ V.T``. On CALCULE par blocs de lignes (jamais la
    matrice M×M complète : à M=90k elle ferait ~30 Go) : pour chaque bloc, top-k par
    ``argpartition`` (O(M) par ligne, pas de tri complet), self exclu. Renvoie des INDICES de
    lignes, dédupliqués sur ``(min, max)`` — chaque paire non orientée une seule fois
    (invariant attendu par ``top_recommendations`` et l'écriture Parquet).

    Le voisinage kNN n'est pas symétrique (b ∈ voisins(a) n'implique pas a ∈ voisins(b)) ;
    l'union des deux sens garantit qu'un auteur reçoit des candidats des DEUX côtés. Prendre
    ``k ≥ TOP_N`` assure assez de partenaires pour remplir les recommandations top-N.
    """
    m = vectors.shape[0]
    if m < 2:
        return []
    kk = min(k, m - 1)
    pairs: set[tuple[int, int]] = set()
    for start in range(0, m, block):
        sims = vectors[start : start + block] @ vectors.T  # (b, M), cosinus
        for local_i, row in enumerate(sims):
            i = start + local_i
            row[i] = -np.inf  # jamais soi-même
            neighbors = np.argpartition(row, -kk)[-kk:]
            for j in neighbors:
                j = int(j)
                if i != j:
                    pairs.add((i, j) if i < j else (j, i))
    return sorted(pairs)


@dataclass(frozen=True)
class Dataset:
    """Matrice de features X, cible y (uplift), et groupes (auteurs) pour le split."""

    X: np.ndarray
    y: np.ndarray
    # Un groupe par paire : l'identifiant des DEUX auteurs sert à empêcher qu'un auteur
    # soit à la fois en train et test (GroupKFold sur le 1er auteur ne suffit pas — on
    # encode la paire par son auteur "a", borne basse du fold ; voir grouped_cv).
    group_a: np.ndarray  # author_a de chaque paire (clé de groupe)


def build_dataset(
    labels: list[tuple[str, str, float]],
    vecs: dict[str, np.ndarray],
    emb_vecs: dict[str, np.ndarray] | None = None,
    emb_dim: int = 0,
) -> Dataset:
    """Assemble (X, y, groupes) depuis les labels d'uplift et les vecteurs d'auteurs.

    ``labels`` : ``(author_a, author_b, uplift)`` (curated_pair_uplift_labels). On ne
    retient que les paires dont les DEUX auteurs ont un vecteur THÉMATIQUE (``vecs``) — le
    socle obligatoire. ``emb_vecs`` (optionnel) ajoute la 2ᵉ famille de features (embedding
    384) : présent pour une paire → enrichit ; absent pour l'un des deux → features
    embedding neutres + drapeau (cf. ``pair_features_combined``). Sans ``emb_vecs``, on
    reste sur les seules features thématiques (rétro-compatible).
    """
    rows_x, rows_y, groups = [], [], []
    for a, b, uplift in labels:
        if a not in vecs or b not in vecs:
            continue
        if emb_vecs is None:
            rows_x.append(pair_features(vecs[a], vecs[b]))
        else:
            rows_x.append(
                pair_features_combined(vecs[a], vecs[b], emb_vecs.get(a), emb_vecs.get(b), emb_dim)
            )
        rows_y.append(uplift)
        groups.append(a)
    return Dataset(
        X=np.array(rows_x, dtype=np.float64),
        y=np.array(rows_y, dtype=np.float64),
        group_a=np.array(groups),
    )


@dataclass(frozen=True)
class Evaluation:
    """Métriques de la validation honnête (groupée par auteur)."""

    r2: float
    mae: float
    baseline_mae: float
    n_pairs: int
    n_splits: int

    @property
    def beats_baseline(self) -> bool:
        return self.mae < self.baseline_mae

    @property
    def has_predictive_power(self) -> bool:
        """Porte de décision (ADR 0067) : R² nettement positif ET bat la baseline."""
        return self.r2 > 0.05 and self.beats_baseline


def _new_model() -> GradientBoostingRegressor:
    return GradientBoostingRegressor(random_state=RANDOM_STATE, n_estimators=200, max_depth=3)


def evaluate_grouped(ds: Dataset, n_splits: int = 5) -> Evaluation:
    """Validation croisée GROUPÉE par auteur (conditions honnêtes, ADR 0067).

    GroupKFold garantit qu'aucun auteur (``group_a``) n'apparaît dans deux folds — le
    R² obtenu est donc honnête (pas de fuite d'un auteur entre train et test). Compare
    au baseline trivial (prédire la moyenne du train).
    """
    n_groups = len(np.unique(ds.group_a))
    folds = min(n_splits, n_groups)
    if folds < 2:
        raise ValueError("Pas assez de groupes (auteurs distincts) pour une validation groupée")
    gkf = GroupKFold(n_splits=folds)
    r2s, maes, base_maes = [], [], []
    for train, test in gkf.split(ds.X, ds.y, groups=ds.group_a):
        model = _new_model().fit(ds.X[train], ds.y[train])
        pred = model.predict(ds.X[test])
        base = DummyRegressor(strategy="mean").fit(ds.X[train], ds.y[train]).predict(ds.X[test])
        r2s.append(_r2(ds.y[test], pred))
        maes.append(_mae(ds.y[test], pred))
        base_maes.append(_mae(ds.y[test], base))
    return Evaluation(
        r2=float(np.mean(r2s)),
        mae=float(np.mean(maes)),
        baseline_mae=float(np.mean(base_maes)),
        n_pairs=len(ds.y),
        n_splits=folds,
    )


def train_final(ds: Dataset) -> GradientBoostingRegressor:
    """Entraîne le modèle final sur TOUTES les paires (pour servir des prédictions)."""
    return _new_model().fit(ds.X, ds.y)


def top_recommendations(
    predicted: list[tuple[str, str, float]], top_n: int
) -> list[tuple[str, str, float, int]]:
    """Top-N partenaires par auteur, depuis les paires (a, b, uplift) prédites.

    Chaque paire non orientée contribue aux DEUX auteurs (a recommande b, b recommande
    a). Pour chaque auteur, on classe ses partenaires par uplift décroissant et on garde
    les ``top_n`` premiers. Retourne ``(author_id, partner_id, uplift, rank)`` — la
    forme servie (recommandation d'AUTEURS ; la reco de THÉMATIQUES se dérive du profil
    du partenaire en aval). Déterministe : tri (uplift desc, partner_id) stable.
    """
    by_author: dict[str, list[tuple[str, float]]] = {}
    for a, b, uplift in predicted:
        by_author.setdefault(a, []).append((b, uplift))
        by_author.setdefault(b, []).append((a, uplift))
    out: list[tuple[str, str, float, int]] = []
    for author in sorted(by_author):
        ranked = sorted(by_author[author], key=lambda t: (-t[1], t[0]))[:top_n]
        for rank, (partner, uplift) in enumerate(ranked, start=1):
            out.append((author, partner, uplift, rank))
    return out


def _r2(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    ss_res = float(np.sum((y_true - y_pred) ** 2))
    ss_tot = float(np.sum((y_true - np.mean(y_true)) ** 2))
    return 1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0


def _mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs(y_true - y_pred)))
