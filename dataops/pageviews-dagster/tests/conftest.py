"""Fixtures partagées des tests de la code-location « pageviews » (hermétiques, à graine
figée, ADR 0057). Zéro I/O, zéro Dagster : uniquement de la fabrication de séries MENSUELLES
synthétiques pour le cœur pur ``forecast_model`` et des ``DataFrame`` de contrat pour
``ge_suites``.

Le pipeline pageviews est MENSUEL à saisonnalité ANNUELLE (S=12), à la différence de
mediawatch (journalier, S=7). Les helpers produisent donc des séries indexées au **1er du
mois** consécutif, l'unité que le cœur pur manipule. ``MIN_HISTORY = 12`` mois ET le backtest
à 4 plis imposent un historique long : les fixtures fournissent ~60 mois (≫ 40) pour que la
porte de décision puisse s'exercer.
"""

import datetime as dt

import numpy as np
import pandas as pd
import pytest

# Origine des séries mensuelles synthétiques (1er janvier, année « pleine »).
BASE = dt.date(2019, 1, 1)


def month_index(d: dt.date) -> int:
    """Indice mensuel absolu (année*12 + mois-1) — miroir de ``forecast_model._month_index``."""
    return d.year * 12 + (d.month - 1)


def month_from_index(idx: int) -> dt.date:
    """Date (1er du mois) depuis l'indice mensuel absolu."""
    return dt.date(idx // 12, idx % 12 + 1, 1)


def monthly_series(uid, n_months, fn, seed=0, base=BASE):
    """Série mensuelle ``(university_id, month_date, views)`` de ``n_months`` mois consécutifs.

    ``fn(i, month_number, rng) -> float`` produit le volume ; on le borne à un entier ≥ 0
    (un compteur de vues ne peut être négatif). ``rng`` est une graine figée (déterminisme).
    """
    rng = np.random.default_rng(seed)
    start = month_index(base)
    rows = []
    for i in range(n_months):
        d = month_from_index(start + i)
        rows.append((uid, d, max(0, int(fn(i, d.month, rng)))))
    return rows


def annual_seasonal(level=1000.0, amp=400.0, noise=20.0):
    """Signal saisonnier ANNUEL (S=12) : cycle sur le mois de l'année (rentrée/examens/été).

    C'est le motif que la porte de décision doit reconnaître comme prédictif — l'homologue
    mensuel du signal hebdomadaire de mediawatch.
    """
    return lambda i, month, rng: level + amp * np.sin(2 * np.pi * month / 12) + rng.normal(0, noise)


@pytest.fixture
def seasonal_rows():
    """~60 mois d'un signal saisonnier annuel net (1 établissement) → attendu PRÉDICTIF."""
    return monthly_series("uni-A", 60, annual_seasonal(), seed=7)


@pytest.fixture
def noise_rows():
    """~60 mois de bruit i.i.d. (aucune structure temporelle) → CONTRÔLE NÉGATIF descriptif."""
    rng = np.random.default_rng(3)
    return monthly_series("uni-A", 60, lambda i, m, r: rng.integers(0, 2000), seed=99)


@pytest.fixture
def short_rows():
    """Historique trop court (< MIN_HISTORY + plis) → backtest impossible → repli descriptif."""
    return monthly_series("uni-A", 10, lambda i, m, r: 5, seed=0)


# ── DataFrames de contrat pour les suites Great Expectations ─────────────────


@pytest.fixture
def good_raw_df():
    """Brut mensuel conforme au contrat (``university_id``, ``month`` AAAAMM, ``views``)."""
    return pd.DataFrame(
        {
            "university_id": ["ror-03vek6s52", "ror-03vek6s52", "ror-05a28rw58"],
            "month": ["202401", "202402", "202401"],
            "views": [1200, 1350, 300],
        }
    )


@pytest.fixture
def good_marts_df():
    """Mart de prévision servi conforme (colonnes + domaines + ``_unique_grain`` booléen)."""
    return pd.DataFrame(
        {
            "university_id": ["ror-03vek6s52", "ror-03vek6s52", "ror-03vek6s52"],
            "horizon_label": ["month_1", "month_3", "year_1"],
            "views_pred": [1200.0, 3600.0, 14400.0],
            "served_mode": ["predictive", "predictive", "predictive"],
            "_unique_grain": [True, True, True],
        }
    )
