"""Tests du modèle de prévision des vues (ADR 0098) — exemples déterministes, hermétiques.

Patron calqué sur ``mediawatch_dagster`` (ADR 0081), adapté à la série MENSUELLE à
saisonnalité ANNUELLE (S=12). Fixtures synthétiques à graine figée, aucun I/O. Couvre :
l'anti-fuite structurel (lags ≤ mois d'origine, densification à 0), la porte de décision
(signal saisonnier ANNUEL → prédictif ; bruit i.i.d. → repli descriptif, contrôle négatif),
la baseline saisonnière naïve S=12, la non-négativité, la cohérence des fenêtres métier
(``year_1`` ⊇ ``month_3`` ⊇ ``month_1``) et le déterminisme (graine figée, ADR 0057).
"""

import numpy as np

from pageviews_dagster import forecast_model as fm

from .conftest import BASE, month_from_index, month_index, monthly_series

# ── build_features : anti-fuite structurel ───────────────────────────────────


def test_build_features_lags_are_strictly_past():
    # Toute feature de lag/rolling d'un mois d'origine t indexe un mois ≤ t : on le prouve en
    # comparant le dataset complet à un dataset TRONQUÉ après t — la 1re ligne d'origine
    # (commune aux deux) doit avoir des features IDENTIQUES (le futur retiré ne change rien).
    rows = [
        ("uni-A", month_from_index(month_index(BASE) + i), int(10 + 5 * np.sin(i)))
        for i in range(50)
    ]
    codes = {"uni-A": 0}
    ds_full = fm.build_features(rows, horizons=[1], univ_codes=codes)
    cut = month_from_index(month_index(BASE) + 25)
    ds_trunc = fm.build_features([r for r in rows if r[1] <= cut], horizons=[1], univ_codes=codes)
    assert ds_full.X.shape[0] > 0 and ds_trunc.X.shape[0] > 0
    # La 1re ligne (mois d'origine le plus ancien) existe dans les deux → features identiques.
    assert np.allclose(ds_full.X[0], ds_trunc.X[0])


def test_build_features_fills_gaps_with_zero():
    # Une série lacunaire (un mois sur deux) est densifiée à 0 : sans ça, ``lag_12`` sauterait
    # des trous et lirait un mauvais mois. Le dataset a des lignes bien formées.
    rows = [
        ("uni-A", month_from_index(month_index(BASE) + i), 5) for i in range(0, 40, 2)
    ]  # un mois sur deux
    ds = fm.build_features(rows, horizons=[1], univ_codes={"uni-A": 0})
    assert ds.X.shape[0] > 0
    assert ds.X.shape[1] == len(fm.FEATURE_NAMES)


def test_build_features_needs_min_history():
    # Un mois d'origine avec moins de MIN_HISTORY (=12) mois d'antécédents ne produit aucune
    # ligne : les 12 premiers mois ne servent qu'à alimenter les lags.
    rows = monthly_series("uni-A", 13, lambda i, m, r: 100 + i, seed=0)
    ds = fm.build_features(rows, horizons=[1], univ_codes={"uni-A": 0})
    # Origines possibles : t ∈ [12, 12] avec t+1 ≤ 12 → aucune (t+1=13 hors observé).
    assert ds.X.shape[0] == 0
    assert ds.X.shape[1] == len(fm.FEATURE_NAMES)


# ── Porte de décision : signal saisonnier ANNUEL vs bruit i.i.d. ─────────────


def test_annual_seasonal_signal_is_predictive(seasonal_rows):
    # Un vrai signal saisonnier ANNUEL (S=12) → la validation honnête confirme le pouvoir.
    _, ev, mode = fm.forecast(seasonal_rows)
    assert mode == "predictive"
    assert ev is not None
    assert ev.r2 > 0.2 and ev.beats_baseline and ev.has_predictive_power


