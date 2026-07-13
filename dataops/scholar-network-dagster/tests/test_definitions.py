"""Tests du point d'entrée de la code-location (definitions).

Vérifie que la code-location se charge et expose la CHAÎNE des 5 assets du pipeline
(prefiltered_raw → researchers → scholar_works → scholar_profiles → index_load) + le job
d'ingestion (ADR 0103, plan 2026-07-13-scholar-network).
"""

from dagster import Definitions

from scholar_network_dagster.definitions import defs

_EXPECTED_ASSETS = {
    "prefiltered_raw",
    "researchers",
    "scholar_works",
    "scholar_profiles",
    "index_load",
}


def test_defs_loads():
    """La code-location se charge : ``defs`` est un ``Definitions`` valide (point d'entrée gRPC)."""
    assert defs is not None
    assert isinstance(defs, Definitions)


def test_defs_exposes_the_five_pipeline_assets():
    """Les 5 assets de la chaîne sont câblés (ADR 0103 §1-2)."""
    keys = {k.to_user_string() for k in defs.resolve_asset_graph().get_all_asset_keys()}
    assert keys >= _EXPECTED_ASSETS


def test_ingestion_job_is_defined():
    """Un job ``ingestion_job`` enchaîne la chaîne dans un même run."""
    job = defs.resolve_job_def("ingestion_job")
    assert job is not None
