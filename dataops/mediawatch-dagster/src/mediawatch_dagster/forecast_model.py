"""Modèle de PRÉVISION du volume d'articles par université (ADR 0081).

Cœur ML PUR : numpy + scikit-learn, **zéro I/O, zéro Dagster** — testable sans S3 ni
réseau (DataFrames/lignes en mémoire). L'asset Dagster (``assets/forecast.py``) délègue
ici toute la décision ; lui seul lit/écrit S3 et logge MLflow.

Patron calqué sur ``citation_dagster.uplift_model`` (module pur + ``Evaluation`` à porte
de décision ``has_predictive_power``), adapté à une PRÉVISION DE SÉRIE TEMPORELLE :

- **modèle GLOBAL unique** (un seul pour toutes les universités, identité encodée en
  feature catégorielle ``univ_code``) — scalable à des milliers de séries ;
- **multi-horizon direct** : l'horizon ``h`` (jours) est une feature ; les fenêtres
  métier (semaine/mois/trimestre) s'obtiennent par AGRÉGATION aval des prévisions
  journalières (cohérence interne, un seul modèle) ;
- **validation HONNÊTE temporelle** (``TimeSeriesSplit`` sur les dates d'origine) — jamais
  de découpage aléatoire (le temps ne se mélange pas : tester le passé avec un modèle qui a
  vu le futur = fuite) ;
- **baseline** = saisonnier naïf hebdomadaire (S=7), repli persistance — la baseline
  exigeante d'une série à creux week-end. La porte ne sert le modèle que s'il la BAT.

Déterminisme figé (``RANDOM_STATE``, ADR 0057). Prévision jamais négative (clip ≥ 0).
"""

from __future__ import annotations

import datetime as dt
import math
from dataclasses import dataclass

import numpy as np

RANDOM_STATE = 42

# Horizons métier (jours) servis après agrégation. Le modèle prédit chaque jour de 1 à 92,
# puis on somme sur ces fenêtres glissantes à partir de la dernière date connue.
WINDOWS = {"week": 7, "month": 30, "quarter": 92}
MAX_HORIZON = max(WINDOWS.values())

# Lags et fenêtres mobiles (en jours) — TOUS strictement passés (≤ date d'origine t).
_LAGS = (1, 7, 14, 28)
_ROLL = (7, 28)
# Historique minimal (jours) pour qu'une date d'origine produise des features fiables.
MIN_HISTORY = max(max(_LAGS), max(_ROLL))

# Ordre FIGÉ des features (reproductibilité + introspection). univ_code en DERNIER →
# son index sert de `categorical_features` au gradient boosting.
FEATURE_NAMES: list[str] = [
    "horizon_days",
    "dow_sin",
    "dow_cos",
    "month_sin",
    "month_cos",
    "isoweek_sin",
    "isoweek_cos",
    "is_weekend",
    *[f"lag_{k}" for k in _LAGS],
    *[f"roll_mean_{w}" for w in _ROLL],
    "roll_std_7",
    "trend_7",
    "univ_code",
]
IDX_UNIV_CODE = FEATURE_NAMES.index("univ_code")


@dataclass(frozen=True)
class Evaluation:
    """Métriques de la validation honnête (temporelle). ``has_predictive_power`` est la
    PORTE DE DÉCISION (parité ADR 0067) : le modèle n'est servi en mode prédictif que s'il
    a un R² nettement positif ET bat la baseline saisonnière."""

    r2: float
    mae: float
    baseline_mae: float
    n_obs: int
    n_splits: int

    @property
    def beats_baseline(self) -> bool:
        return self.mae < self.baseline_mae

    @property
    def has_predictive_power(self) -> bool:
        return self.r2 > 0.05 and self.beats_baseline


@dataclass(frozen=True)
class ForecastDataset:
    """Jeu d'entraînement assemblé (PUR). ``origin`` (date d'origine t de chaque ligne)
    sert au découpage TEMPOREL ; ``univ_code`` est l'identité encodée (feature)."""

    X: np.ndarray  # (n, len(FEATURE_NAMES))
    y: np.ndarray  # (n,) volume observé à t+h
    origin: np.ndarray  # (n,) date d'origine t (np.datetime64[D])


# ── Encodage déterministe de l'identité université ───────────────────────────


def encode_univ_codes(university_ids: list[str]) -> dict[str, int]:
    """Code entier STABLE par university_id (tri lexical → déterministe, ADR 0057).
    Le gradient boosting le traite en catégoriel ; pas de one-hot (non-scalable)."""
    return {uid: i for i, uid in enumerate(sorted(set(university_ids)))}


# ── Construction de série journalière complète (reindex à 0) ─────────────────


