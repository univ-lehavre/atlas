"""Modèle de PRÉVISION des vues Wikipédia par établissement (ADR 0097).

Cœur ML PUR : numpy + scikit-learn, **zéro I/O, zéro Dagster** — testable sans S3 ni
réseau (lignes en mémoire). L'asset Dagster (``assets/forecast.py``) délègue ici toute la
décision ; lui seul lit/écrit S3 et logge MLflow.

Patron calqué sur ``mediawatch_dagster.forecast_model`` (ADR 0081), adapté à la série
**MENSUELLE** des vues Wikipédia (``pageview_complete`` est mensuel) et à sa saisonnalité
**ANNUELLE** (cycle universitaire : rentrée, examens, creux estival) — là où mediawatch est
journalier à saisonnalité hebdomadaire :

- **modèle GLOBAL unique** (un seul pour tous les établissements, identité encodée en feature
  catégorielle ``univ_code``) — scalable aux ~10⁴ établissements couverts ([ADR 0095]) ;
- **multi-horizon direct** : l'horizon ``h`` (mois) est une feature ; les horizons métier
  (1 mois, 3 mois, 12 mois — les équivalents mensuels propres de « 1 semaine / 1 mois /
  1 an ») s'obtiennent par AGRÉGATION aval des prévisions mensuelles ;
- **validation HONNÊTE temporelle** (``TimeSeriesSplit`` sur les mois d'origine + EMBARGO sur
  la date cible) — jamais de découpage aléatoire (fuite temporelle) ;
- **baseline** = saisonnier naïf annuel (S=12 mois), repli persistance.

Déterminisme figé (``RANDOM_STATE``, ADR 0057). Prévision jamais négative (clip ≥ 0).

Note d'échelle horizon : « 1 semaine » n'a pas de sens sur une série mensuelle → l'horizon
court servi est **1 mois** ; les trois horizons métier sont 1 / 3 / 12 mois. Le choix est
tracé dans l'ADR 0097 (§ granularité).
"""

from __future__ import annotations

import datetime as dt
import math
from dataclasses import dataclass

import numpy as np

RANDOM_STATE = 42

# Horizons métier (MOIS) servis après agrégation. Le modèle prédit chaque mois de 1 à 12,
# puis on somme sur ces fenêtres glissantes à partir de la dernière date connue.
WINDOWS = {"month_1": 1, "month_3": 3, "year_1": 12}
MAX_HORIZON = max(WINDOWS.values())

# Lags et fenêtres mobiles (en MOIS) — TOUS strictement passés (≤ mois d'origine t).
# 12 = même mois l'an dernier (capte la saisonnalité annuelle).
_LAGS = (1, 2, 3, 12)
_ROLL = (3, 12)
# Historique minimal (mois) pour qu'un mois d'origine produise des features fiables.
MIN_HISTORY = max(max(_LAGS), max(_ROLL))

# Ordre FIGÉ des features (reproductibilité + introspection). univ_code en DERNIER →
# son index sert de `categorical_features` au gradient boosting.
FEATURE_NAMES: list[str] = [
    "horizon_months",
    "month_sin",
    "month_cos",
    *[f"lag_{k}" for k in _LAGS],
    *[f"roll_mean_{w}" for w in _ROLL],
    "roll_std_3",
    "trend_3",
    "univ_code",
]
IDX_UNIV_CODE = FEATURE_NAMES.index("univ_code")


@dataclass(frozen=True)
class Evaluation:
    """Métriques de la validation honnête (temporelle). ``has_predictive_power`` est la
    PORTE DE DÉCISION (parité ADR 0081/0067) : le modèle n'est servi en mode prédictif que
    s'il a un R² nettement positif ET bat la baseline saisonnière."""

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
    """Jeu d'entraînement assemblé (PUR). ``origin`` (mois d'origine t de chaque ligne) sert
    au découpage TEMPOREL ; ``univ_code`` est l'identité encodée (feature)."""

    X: np.ndarray  # (n, len(FEATURE_NAMES))
    y: np.ndarray  # (n,) vues observées à t+h
    origin: np.ndarray  # (n,) mois d'origine t (np.datetime64[M])


# ── Encodage déterministe de l'identité établissement ────────────────────────


def encode_univ_codes(university_ids: list[str]) -> dict[str, int]:
    """Code entier STABLE par university_id (tri lexical → déterministe, ADR 0057).
    Le gradient boosting le traite en catégoriel ; pas de one-hot (non-scalable)."""
    return {uid: i for i, uid in enumerate(sorted(set(university_ids)))}


# ── Construction de série mensuelle complète (reindex à 0) ───────────────────


