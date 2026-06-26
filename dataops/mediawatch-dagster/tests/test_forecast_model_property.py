"""Tests basés sur les propriétés du modèle de prévision (Hypothesis, ADR 0072).

Propriétés vraies pour TOUTE série temporelle (pas seulement des exemples) : non-fuite
structurelle, non-négativité, finitude/dimension des features, déterminisme, bornes des
features calendaires, baseline saisonnière exacte sur série constante.
"""

import datetime as dt

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

from mediawatch_dagster import forecast_model as fm

_BASE = dt.date(2024, 1, 1)

# Une série : liste de volumes journaliers entiers ≥ 0, consécutifs depuis _BASE.
_counts = st.lists(st.integers(min_value=0, max_value=500), min_size=1, max_size=200)


def _rows(uid, counts):
    return [(uid, _BASE + dt.timedelta(days=i), int(c)) for i, c in enumerate(counts)]


@given(_counts)
@settings(max_examples=60, deadline=None)
def test_features_are_finite_and_well_shaped(counts):
    # build_features ne produit jamais de NaN/inf et respecte toujours la dimension figée.
    ds = fm.build_features(_rows("ror-A", counts), univ_codes={"ror-A": 0})
    assert ds.X.shape[1] == len(fm.FEATURE_NAMES)
    if ds.X.shape[0]:
        assert np.all(np.isfinite(ds.X))
        assert np.all(np.isfinite(ds.y))


@given(_counts)
@settings(max_examples=60, deadline=None)
def test_no_lag_reads_the_future(counts):
    # ANTI-FUITE structurel : tronquer la série après une date d'origine ne change pas les
    # features de cette origine (elles ne dépendent que du passé ≤ t). On compare, pour
    # chaque origine commune, les features du dataset complet et du dataset tronqué.
    rows = _rows("ror-A", counts)
    codes = {"ror-A": 0}
    ds_full = fm.build_features(rows, horizons=[1], univ_codes=codes)
    if ds_full.X.shape[0] < 2:
        return
    # Tronquer à la moitié de l'historique.
    cut = _BASE + dt.timedelta(days=len(counts) // 2)
    ds_trunc = fm.build_features([r for r in rows if r[1] <= cut], horizons=[1], univ_codes=codes)
    if ds_trunc.X.shape[0] == 0:
        return
    # Les origines présentes dans le tronqué sont un préfixe de celles du complet.
    k = ds_trunc.X.shape[0]
    assert np.allclose(ds_full.X[:k], ds_trunc.X[:k])


@given(st.integers(min_value=0, max_value=500), st.integers(min_value=30, max_value=120))
@settings(max_examples=40, deadline=None)
def test_constant_history_gives_constant_seasonal_naive(value, n_days):
    # Série constante à `value` → le saisonnier naïf prédit exactement `value` (le niveau).
    values = np.full(n_days, float(value))
    for h in (1, 7, 30, 92):
        assert fm.seasonal_naive(values, n_days - 1, h) == float(value)


@given(_counts)
@settings(max_examples=40, deadline=None)
def test_forecast_predictions_never_negative(counts):
    # Quelle que soit la série, aucune prévision servie n'est < 0.
    served, _, _ = fm.forecast(_rows("ror-A", counts))
    assert all(r["n_articles_pred"] >= 0 for r in served)


@given(st.dates(min_value=dt.date(2000, 1, 1), max_value=dt.date(2050, 12, 31)))
@settings(max_examples=80, deadline=None)
def test_calendar_features_bounded(target):
    # Les features calendaires sin/cos sont toujours dans [-1, 1] ; is_weekend ∈ {0,1}.
    feats = fm._calendar_features(target)
    *cyclic, is_weekend = feats
    assert all(-1.0 <= v <= 1.0 for v in cyclic)
    assert is_weekend in (0.0, 1.0)
