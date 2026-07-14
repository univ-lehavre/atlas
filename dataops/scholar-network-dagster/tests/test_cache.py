"""Tests du gradient de cache piloté par persistence.mode (cache.py, ADR 0103 §3, lot 2)."""

from scholar_network_dagster.cache import CacheMode, resolve_cache_mode


def test_full_is_persistent_between_runs():
    """full → cache PERSISTANT (matérialisé, survit au run, pas de purge)."""
    m = resolve_cache_mode({"SCHOLAR_NETWORK_PERSISTENCE_MODE": "full"})
    assert m is CacheMode.PERSISTENT
    assert m.materializes is True
    assert m.persists_between_runs is True
    assert m.purge_after_run is False


def test_bounded_is_transient():
    """bounded → cache TRANSITOIRE (matérialisé le temps du run, purgé en fin, ne survit pas)."""
    m = resolve_cache_mode({"SCHOLAR_NETWORK_PERSISTENCE_MODE": "bounded"})
    assert m is CacheMode.TRANSIENT
    assert m.materializes is True
    assert m.persists_between_runs is False
    assert m.purge_after_run is True


def test_ephemeral_has_no_cache():
    """ephemeral → PAS de cache (jamais matérialisé, recalcul à la volée)."""
    m = resolve_cache_mode({"SCHOLAR_NETWORK_PERSISTENCE_MODE": "ephemeral"})
    assert m is CacheMode.NONE
    assert m.materializes is False
    assert m.persists_between_runs is False
    assert m.purge_after_run is False


def test_default_absent_is_full_failsafe():
    """FAIL-SAFE (ADR 0103 §3) : env absent → full (mode le plus conservateur)."""
    assert resolve_cache_mode({}) is CacheMode.PERSISTENT


def test_unknown_and_empty_degrade_to_full():
    """Défensif : mode inconnu / vide / espaces / placeholder non substitué → full."""
    for value in ("typo", "", "   ", "__SCHOLAR_NETWORK_PERSISTENCE_MODE__"):
        assert (
            resolve_cache_mode({"SCHOLAR_NETWORK_PERSISTENCE_MODE": value}) is CacheMode.PERSISTENT
        ), value


def test_case_insensitive():
    """Insensible à la casse (le curseur peut arriver en majuscules)."""
    assert resolve_cache_mode({"SCHOLAR_NETWORK_PERSISTENCE_MODE": "FULL"}) is CacheMode.PERSISTENT
    assert resolve_cache_mode({"SCHOLAR_NETWORK_PERSISTENCE_MODE": "Ephemeral"}) is CacheMode.NONE