def _dense_series(dates: list[dt.date], counts: list[int]) -> tuple[list[dt.date], np.ndarray]:
    """Reindex la série sur un CALENDRIER JOURNALIER COMPLET entre min et max date,
    en comblant les jours manquants à 0 (un jour sans article = 0 article). INDISPENSABLE
    à l'anti-fuite : sans ça, ``lag_7`` sauterait des trous et lirait une mauvaise date."""
    if not dates:
        return [], np.zeros(0, dtype=np.float64)
    by_date = dict(zip(dates, counts, strict=True))
    start, end = min(dates), max(dates)
    full = [start + dt.timedelta(days=i) for i in range((end - start).days + 1)]
    values = np.array([float(by_date.get(d, 0)) for d in full], dtype=np.float64)
    return full, values


def _calendar_features(target: dt.date) -> list[float]:
    """Features calendaires de la date CIBLE (connues à l'avance → pas de fuite).
    Encodage sin/cos pour la continuité cyclique (lun↔dim, déc↔jan)."""
    dow = target.weekday()  # 0 = lundi
    month = target.month
    isoweek = target.isocalendar().week
    return [
        math.sin(2 * math.pi * dow / 7),
        math.cos(2 * math.pi * dow / 7),
        math.sin(2 * math.pi * month / 12),
        math.cos(2 * math.pi * month / 12),
        math.sin(2 * math.pi * isoweek / 53),
        math.cos(2 * math.pi * isoweek / 53),
        1.0 if dow >= 5 else 0.0,
    ]


def _past_features(values: np.ndarray, t_idx: int) -> list[float] | None:
    """Features dérivées du PASSÉ (indices ≤ t_idx STRICTEMENT). Renvoie None si
    l'historique est trop court. INVARIANT ANTI-FUITE : aucun accès à values[t_idx+1:]."""
    if t_idx < MIN_HISTORY:
        return None
    window = values[: t_idx + 1]  # inclut t, jamais le futur
    lags = [float(values[t_idx - (k - 1)]) for k in _LAGS]
    rolls = [float(window[-w:].mean()) for w in _ROLL]
    roll_std_7 = float(window[-7:].std())
    trend_7 = float(values[t_idx] - values[t_idx - 6])  # robuste sur séries courtes
    return [*lags, *rolls, roll_std_7, trend_7]


def build_features(
    timeline_rows: list[tuple[str, dt.date, int]],
    horizons: list[int] | None = None,
    univ_codes: dict[str, int] | None = None,
) -> ForecastDataset:
    """Assemble (X, y, origin) depuis la timeline ``(university_id, event_date, n_articles)``.

    Par université : série journalière dense (trous = 0), puis pour chaque date d'origine t
    ayant ≥ MIN_HISTORY jours d'historique ET chaque horizon h où t+h existe dans l'observé,
    émet une ligne (features de t pour la cible t+h, valeur observée à t+h). Les features ne
    lisent JAMAIS une date > t (anti-fuite, éprouvé par property test)."""
    horizons = horizons or list(range(1, MAX_HORIZON + 1))
    if univ_codes is None:
        univ_codes = encode_univ_codes([uid for uid, _, _ in timeline_rows])

    by_univ: dict[str, list[tuple[dt.date, int]]] = {}
    for uid, d, n in timeline_rows:
        by_univ.setdefault(uid, []).append((d, int(n)))

    rows_X, rows_y, rows_origin = [], [], []
    for uid, pairs in by_univ.items():
        code = float(univ_codes[uid])
        pairs.sort()
        dates = [d for d, _ in pairs]
        full_dates, values = _dense_series(dates, [n for _, n in pairs])
        n_days = len(values)
        for t_idx in range(MIN_HISTORY, n_days):
            past = _past_features(values, t_idx)
            if past is None:
                continue
            for h in horizons:
                tgt_idx = t_idx + h
                if tgt_idx >= n_days:  # cible hors de l'observé → pas une ligne d'entraînement
                    continue
                cal = _calendar_features(full_dates[tgt_idx])
                rows_X.append([float(h), *cal, *past, code])
                rows_y.append(float(values[tgt_idx]))
                rows_origin.append(np.datetime64(full_dates[t_idx], "D"))

    X = np.array(rows_X, dtype=np.float64) if rows_X else np.zeros((0, len(FEATURE_NAMES)))
    y = np.array(rows_y, dtype=np.float64)
    origin = np.array(rows_origin, dtype="datetime64[D]")
    return ForecastDataset(X=X, y=y, origin=origin)


# ── Baseline : saisonnier naïf hebdomadaire (S=7), repli persistance ─────────


