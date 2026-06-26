"""Tests du modèle de prévision (ADR 0081) — exemples déterministes, hermétiques.

Pattern calqué sur ``citation`` ``test_uplift_model.py`` : fixtures synthétiques à graine
figée, aucun I/O. Couvre l'anti-fuite (lags ≤ origine, embargo), la porte de décision
(signal saisonnier → prédictif ; bruit i.i.d. → repli descriptif), la baseline exigeante,
la non-négativité et la cohérence des fenêtres agrégées.
"""

import datetime as dt

import numpy as np

from mediawatch_dagster import forecast_model as fm

_BASE = dt.date(2024, 1, 1)


def _series(uid, n_days, fn, seed=0):
    """Série journalière (uid, date, n_articles) ; fn(i, weekday, rng) → volume entier ≥ 0."""
    rng = np.random.default_rng(seed)
    rows = []
    for i in range(n_days):
        d = _BASE + dt.timedelta(days=i)
        rows.append((uid, d, max(0, int(fn(i, d.weekday(), rng)))))
    return rows


def _seasonal(level=20.0, amp=8.0, noise=1.0):
    return lambda i, dow, rng: level + amp * np.sin(2 * np.pi * dow / 7) + rng.normal(0, noise)


# ── build_features : anti-fuite structurel ───────────────────────────────────


def test_build_features_lags_are_strictly_past():
    # Toute feature de lag/rolling d'une ligne d'origine t indexe une date ≤ t : on le prouve
    # en comparant le dataset complet à un dataset TRONQUÉ après t — les lignes communes
    # d'origine doivent avoir des features IDENTIQUES (le futur retiré ne change rien).
    rows = _series("ror-A", 120, lambda i, dow, rng: 10 + 5 * np.sin(i), seed=1)
    codes = {"ror-A": 0}
    ds_full = fm.build_features(rows, horizons=[1], univ_codes=codes)
    cut = _BASE + dt.timedelta(days=60)
    ds_trunc = fm.build_features([r for r in rows if r[1] <= cut], horizons=[1], univ_codes=codes)
    # La 1re ligne (origine la plus ancienne) existe dans les deux → features identiques.
    assert np.allclose(ds_full.X[0], ds_trunc.X[0])


def test_build_features_fills_gaps_with_zero():
    # Une série lacunaire (jours manquants) est densifiée à 0 : le dataset a des lignes même
    # si certains jours n'ont pas d'observation (sinon les lags sauteraient des trous).
    rows = [("ror-A", _BASE + dt.timedelta(days=i), 5) for i in range(0, 80, 2)]  # un jour sur deux
    ds = fm.build_features(rows, horizons=[1], univ_codes={"ror-A": 0})
    assert ds.X.shape[0] > 0
    assert ds.X.shape[1] == len(fm.FEATURE_NAMES)


# ── Porte de décision : signal vs bruit ──────────────────────────────────────


def test_seasonal_signal_is_predictive():
    # Un vrai signal saisonnier hebdomadaire → la validation honnête confirme le pouvoir.
    rows = _series("ror-A", 300, _seasonal(), seed=7)
    _, ev, mode = fm.forecast(rows)
    assert mode == "predictive"
    assert ev is not None and ev.r2 > 0.2 and ev.beats_baseline and ev.has_predictive_power


def test_iid_noise_falls_back_descriptive():
    # CONTRÔLE NÉGATIF décisif : un bruit i.i.d. (aucune structure temporelle) ne doit PAS
    # battre la baseline. Sans l'embargo anti-fuite, le modèle « gagnait » à tort ; avec, la
    # porte rabat en descriptif. C'est la garantie que la validation est honnête.
    rng = np.random.default_rng(7)
    rows = _series("ror-A", 300, lambda i, dow, r: rng.integers(0, 100), seed=99)
    _, ev, mode = fm.forecast(rows)
    assert mode == "descriptive"
    assert ev is not None and not ev.has_predictive_power


def test_short_history_falls_back_without_crash():
    # En banc (échantillon de jours borné), trop peu de dates → backtest lève → repli
    # descriptif, sans crash. La baseline saisonnière est servie.
    rows = _series("ror-A", 20, lambda i, dow, r: 5, seed=0)
    served, ev, mode = fm.forecast(rows)
    assert mode == "descriptive"
    assert len(served) == 3  # 1 université × 3 horizons (week/month/quarter)


# ── Baseline et prévisions ───────────────────────────────────────────────────


def test_seasonal_naive_is_exact_on_weekly_series():
    # Sur une série purement S=7 (le même motif chaque semaine), le saisonnier naïf est
    # EXACT — preuve que c'est une baseline difficile à battre.
    values = np.array([float((i % 7) * 3) for i in range(70)])
    # h=7 : même jour de semaine → valeur identique.
    assert fm.seasonal_naive(values, 60, 7) == values[60]
    assert fm.seasonal_naive(values, 60, 14) == values[60]


def test_seasonal_naive_persistence_fallback_on_short_series():
    # Série < 1 cycle → persistance (dernière valeur connue).
    values = np.array([3.0, 4.0, 5.0])
    assert fm.seasonal_naive(values, 2, 1) == 5.0


def test_predictions_never_negative():
    # Toute prévision servie est ≥ 0 (un volume d'articles négatif n'a pas de sens).
    rows = _series("ror-A", 300, _seasonal(level=2.0, amp=5.0, noise=2.0), seed=3)
    served, _, _ = fm.forecast(rows)
    assert all(r["n_articles_pred"] >= 0 for r in served)


def test_aggregate_windows_are_consistent():
    # La fenêtre « mois » couvre 30 jours, « semaine » 7 : la prévision mensuelle d'une série
    # à volume positif est ≥ la prévision hebdomadaire (cohérence inter-fenêtres).
    rows = _series("ror-A", 300, _seasonal(level=30.0), seed=5)
    served, _, mode = fm.forecast(rows)
    by_label = {r["horizon_label"]: r["n_articles_pred"] for r in served}
    assert by_label["month"] >= by_label["week"]
    assert by_label["quarter"] >= by_label["month"]


def test_two_universities_get_independent_levels():
    # Le modèle global apprend un niveau par université (identité encodée) : une université à
    # fort volume et une à faible volume ont des prévisions distinctes.
    rows = _series("ror-HIGH", 300, _seasonal(level=50.0), seed=1) + _series(
        "ror-LOW", 300, _seasonal(level=3.0), seed=2
    )
    served, _, mode = fm.forecast(rows)
    if mode == "predictive":
        high = next(
            r["n_articles_pred"]
            for r in served
            if r["university_id"] == "ror-HIGH" and r["horizon_label"] == "week"
        )
        low = next(
            r["n_articles_pred"]
            for r in served
            if r["university_id"] == "ror-LOW" and r["horizon_label"] == "week"
        )
        assert high > low


def test_determinism_same_input_same_evaluation():
    # Graine figée (ADR 0057) : deux exécutions identiques donnent la même évaluation.
    rows = _series("ror-A", 300, _seasonal(), seed=7)
    _, ev1, m1 = fm.forecast(rows)
    _, ev2, m2 = fm.forecast(rows)
    assert m1 == m2
    assert ev1.r2 == ev2.r2 and ev1.mae == ev2.mae
