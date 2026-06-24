"""Tests basés sur les propriétés du modèle d'uplift FWCI (PBT, ADR 0072).

Complètent ``test_uplift_model.py`` (par l'exemple, fixture ML synthétique à graine
figée) en éprouvant les **invariants mathématiques vrais pour TOUT vecteur** des
dérivations bornées PURES de ``uplift_model.py`` : symétrie des features de paire,
bornes de la L2-normalisation, stabilité dimensionnelle, déterminisme. Hermétiques
(génération en mémoire — ADR 0057).
"""

import numpy as np
from hypothesis import given
from hypothesis import strategies as st

from citation_dagster import uplift_model as um

_DIM = 8

# Composante de vecteur : un réel FINI et BORNÉ (pas de NaN/inf — le domaine réel des
# features est borné ; on éprouve les invariants, pas le comportement sur l'infini).
_COMP = st.floats(min_value=-1e3, max_value=1e3, allow_nan=False, allow_infinity=False)


@st.composite
def _vectors(draw, dim: int = _DIM):
    """Un vecteur numpy float64 de dimension ``dim`` aux composantes finies bornées."""
    values = draw(st.lists(_COMP, min_size=dim, max_size=dim))
    return np.array(values, dtype=np.float64)


# ── pair_features : SYMÉTRIE (invariant central ADR 0067) ────────────────────


@given(_vectors(), _vectors())
def test_pair_features_symmetric(va: np.ndarray, vb: np.ndarray) -> None:
    """``pair_features(va, vb) == pair_features(vb, va)`` pour TOUT couple : une paire
    n'est pas orientée (invariant de symétrie, ADR 0067)."""
    f_ab = um.pair_features(va, vb)
    f_ba = um.pair_features(vb, va)
    assert np.allclose(f_ab, f_ba)


@given(_vectors(), _vectors())
def test_pair_features_finite_and_shaped(va: np.ndarray, vb: np.ndarray) -> None:
    """Les features d'une paire sont finies et de dimension stable (2 scalaires + 2
    vecteurs de dim D = 2 + 2D)."""
    feat = um.pair_features(va, vb)
    assert feat.shape == (2 + 2 * _DIM,)
    assert np.all(np.isfinite(feat))


# ── pair_features_combined : symétrie + neutralité quand l'embedding manque ──

_EMB_DIM = 5


@given(_vectors(), _vectors(), _vectors(_EMB_DIM), _vectors(_EMB_DIM))
def test_pair_features_combined_symmetric(
    sa: np.ndarray, sb: np.ndarray, ea: np.ndarray, eb: np.ndarray
) -> None:
    """Symétrie préservée par la combinaison thématique + embedding (échange a↔b sur
    les DEUX familles)."""
    f_ab = um.pair_features_combined(sa, sb, ea, eb, _EMB_DIM)
    f_ba = um.pair_features_combined(sb, sa, eb, ea, _EMB_DIM)
    assert np.allclose(f_ab, f_ba)


@given(_vectors(), _vectors(), _vectors(_EMB_DIM), _vectors(_EMB_DIM))
def test_pair_features_combined_stable_shape_and_flag(
    sa: np.ndarray, sb: np.ndarray, ea: np.ndarray, eb: np.ndarray
) -> None:
    """La dimension est INVARIANTE selon que l'embedding est présent ou non, et le
    drapeau ``has_embedding`` vaut 1 si présent, 0 si absent — avec features embedding
    neutres (zéros) dans le cas absent."""
    sub_len = 2 + 2 * _DIM
    f_present = um.pair_features_combined(sa, sb, ea, eb, _EMB_DIM)
    f_absent = um.pair_features_combined(sa, sb, None, eb, _EMB_DIM)
    assert f_present.shape == f_absent.shape
    assert f_present[sub_len] == 1.0
    assert f_absent[sub_len] == 0.0
    # Embedding neutre = zéros quand absent ; socle thématique inchangé.
    assert np.allclose(f_absent[sub_len + 1 :], 0.0)
    assert np.allclose(f_present[:sub_len], f_absent[:sub_len])


