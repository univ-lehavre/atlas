"""Tests du contrat de qualité servie (quality.py, ADR 0103 §2, lot 6).

Le corps ``check_scholar_profiles`` est PUR : on vérifie qu'il passe sur des profils valides
et échoue (bloquant) sur chaque violation — sans Dagster ni réseau.
"""

import numpy as np

from scholar_network_dagster import embedding
from scholar_network_dagster.assets.quality import check_scholar_profiles

_DIM = embedding.EMBEDDING_DIM


def _unit_vec(seed_component: int):
    """Vecteur unité (norme L2 = 1) de dimension DIM, non nul sur une composante."""
    v = np.zeros(_DIM, dtype=np.float64)
    v[seed_component % _DIM] = 1.0
    return v  # déjà norme 1


def test_valid_profiles_pass():
    """Profils valides (uniques, dim 384, norme 1, finis) → check passé."""
    rows = [("A1", _unit_vec(0)), ("A2", _unit_vec(1))]
    result = check_scholar_profiles(rows)
    assert result.passed is True
    assert result.metadata["profiles_evaluated"].value == 2
    assert result.metadata["violations"].value == "—"


def test_duplicate_researcher_id_fails():
    """Deux profils pour le même chercheur → violation d'unicité (bloquant)."""
    rows = [("A1", _unit_vec(0)), ("A1", _unit_vec(1))]
    result = check_scholar_profiles(rows)
    assert result.passed is False
    assert "unicité" in result.metadata["violations"].value


def test_wrong_dimension_fails():
    """Un vecteur de mauvaise dimension → violation de dimension."""
    rows = [("A1", _unit_vec(0)), ("A2", np.ones(_DIM - 1, dtype=np.float64))]
    result = check_scholar_profiles(rows)
    assert result.passed is False
    assert "dimension" in result.metadata["violations"].value


def test_non_unit_norm_fails():
    """Un vecteur non L2-normalisé (norme ≠ 1) → violation de normalité (invariant métier)."""
    non_unit = np.zeros(_DIM, dtype=np.float64)
    non_unit[0] = 5.0  # norme 5, pas 1
    rows = [("A1", _unit_vec(0)), ("A2", non_unit)]
    result = check_scholar_profiles(rows)
    assert result.passed is False
    assert "normalité L2" in result.metadata["violations"].value


def test_nan_component_fails():
    """Un vecteur avec une composante NaN → violation de validité."""
    bad = _unit_vec(0).copy()
    bad[3] = np.nan
    rows = [("A1", bad)]
    result = check_scholar_profiles(rows)
    assert result.passed is False
    assert "validité" in result.metadata["violations"].value


def test_empty_profiles_pass():
    """Aucun profil (réseau vide) → check passé (rien à violer), non bloquant."""
    result = check_scholar_profiles([])
    assert result.passed is True
    assert result.metadata["profiles_evaluated"].value == 0


def test_multiple_violations_reported_together():
    """Plusieurs violations simultanées → toutes listées (transparence de la porte)."""
    dup_bad_norm = np.full(_DIM, 2.0, dtype=np.float64)  # norme ≠ 1
    rows = [("A1", dup_bad_norm), ("A1", dup_bad_norm)]  # + doublon
    result = check_scholar_profiles(rows)
    assert result.passed is False
    v = result.metadata["violations"].value
    assert "unicité" in v and "normalité L2" in v
