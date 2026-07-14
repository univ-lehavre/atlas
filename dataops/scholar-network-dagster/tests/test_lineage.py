"""Tests du canal de lineage (OpenLineage → Marquez) : convention de nommage + no-op."""

from openlineage.client.event_v2 import RunState

from scholar_network_dagster import lineage
from scholar_network_dagster.lineage import (
    NAMESPACE,
    SOURCE_NAMESPACE,
    index_dataset,
    pass_dataset,
    prefiltered_dataset,
    raw_dataset,
)


def test_namespace_is_neutral_scholar_network():
    # Neutralité de domaine (ADR 0022/0035) : identifiant neutre, pas de marque EUNICoast.
    assert NAMESPACE == "scholar-network"
    assert SOURCE_NAMESPACE == "openalex"


def test_producer_points_to_scholar_network():
    assert lineage._PRODUCER.endswith("/dataops/scholar-network-dagster")


def test_dataset_naming_convention():
    assert raw_dataset("works").name == "raw/works"
    assert prefiltered_dataset().name == "prefiltered/works"
    assert prefiltered_dataset("authors").name == "prefiltered/authors"
    assert pass_dataset("researchers").name == "passes/researchers"
    assert pass_dataset("scholar_works").name == "passes/scholar_works"
    assert index_dataset("profiles").name == "index/profiles"
    # Tous dans le namespace interne.
    for ds in (raw_dataset("x"), prefiltered_dataset(), pass_dataset("y"), index_dataset("z")):
        assert ds.namespace == NAMESPACE


def test_emit_is_noop_without_openlineage_url(monkeypatch):
    # Sans OPENLINEAGE_URL, emit ne construit AUCUN client (no-op silencieux).
    monkeypatch.delenv("OPENLINEAGE_URL", raising=False)
    called = {"n": 0}

    def _boom(*a, **k):
        called["n"] += 1
        raise AssertionError("OpenLineageClient ne doit pas être instancié sans URL")

    monkeypatch.setattr(lineage, "OpenLineageClient", _boom)
    lineage.emit(RunState.COMPLETE, "run-1", "job", [], [])
    assert called["n"] == 0


def test_emit_builds_client_and_emits_when_url_set(monkeypatch):
    monkeypatch.setenv("OPENLINEAGE_URL", "http://marquez.marquez:5000")
    monkeypatch.setenv("OPENLINEAGE_NAMESPACE", "dagster")
    events = []

    class _FakeClient:
        @classmethod
        def from_environment(cls):
            return cls()

        def emit(self, event):
            events.append(event)

    monkeypatch.setattr(lineage, "OpenLineageClient", _FakeClient)
    # runId doit être un UUID (validé par le client OpenLineage), comme context.run_id.
    run_id = "12345678-1234-1234-1234-123456789abc"
    lineage.emit(
        RunState.COMPLETE,
        run_id,
        "prefiltered_raw",
        [raw_dataset("works")],
        [prefiltered_dataset()],
    )
    assert len(events) == 1
    assert events[0].run.runId == run_id
    assert events[0].job.name == "prefiltered_raw"
