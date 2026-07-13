"""Tests du point d'entrée de la code-location (definitions).

SQUELETTE (lot 1) : on vérifie seulement que la code-location est CHARGEABLE et INERTE —
``defs`` est un ``Definitions`` valide sans aucun asset métier. Les tests des assets
(prefiltered_raw, researchers, scholar_works, scholar_profiles) viendront à leurs lots.
"""

from dagster import Definitions

from scholar_network_dagster.definitions import defs


def test_defs_loads():
    """La code-location se charge : ``defs`` est un ``Definitions`` valide (point d'entrée gRPC)."""
    assert defs is not None
    assert isinstance(defs, Definitions)


def test_defs_is_inert_no_business_assets():
    """SQUELETTE : aucun asset métier n'est câblé (liste vide) — code-location inerte.

    Garde-fou : ce test cassera dès qu'un asset sera ajouté SANS mettre à jour le lot/plan.
    Les assets arriveront aux lots 2–5 (ADR 0103, plan 2026-07-13-scholar-network)."""
    keys = list(defs.resolve_asset_graph().get_all_asset_keys())
    assert keys == []