def seasonal_naive(values: np.ndarray, t_idx: int, h: int) -> float:
    """Prévision baseline pour t+h : valeur du même JOUR DE SEMAINE le plus récent connu
    (recule de k×7 jours jusqu'à tomber ≤ t). Repli persistance (dernière valeur) si la
    série est trop courte pour un cycle. Jamais négatif."""
    if t_idx < 0 or t_idx >= len(values):
        return 0.0
    target = t_idx + h
    src = target
    while src > t_idx:
        src -= 7
    if src < 0:
        src = t_idx  # persistance : dernière valeur connue
    return max(0.0, float(values[src]))


def _new_model():
    from sklearn.ensemble import HistGradientBoostingRegressor

    return HistGradientBoostingRegressor(
        random_state=RANDOM_STATE,
        max_depth=3,
        max_iter=200,
        categorical_features=[IDX_UNIV_CODE],
    )


# ── Validation HONNÊTE temporelle (anti-fuite) ───────────────────────────────


def backtest_temporal(ds: ForecastDataset, n_splits: int = 4) -> Evaluation:
    """Validation par découpage TEMPOREL sur les dates d'origine distinctes : chaque pli
    s'entraîne sur le passé et teste sur le futur immédiat (TimeSeriesSplit). JAMAIS de
    KFold aléatoire. Baseline = moyenne du train (repère neutre, comparable au modèle sur
    le test). Lève ValueError si trop peu de dates distinctes → l'asset rabat en descriptif.

    EMBARGO (anti-fuite décisif) : une date d'origine t produit des cibles t+1..t+H qui
    peuvent CHEVAUCHER les cibles du test (une même date calendaire cible apparaîtrait des
    deux côtés → le modèle apprendrait son niveau = fuite). On purge donc du train toute
    ligne dont la **date cible** (origine + horizon) est ≥ la plus PRÉCOCE des cibles du
    test. Sans cet embargo, le modèle « bat » la baseline même sur du bruit i.i.d. (faux
    pouvoir prédictif) ; avec, la porte ne se déclenche que sur un vrai signal."""
    from sklearn.model_selection import TimeSeriesSplit

    if ds.X.shape[0] == 0:
        raise ValueError("dataset vide : aucune ligne d'entraînement")
    order = np.argsort(ds.origin, kind="stable")
    unique_dates = np.unique(ds.origin)
    if len(unique_dates) < n_splits + 1:
        raise ValueError(f"trop peu de dates distinctes ({len(unique_dates)}) pour {n_splits} plis")

    date_index = {d: i for i, d in enumerate(unique_dates)}
    row_date_pos = np.array([date_index[d] for d in ds.origin])
    # Date CIBLE de chaque ligne = origine + horizon_days (colonne 0 des features).
    target_date = ds.origin + ds.X[:, 0].astype("int64").astype("timedelta64[D]")

    r2s, maes, base_maes = [], [], []
    splitter = TimeSeriesSplit(n_splits=n_splits)
    for tr_dates, te_dates in splitter.split(unique_dates):
        tr_set, te_set = set(tr_dates.tolist()), set(te_dates.tolist())
        tr = order[np.isin(row_date_pos[order], list(tr_set))]
        te = order[np.isin(row_date_pos[order], list(te_set))]
        if len(tr) == 0 or len(te) == 0:
            continue
        # Embargo : le train ne voit aucune cible ≥ la plus précoce cible du test.
        tr = tr[target_date[tr] < target_date[te].min()]
        if len(tr) == 0:
            continue
        model = _new_model()
        model.fit(ds.X[tr], ds.y[tr])
        pred = np.clip(model.predict(ds.X[te]), 0.0, None)
        baseline = float(ds.y[tr].mean())
        maes.append(float(np.mean(np.abs(pred - ds.y[te]))))
        base_maes.append(float(np.mean(np.abs(baseline - ds.y[te]))))
        ss_res = float(np.sum((ds.y[te] - pred) ** 2))
        ss_tot = float(np.sum((ds.y[te] - ds.y[te].mean()) ** 2))
        r2s.append(1.0 - ss_res / ss_tot if ss_tot > 0 else 0.0)

    if not r2s:
        raise ValueError("aucun pli exploitable (train/test vides)")
    return Evaluation(
        r2=float(np.mean(r2s)),
        mae=float(np.mean(maes)),
        baseline_mae=float(np.mean(base_maes)),
        n_obs=int(ds.X.shape[0]),
        n_splits=len(r2s),
    )


def train_final(ds: ForecastDataset):
    """Entraîne le modèle final sur TOUT le dataset (pour servir des prévisions)."""
    if ds.X.shape[0] == 0:
        raise ValueError("dataset vide : rien à entraîner")
    model = _new_model()
    model.fit(ds.X, ds.y)
    return model


# ── Prévision + agrégation en fenêtres métier ────────────────────────────────