# ── author_vectors / embedding_vectors : BORNES de la L2-normalisation ───────

_SUBFIELDS = [f"S{i}" for i in range(_DIM)]
_AUTHOR = st.text(alphabet="ABCDEFabcdef0123456789", min_size=1, max_size=6)
# Poids réalistes : exactement 0, ou une magnitude ≥ 1e-6. On exclut les
# subnormaux (~1e-162) : leur norme L2 sous-déborde à la normalisation, ce qui
# casse l'invariant « norme 0 ou 1 » par artefact de virgule flottante, sans
# qu'aucune donnée FWCI réelle ne prenne jamais de telles valeurs.
_WEIGHT = st.one_of(
    st.just(0.0),
    st.floats(min_value=1e-6, max_value=1e3, allow_nan=False, allow_infinity=False),
    st.floats(min_value=-1e3, max_value=-1e-6, allow_nan=False, allow_infinity=False),
)


@given(
    st.lists(
        st.tuples(_AUTHOR, st.sampled_from(_SUBFIELDS), _WEIGHT),
        max_size=30,
    )
)
def test_author_vectors_norm_is_zero_or_one(profiles: list[tuple]) -> None:
    """Tout vecteur d'auteur produit a une norme L2 de ``1`` (≈) OU ``0`` (si la somme
    pondérée s'annule) — jamais autre chose. Robuste aux poids arbitraires (négatifs)."""
    vecs = um.author_vectors(profiles, _SUBFIELDS)
    for v in vecs.values():
        norm = float(np.linalg.norm(v))
        assert np.isclose(norm, 1.0) or np.isclose(norm, 0.0)


@given(
    st.lists(
        st.tuples(
            _AUTHOR,
            st.one_of(
                st.none(),
                st.lists(_COMP, min_size=_EMB_DIM, max_size=_EMB_DIM),
            ),
        ),
        max_size=20,
    )
)
def test_embedding_vectors_normalized_and_rejects_null(rows: list[tuple]) -> None:
    """``embedding_vectors`` ne lève jamais (vecteur ``None`` toléré), et tout vecteur
    RETENU est L2-normalisé (norme ≈ 1) — les vecteurs nuls/absents sont écartés."""
    vecs = um.embedding_vectors(rows, dim=_EMB_DIM)
    for v in vecs.values():
        assert np.isclose(float(np.linalg.norm(v)), 1.0)


# ── top_recommendations : BORNES et déterminisme ─────────────────────────────

_UPLIFT = st.floats(min_value=-100, max_value=100, allow_nan=False, allow_infinity=False)


@given(
    st.lists(st.tuples(_AUTHOR, _AUTHOR, _UPLIFT), max_size=30),
    st.integers(min_value=0, max_value=10),
)
def test_top_recommendations_bounded_and_ranked(predicted: list[tuple], top_n: int) -> None:
    """Pour toute liste de paires prédites : aucun auteur ne reçoit plus de ``top_n``
    recommandations, les rangs sont contigus à partir de 1, et l'uplift décroît dans
    le classement de chaque auteur (déterminisme du tri)."""
    recos = um.top_recommendations(predicted, top_n=top_n)
    by_author: dict[str, list[tuple[float, int]]] = {}
    for author, _partner, uplift, rank in recos:
        by_author.setdefault(author, []).append((uplift, rank))
    for entries in by_author.values():
        assert len(entries) <= top_n
        ranks = [rank for _u, rank in entries]
        assert ranks == list(range(1, len(entries) + 1))
        uplifts = [u for u, _r in entries]
        assert uplifts == sorted(uplifts, reverse=True)


@given(st.lists(st.tuples(_AUTHOR, _AUTHOR, _UPLIFT), max_size=30), st.integers(0, 10))
def test_top_recommendations_deterministic(predicted: list[tuple], top_n: int) -> None:
    """À entrée identique, sortie identique (déterminisme — pas d'aléa caché)."""
    assert um.top_recommendations(predicted, top_n=top_n) == um.top_recommendations(
        predicted, top_n=top_n
    )