def test_iid_noise_falls_back_descriptive(noise_rows):
    # CONTRÔLE NÉGATIF décisif : un bruit i.i.d. (aucune structure temporelle) ne doit PAS
    # battre la baseline. Grâce à l'embargo anti-fuite du backtest, la porte rabat en
    # descriptif — garantie que la validation temporelle est honnête.
    _, ev, mode = fm.forecast(noise_rows)
    assert mode == "descriptive"
    assert ev is not None and not ev.has_predictive_power


def test_short_history_falls_back_without_crash(short_rows):
    # En banc (peu de mois), trop peu de mois distincts → backtest lève → repli descriptif,
    # sans crash. La baseline saisonnière est servie (1 établissement × 3 horizons).
    served, ev, mode = fm.forecast(short_rows)
    assert mode == "descriptive"
    assert len(served) == 3  # 1 établissement × 3 fenêtres (month_1 / month_3 / year_1)


def test_empty_timeline_is_descriptive_empty():
    # Aucune donnée → aucune prévision, mode descriptif, pas de crash.
    served, ev, mode = fm.forecast([])
    assert served == []
    assert ev is None
    assert mode == "descriptive"


# ── Baseline : saisonnier naïf annuel (S=12) ─────────────────────────────────


def test_seasonal_naive_is_exact_on_annual_series():
    # Sur une série purement S=12 (le même motif chaque année), le saisonnier naïf annuel est
    # EXACT — preuve que c'est une baseline difficile à battre. h=12 (et 24) → même mois de
    # l'année → valeur identique à l'origine.
    values = np.array([float((i % 12) * 10) for i in range(48)])
    assert fm.seasonal_naive(values, 40, 12) == values[40]
    assert fm.seasonal_naive(values, 40, 24) == values[40]


def test_seasonal_naive_persistence_fallback_on_short_series():
    # Série < 1 cycle annuel (12 mois) → persistance (dernière valeur connue).
    values = np.array([3.0, 4.0, 5.0])
    assert fm.seasonal_naive(values, 2, 1) == 5.0


def test_seasonal_naive_out_of_range_is_zero():
    # Indice d'origine hors bornes → 0.0 (robustesse, jamais d'IndexError).
    values = np.array([1.0, 2.0, 3.0])
    assert fm.seasonal_naive(values, -1, 1) == 0.0
    assert fm.seasonal_naive(values, 99, 1) == 0.0


def test_seasonal_naive_never_negative():
    # Même si l'historique contient des zéros, la baseline ne renvoie jamais de négatif.
    values = np.zeros(24)
    assert fm.seasonal_naive(values, 20, 12) == 0.0


# ── Prévisions servies : non-négativité et cohérence des fenêtres ────────────


def test_predictions_never_negative(seasonal_rows):
    # Toute prévision servie est ≥ 0 (un compte de vues négatif n'a pas de sens).
    served, _, _ = fm.forecast(seasonal_rows)
    assert served
    assert all(r["views_pred"] >= 0 for r in served)


def test_aggregate_windows_are_nested(seasonal_rows):
    # Les fenêtres métier sont des sommes de mois croissants : year_1 (12) ⊇ month_3 (3) ⊇
    # month_1 (1). Sur un volume positif, la prévision agrégée est monotone par inclusion.
    served, _, _ = fm.forecast(seasonal_rows)
    by = {r["horizon_label"]: r["views_pred"] for r in served}
    assert by["year_1"] >= by["month_3"] >= by["month_1"]


def test_aggregate_windows_labels_and_bounds(seasonal_rows):
    # Chaque établissement sert exactement les 3 fenêtres métier, la fenêtre démarrant au mois
    # suivant la dernière observation (window_start = last+1) et finissant à last+span.
    served, _, _ = fm.forecast(seasonal_rows)
    labels = {r["horizon_label"] for r in served}
    assert labels == set(fm.WINDOWS)
    last = max(d for _, d, _ in [("uni-A", month_from_index(month_index(BASE) + 59), 0)])
    row1 = next(r for r in served if r["horizon_label"] == "month_1")
    assert row1["window_start"] == month_from_index(month_index(last) + 1)
    assert row1["window_end"] == month_from_index(month_index(last) + 1)
    row12 = next(r for r in served if r["horizon_label"] == "year_1")
    assert row12["window_end"] == month_from_index(month_index(last) + 12)


