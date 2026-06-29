"""Tests du module pur partitions (signal de donnée neuve GKG, ADR 0082)."""

from mediawatch_dagster.partitions import ingested_partitions


def test_extracts_distinct_dt_dates():
    entries = [
        {"Path": "dt=2024-06-01/run=a"},
        {"Path": "dt=2024-06-01/run=b"},  # même dt, autre run → dédupliqué
        {"Path": "dt=2024-06-02"},
        {"Path": "autre/chose"},  # pas de dt= → ignoré
    ]
    assert ingested_partitions(entries) == {"2024-06-01", "2024-06-02"}


def test_empty_entries_give_empty_set():
    assert ingested_partitions([]) == set()