def _predict_daily(model, timeline_rows, univ_codes: dict[str, int]) -> dict[str, dict[int, float]]:
    """Pour chaque université, prédit le volume journalier à h ∈ [1..MAX_HORIZON] depuis sa
    DERNIÈRE date connue (origine = dernière observation). Clip ≥ 0. Renvoie {uid: {h: ŷ}}."""
    by_univ: dict[str, list[tuple[dt.date, int]]] = {}
    for uid, d, n in timeline_rows:
        by_univ.setdefault(uid, []).append((d, int(n)))

    out: dict[str, dict[int, float]] = {}
    for uid, pairs in by_univ.items():
        if uid not in univ_codes:
            continue
        pairs.sort()
        full_dates, values = _dense_series([d for d, _ in pairs], [n for _, n in pairs])
        t_idx = len(values) - 1
        past = _past_features(values, t_idx)
        if past is None:  # historique insuffisant → pas de prévision modèle pour cette univ
            continue
        code = float(univ_codes[uid])
        last_date = full_dates[t_idx]
        preds: dict[int, float] = {}
        for h in range(1, MAX_HORIZON + 1):
            cal = _calendar_features(last_date + dt.timedelta(days=h))
            x = np.array([[float(h), *cal, *past, code]], dtype=np.float64)
            preds[h] = max(0.0, float(model.predict(x)[0]))
        out[uid] = preds
    return out


def _baseline_daily(timeline_rows) -> dict[str, dict[int, float]]:
    """Prévisions journalières par la BASELINE (saisonnier naïf) — mode descriptif."""
    by_univ: dict[str, list[tuple[dt.date, int]]] = {}
    for uid, d, n in timeline_rows:
        by_univ.setdefault(uid, []).append((d, int(n)))
    out: dict[str, dict[int, float]] = {}
    for uid, pairs in by_univ.items():
        pairs.sort()
        _, values = _dense_series([d for d, _ in pairs], [n for _, n in pairs])
        t_idx = len(values) - 1
        if t_idx < 0:
            continue
        out[uid] = {h: seasonal_naive(values, t_idx, h) for h in range(1, MAX_HORIZON + 1)}
    return out


def aggregate_windows(
    daily: dict[str, dict[int, float]], timeline_rows, served_mode: str
) -> list[dict]:
    """Agrège les prévisions journalières en fenêtres métier (semaine/mois/trimestre) :
    somme des h premiers jours. La fenêtre démarre au lendemain de la dernière date connue.
    Cohérence interne garantie (mois ⊇ semaines qui le composent)."""
    last_date_by_univ: dict[str, dt.date] = {}
    name_by_univ: dict[str, str] = {}
    for uid, d, _ in timeline_rows:
        if uid not in last_date_by_univ or d > last_date_by_univ[uid]:
            last_date_by_univ[uid] = d
    # university_name n'est pas dans les lignes (uid, date, n) → renseigné par l'appelant si besoin.
    rows: list[dict] = []
    for uid, preds in daily.items():
        last = last_date_by_univ.get(uid)
        if last is None:
            continue
        for label, span in WINDOWS.items():
            total = float(sum(preds.get(h, 0.0) for h in range(1, span + 1)))
            rows.append(
                {
                    "university_id": uid,
                    "university_name": name_by_univ.get(uid, ""),
                    "horizon_label": label,
                    "window_start": last + dt.timedelta(days=1),
                    "window_end": last + dt.timedelta(days=span),
                    "n_articles_pred": max(0.0, total),
                    "served_mode": served_mode,
                }
            )
    return rows


def forecast(
    timeline_rows: list[tuple[str, dt.date, int]], n_splits: int = 4
) -> tuple[list[dict], Evaluation | None, str]:
    """Bout-en-bout PUR : construit le dataset, valide honnêtement, applique la porte de
    décision, entraîne+prédit (prédictif) ou rabat sur la baseline (descriptif), agrège en
    fenêtres. Renvoie (lignes servies, évaluation|None, served_mode). Aucune I/O."""
    univ_codes = encode_univ_codes([uid for uid, _, _ in timeline_rows])
    ds = build_features(timeline_rows, univ_codes=univ_codes)
    evaluation: Evaluation | None = None
    served_mode = "descriptive"
    try:
        evaluation = backtest_temporal(ds, n_splits=n_splits)
        if evaluation.has_predictive_power:
            served_mode = "predictive"
    except ValueError:
        served_mode = "descriptive"

    if served_mode == "predictive":
        model = train_final(ds)
        daily = _predict_daily(model, timeline_rows, univ_codes)
    else:
        daily = _baseline_daily(timeline_rows)
    rows = aggregate_windows(daily, timeline_rows, served_mode)
    return rows, evaluation, served_mode
