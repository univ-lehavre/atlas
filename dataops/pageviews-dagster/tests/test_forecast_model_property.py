"""Tests basés sur les propriétés du modèle de prévision (Hypothesis, ADR 0072).

Propriétés vraies pour TOUTE série mensuelle (pas seulement des exemples choisis) :
finitude/dimension des features, non-fuite structurelle (aucun lag ne lit le futur),
non-négativité des prévisions servies, bornes des features calendaires (month_sin/cos ∈
[-1, 1]), et exactitude de la baseline saisonnière annuelle sur série constante. Homologue
mensuel des property tests de mediawatch (dont la saisonnalité est hebdomadaire).
"""

import datetime as dt

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

from pageviews_dagster import forecast_model as fm

from .conftest import BASE, month_from_index, month_index

# Une série mensuelle : liste de volumes entiers ≥ 0, consécutifs depuis BASE. Jusqu'à ~72
# mois (6 ans) pour couvrir plusieurs cycles annuels sans exploser le temps de test.
_counts = st.lists(st.integers(min_value=0, max_value=5000), min_size=1, max_size=72)


def _rows(uid, counts):
    start = month_index(BASE)
    return [(uid, month_from_index(start + i), int(c)) for i, c in enumerate(counts)]


@given(_counts)
@settings(max_examples=60, deadline=None)
def test_features_are_finite_and_well_shaped(counts):
    # build_features ne produit jamais de NaN/inf et respecte toujours la dimension figée.
    ds = fm.build_features(_rows("uni-A", counts), univ_codes={"uni-A": 0})
    assert ds.X.shape[1] == len(fm.FEATURE_NAMES)
    if ds.X.shape[0]:
        assert np.all(np.isfinite(ds.X))
        assert np.all(np.isfinite(ds.y))
        # y (vues observées à t+h) est toujours ≥ 0.
        assert np.all(ds.y >= 0.0)


@given(_counts)
@settings(max_examples=60, deadline=None)
def test_no_lag_reads_the_future(counts):
    # ANTI-FUITE structurel : tronquer la série après un mois d'origine ne change pas les
    # features de ce mois (elles ne dépendent que du passé ≤ t). On compare, pour les mois
    # d'origine communs (préfixe), les features des datasets complet et tronqué.
    rows = _rows("uni-A", counts)
    codes = {"uni-A": 0}
    ds_full = fm.build_features(rows, horizons=[1], univ_codes=codes)
    if ds_full.X.shape[0] < 2:
        return
    cut = month_from_index(month_index(BASE) + len(counts) // 2)
    ds_trunc = fm.build_features([r for r in rows if r[1] <= cut], horizons=[1], univ_codes=codes)
    if ds_trunc.X.shape[0] == 0:
        return
    k = ds_trunc.X.shape[0]
    assert np.allclose(ds_full.X[:k], ds_trunc.X[:k])


@given(_counts)
@settings(max_examples=40, deadline=None)
def test_forecast_predictions_never_negative(counts):
    # Quelle que soit la série, aucune prévision servie n'est < 0 (compte de vues ≥ 0).
    served, _, _ = fm.forecast(_rows("uni-A", counts))
    assert all(r["views_pred"] >= 0 for r in served)


@given(st.integers(min_value=0, max_value=5000), st.integers(min_value=13, max_value=72))
@settings(max_examples=40, deadline=None)
def test_constant_history_gives_constant_seasonal_naive(value, n_months):
    # Série constante à `value` (≥ 1 cycle annuel) → le saisonnier naïf prédit exactement
    # `value` pour tous les horizons métier (1 / 3 / 12 mois).
    values = np.full(n_months, float(value))
    for h in (1, 3, 12):
        assert fm.seasonal_naive(values, n_months - 1, h) == float(value)


@given(st.dates(min_value=dt.date(2000, 1, 1), max_value=dt.date(2050, 12, 31)))
@settings(max_examples=80, deadline=None)
def test_calendar_features_bounded(target):
    # Les features calendaires (month_sin, month_cos) sont toujours dans [-1, 1].
    month_sin, month_cos = fm._calendar_features(target)
    assert -1.0 <= month_sin <= 1.0
    assert -1.0 <= month_cos <= 1.0


@given(_counts)
@settings(max_examples=40, deadline=None)
def test_dense_series_has_no_gaps(counts):
    # La densification produit un calendrier mensuel CONTIGU (aucun trou) : chaque mois suit
    # le précédent d'exactement un mois. Invariant qui garantit que lag_12 lit bien -12 mois.
    months = [month_from_index(month_index(BASE) + i) for i in range(len(counts))]
    full, values = fm._dense_series(months, [int(c) for c in counts])
    assert len(full) == len(values) == len(counts)
    # Contiguïté : chaque mois suit le précédent d'exactement 1 (vacuité OK si 1 seul mois).
    for a, b in zip(full[:-1], full[1:], strict=True):
        assert month_index(b) - month_index(a) == 1