def _month_index(d: dt.date) -> int:
    """Indice mensuel absolu (année*12 + mois-1) pour reindexer sans trou."""
    return d.year * 12 + (d.month - 1)


def _month_from_index(idx: int) -> dt.date:
    """Date (1er du mois) depuis l'indice mensuel absolu."""
    return dt.date(idx // 12, idx % 12 + 1, 1)


def _dense_series(months: list[dt.date], counts: list[int]) -> tuple[list[dt.date], np.ndarray]:
    """Reindex la série sur un CALENDRIER MENSUEL COMPLET entre min et max mois, en comblant
    les mois manquants à 0. INDISPENSABLE à l'anti-fuite : sans ça, ``lag_12`` sauterait des
    trous et lirait un mauvais mois."""
    if not months:
        return [], np.zeros(0, dtype=np.float64)
    by_month = {_month_index(d): c for d, c in zip(months, counts, strict=True)}
    start, end = _month_index(min(months)), _month_index(max(months))
    full = [_month_from_index(i) for i in range(start, end + 1)]
    values = np.array([float(by_month.get(_month_index(d), 0)) for d in full], dtype=np.float64)
    return full, values


def _calendar_features(target: dt.date) -> list[float]:
    """Features calendaires du mois CIBLE (connues à l'avance → pas de fuite). Encodage
    sin/cos pour la continuité cyclique annuelle (déc↔jan)."""
    month = target.month
    return [
        math.sin(2 * math.pi * month / 12),
        math.cos(2 * math.pi * month / 12),
    ]


def _past_features(values: np.ndarray, t_idx: int) -> list[float] | None:
    """Features dérivées du PASSÉ (indices ≤ t_idx STRICTEMENT). Renvoie None si l'historique
    est trop court. INVARIANT ANTI-FUITE : aucun accès à values[t_idx+1:]."""
    if t_idx < MIN_HISTORY:
        return None
    window = values[: t_idx + 1]  # inclut t, jamais le futur
    lags = [float(values[t_idx - (k - 1)]) for k in _LAGS]
    rolls = [float(window[-w:].mean()) for w in _ROLL]
    roll_std_3 = float(window[-3:].std())
    trend_3 = float(values[t_idx] - values[t_idx - 2])  # robuste sur séries courtes
    return [*lags, *rolls, roll_std_3, trend_3]


def build_features(
    timeline_rows: list[tuple[str, dt.date, int]],
    horizons: list[int] | None = None,
    univ_codes: dict[str, int] | None = None,
) -> ForecastDataset:
    """Assemble (X, y, origin) depuis la timeline ``(university_id, month, views)``.

    Par établissement : série mensuelle dense (trous = 0), puis pour chaque mois d'origine t
    ayant ≥ MIN_HISTORY mois d'historique ET chaque horizon h où t+h existe dans l'observé,
    émet une ligne (features de t pour la cible t+h, valeur observée à t+h). Les features ne
    lisent JAMAIS un mois > t (anti-fuite, éprouvé par property test)."""
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
        full_months, values = _dense_series([d for d, _ in pairs], [n for _, n in pairs])
        n_months = len(values)
        for t_idx in range(MIN_HISTORY, n_months):
            past = _past_features(values, t_idx)
            if past is None:
                continue
            for h in horizons:
                tgt_idx = t_idx + h
                if tgt_idx >= n_months:  # cible hors de l'observé → pas une ligne d'entraînement
                    continue
                cal = _calendar_features(full_months[tgt_idx])
                rows_X.append([float(h), *cal, *past, code])
                rows_y.append(float(values[tgt_idx]))
                rows_origin.append(np.datetime64(full_months[t_idx], "M"))

    X = np.array(rows_X, dtype=np.float64) if rows_X else np.zeros((0, len(FEATURE_NAMES)))
    y = np.array(rows_y, dtype=np.float64)
    origin = np.array(rows_origin, dtype="datetime64[M]")
    return ForecastDataset(X=X, y=y, origin=origin)


# ── Baseline : saisonnier naïf annuel (S=12), repli persistance ──────────────


def seasonal_naive(values: np.ndarray, t_idx: int, h: int) -> float:
    """Prévision baseline pour t+h : valeur du même MOIS DE L'ANNÉE le plus récent connu
    (recule de k×12 mois jusqu'à tomber ≤ t). Repli persistance (dernière valeur) si la série
    est trop courte pour un cycle annuel. Jamais négatif."""
    if t_idx < 0 or t_idx >= len(values):
        return 0.0
    target = t_idx + h
    src = target
    while src > t_idx:
        src -= 12
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
    """Validation par découpage TEMPOREL sur les mois d'origine distincts : chaque pli
    s'entraîne sur le passé et teste sur le futur immédiat (TimeSeriesSplit). JAMAIS de KFold
    aléatoire. Baseline = moyenne du train. Lève ValueError si trop peu de mois distincts →
    l'asset rabat en descriptif.

    EMBARGO (anti-fuite décisif) : une origine t produit des cibles t+1..t+H qui peuvent
    CHEVAUCHER celles du test (même mois cible des deux côtés → fuite). On purge donc du
    train toute ligne dont la **date cible** (origine + horizon) est ≥ la plus PRÉCOCE des
    cibles du test. Sans cet embargo, le modèle « bat » la baseline même sur du bruit i.i.d.
    (faux pouvoir prédictif) ; avec, la porte ne se déclenche que sur un vrai signal."""
    from sklearn.model_selection import TimeSeriesSplit

    if ds.X.shape[0] == 0:
        raise ValueError("dataset vide : aucune ligne d'entraînement")
    order = np.argsort(ds.origin, kind="stable")
    unique_dates = np.unique(ds.origin)
    if len(unique_dates) < n_splits + 1:
        raise ValueError(f"trop peu de mois distincts ({len(unique_dates)}) pour {n_splits} plis")

    date_index = {d: i for i, d in enumerate(unique_dates)}
    row_date_pos = np.array([date_index[d] for d in ds.origin])
    # Date CIBLE de chaque ligne = origine + horizon_months (colonne 0 des features).
    target_date = ds.origin + ds.X[:, 0].astype("int64").astype("timedelta64[M]")

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


def _predict_monthly(
    model, timeline_rows, univ_codes: dict[str, int]
) -> dict[str, dict[int, float]]:
    """Pour chaque établissement, prédit les vues mensuelles à h ∈ [1..MAX_HORIZON] depuis sa
    DERNIÈRE date connue (origine = dernière observation). Clip ≥ 0. Renvoie {uid: {h: ŷ}}."""
    by_univ: dict[str, list[tuple[dt.date, int]]] = {}
    for uid, d, n in timeline_rows:
        by_univ.setdefault(uid, []).append((d, int(n)))

    out: dict[str, dict[int, float]] = {}
    for uid, pairs in by_univ.items():
        if uid not in univ_codes:
            continue
        pairs.sort()
        full_months, values = _dense_series([d for d, _ in pairs], [n for _, n in pairs])
        t_idx = len(values) - 1
        past = _past_features(values, t_idx)
        if past is None:  # historique insuffisant → pas de prévision modèle pour cet établ.
            continue
        code = float(univ_codes[uid])
        last_idx = _month_index(full_months[t_idx])
        preds: dict[int, float] = {}
        for h in range(1, MAX_HORIZON + 1):
            cal = _calendar_features(_month_from_index(last_idx + h))
            x = np.array([[float(h), *cal, *past, code]], dtype=np.float64)
            preds[h] = max(0.0, float(model.predict(x)[0]))
        out[uid] = preds
    return out


def _baseline_monthly(timeline_rows) -> dict[str, dict[int, float]]:
    """Prévisions mensuelles par la BASELINE (saisonnier naïf annuel) — mode descriptif."""
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
    monthly: dict[str, dict[int, float]], timeline_rows, served_mode: str
) -> list[dict]:
    """Agrège les prévisions mensuelles en fenêtres métier (1 / 3 / 12 mois) : somme des h
    premiers mois. La fenêtre démarre au mois suivant la dernière date connue. Cohérence
    interne garantie (12 mois ⊇ 3 mois ⊇ 1 mois)."""
    last_by_univ: dict[str, dt.date] = {}
    for uid, d, _ in timeline_rows:
        if uid not in last_by_univ or d > last_by_univ[uid]:
            last_by_univ[uid] = d
    rows: list[dict] = []
    for uid, preds in monthly.items():
        last = last_by_univ.get(uid)
        if last is None:
            continue
        last_idx = _month_index(last)
        for label, span in WINDOWS.items():
            total = float(sum(preds.get(h, 0.0) for h in range(1, span + 1)))
            rows.append(
                {
                    "university_id": uid,
                    "horizon_label": label,
                    "window_start": _month_from_index(last_idx + 1),
                    "window_end": _month_from_index(last_idx + span),
                    "views_pred": max(0.0, total),
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
        monthly = _predict_monthly(model, timeline_rows, univ_codes)
    else:
        monthly = _baseline_monthly(timeline_rows)
    rows = aggregate_windows(monthly, timeline_rows, served_mode)
    return rows, evaluation, served_mode