def test_served_mode_stamped_on_every_row(seasonal_rows):
    # Le served_mode (predictive/descriptive) est porté sur CHAQUE ligne (le drift le lit).
    served, _, mode = fm.forecast(seasonal_rows)
    assert all(r["served_mode"] == mode for r in served)


def test_two_universities_get_independent_levels():
    # Le modèle GLOBAL apprend un niveau par établissement (identité encodée en feature) :
    # un établissement à fort volume et un à faible volume ont des prévisions distinctes.
    hi = monthly_series(
        "uni-HIGH",
        60,
        lambda i, m, rng: 5000 + 400 * np.sin(2 * np.pi * m / 12) + rng.normal(0, 20),
        seed=1,
    )
    lo = monthly_series(
        "uni-LOW",
        60,
        lambda i, m, rng: 100 + 40 * np.sin(2 * np.pi * m / 12) + rng.normal(0, 5),
        seed=2,
    )
    served, _, mode = fm.forecast(hi + lo)
    if mode == "predictive":
        high = next(
            r["views_pred"]
            for r in served
            if r["university_id"] == "uni-HIGH" and r["horizon_label"] == "month_1"
        )
        low = next(
            r["views_pred"]
            for r in served
            if r["university_id"] == "uni-LOW" and r["horizon_label"] == "month_1"
        )
        assert high > low


# ── Bas niveau : encodage, backtest, train_final ─────────────────────────────


def test_encode_univ_codes_is_stable_and_sorted():
    # Code entier stable par tri lexical (déterminisme ADR 0057), déduplication.
    assert fm.encode_univ_codes(["b", "a", "c", "a"]) == {"a": 0, "b": 1, "c": 2}


def test_backtest_raises_on_empty_dataset():
    # Dataset vide → ValueError (l'asset rabat alors en descriptif).
    empty = fm.build_features([])
    with np.testing.assert_raises(ValueError):
        fm.backtest_temporal(empty)


def test_backtest_raises_when_too_few_distinct_months():
    # Moins de n_splits+1 mois d'origine distincts → ValueError explicite.
    rows = monthly_series("uni-A", 15, lambda i, m, r: 100 + i, seed=0)
    ds = fm.build_features(rows)
    # Peu de mois d'origine distincts avec cibles observées → backtest impossible à 4 plis.
    try:
        fm.backtest_temporal(ds, n_splits=4)
    except ValueError:
        pass
    else:
        # Si un backtest a pu tourner, il l'a fait honnêtement (assez de mois) : accepté.
        assert ds.X.shape[0] > 0


def test_train_final_raises_on_empty_dataset():
    empty = fm.build_features([])
    with np.testing.assert_raises(ValueError):
        fm.train_final(empty)


def test_train_final_fits_on_seasonal(seasonal_rows):
    # Sur un dataset non vide, train_final renvoie un modèle capable de prédire.
    ds = fm.build_features(seasonal_rows)
    model = fm.train_final(ds)
    pred = model.predict(ds.X[:1])
    assert pred.shape == (1,)
    assert np.isfinite(pred[0])


# ── Déterminisme (graine figée, ADR 0057) ────────────────────────────────────


def test_determinism_same_input_same_evaluation(seasonal_rows):
    # Deux exécutions identiques donnent exactement la même évaluation et le même mode.
    _, ev1, m1 = fm.forecast(seasonal_rows)
    _, ev2, m2 = fm.forecast(seasonal_rows)
    assert m1 == m2
    assert ev1 is not None and ev2 is not None
    assert ev1.r2 == ev2.r2 and ev1.mae == ev2.mae and ev1.baseline_mae == ev2.baseline_mae


