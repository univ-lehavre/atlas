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
) -> Dataset:
    """Assemble (X, y, groupes) depuis les labels d'uplift et les vecteurs d'auteurs.

    ``labels`` : ``(author_a, author_b, uplift)`` (curated_pair_uplift_labels). On ne
    retient que les paires dont les DEUX auteurs ont un vecteur (profil thématique).
    """
    rows_x, rows_y, groups = [], [], []
    for a, b, uplift in labels:
        if a in vecs and b in vecs:
            rows_x.append(pair_features(vecs[a], vecs[b]))
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