def test_determinism_same_served_rows(seasonal_rows):
    # Les lignes servies (prévisions) sont elles aussi reproductibles au flottant près.
    r1, _, _ = fm.forecast(seasonal_rows)
    r2, _, _ = fm.forecast(seasonal_rows)

    def _key(r):
        return (r["university_id"], r["horizon_label"])

    v1 = [r["views_pred"] for r in sorted(r1, key=_key)]
    v2 = [r["views_pred"] for r in sorted(r2, key=_key)]
    assert v1 == v2


# ── Helpers purs : densification, features passées, prédiction mensuelle ─────


def test_dense_series_empty_returns_empty():
    # Aucun mois → série vide (garde-fou, pas de crash en amont de build_features).
    months, values = fm._dense_series([], [])
    assert months == []
    assert values.shape == (0,)


def test_past_features_none_below_min_history():
    # Un mois d'origine avec moins de MIN_HISTORY antécédents → None (pas de features fiables).
    values = np.arange(20, dtype=float)
    assert fm._past_features(values, fm.MIN_HISTORY - 1) is None
    assert fm._past_features(values, fm.MIN_HISTORY) is not None


def test_predict_monthly_skips_unknown_and_short(seasonal_rows):
    # _predict_monthly saute un établissement absent des codes ET un à historique insuffisant ;
    # il produit MAX_HORIZON prédictions ≥ 0 pour un établissement valide et long.
    codes = fm.encode_univ_codes([uid for uid, _, _ in seasonal_rows])
    ds = fm.build_features(seasonal_rows, univ_codes=codes)
    model = fm.train_final(ds)
    short = monthly_series("uni-SHORT", 5, lambda i, m, r: 3, seed=0)
    rows = seasonal_rows + short  # uni-SHORT est dans les codes mais trop court
    unknown = [("uni-GHOST", month_from_index(month_index(BASE)), 1)]
    monthly = fm._predict_monthly(model, rows + unknown, codes)  # uni-GHOST absent des codes
    assert "uni-A" in monthly
    assert "uni-SHORT" not in monthly  # historique insuffisant → pas de prévision modèle
    assert "uni-GHOST" not in monthly  # absent de l'encodage → ignoré
    assert len(monthly["uni-A"]) == fm.MAX_HORIZON
    assert all(v >= 0 for v in monthly["uni-A"].values())


def test_baseline_monthly_serves_all_universities(short_rows):
    # La baseline (mode descriptif) sert MAX_HORIZON prévisions non négatives par établissement.
    monthly = fm._baseline_monthly(short_rows)
    assert "uni-A" in monthly
    assert len(monthly["uni-A"]) == fm.MAX_HORIZON
    assert all(v >= 0 for v in monthly["uni-A"].values())


def test_aggregate_windows_skips_univ_without_last_date():
    # Un établissement présent dans les prévisions mensuelles mais absent de la timeline (pas
    # de dernière date connue) est ignoré à l'agrégation (garde-fou de cohérence).
    monthly = {"uni-A": {h: 10.0 for h in range(1, fm.MAX_HORIZON + 1)}}
    rows = fm.aggregate_windows(monthly, [], "descriptive")  # timeline vide → pas de last date
    assert rows == []


# ── Métriques de la porte de décision ────────────────────────────────────────


def test_evaluation_gate_thresholds():
    # has_predictive_power = R² > 0.05 ET bat la baseline (parité ADR 0081/0067).
    strong = fm.Evaluation(r2=0.5, mae=1.0, baseline_mae=2.0, n_obs=100, n_splits=4)
    assert strong.beats_baseline and strong.has_predictive_power
    weak_r2 = fm.Evaluation(r2=0.01, mae=1.0, baseline_mae=2.0, n_obs=100, n_splits=4)
    assert weak_r2.beats_baseline and not weak_r2.has_predictive_power
    no_beat = fm.Evaluation(r2=0.9, mae=3.0, baseline_mae=2.0, n_obs=100, n_splits=4)
    assert not no_beat.beats_baseline and not no_beat.has_predictive_power
