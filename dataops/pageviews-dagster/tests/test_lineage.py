"""Tests de l'émission OpenLineage → Marquez de la code-location « pageviews ».

Hermétiques : aucun Marquez réel. On vérifie (a) la convention de nommage qui CONNECTE
la chaîne source→raw→curated→mart (un dataset de sortie porte le même ``(namespace,
name)`` que l'entrée aval), (b) la NEUTRALITÉ des namespaces (identifiants génériques,
la source Wikimedia n'apparaît qu'en namespace technique), (c) le no-op sans
``OPENLINEAGE_URL``, et (d) qu'avec l'URL posée l'événement porte les bons datasets
(client OpenLineage mocké). La visibilité réelle dans Marquez est une preuve
d'intégration jouée au banc (ADR 0057), hors de ce test unitaire.
"""

import os
from unittest import mock

from openlineage.client.event_v2 import RunState

from pageviews_dagster import lineage

# ── Convention de nommage (graphe connecté, neutralité ADR 0022/0035) ────────


def test_namespaces_are_generic_no_brand() -> None:
    # Neutralité (ADR 0035) : namespace interne générique `pageviews` ; la source porte
    # un namespace technique `wikimedia`, jamais une marque dans un IDENTIFIANT interne.
    assert lineage.NAMESPACE == "pageviews"
    assert lineage.SOURCE_NAMESPACE == "wikimedia"


def test_dataset_names_chain_source_raw_curated_mart() -> None:
    # Un dataset de sortie doit porter le même (namespace, name) que l'entrée aval.
    src = lineage.source_dataset()
    assert src.namespace == "wikimedia"
    assert src.name == "pageview_complete"

    raw = lineage.raw_dataset()
    assert raw.namespace == "pageviews"
    assert raw.name == "raw/pageviews"
    # L'entité est paramétrable (défaut `pageviews`).
    assert lineage.raw_dataset("views").name == "raw/views"

    curated = lineage.curated_dataset("university_pageviews")
    assert curated.namespace == "pageviews"
    assert curated.name == "curated/university_pageviews"

    mart = lineage.mart_dataset()
    assert mart.namespace == "pageviews"
    assert mart.name == "marts/views_forecast"
    assert lineage.mart_dataset("marts/university_timeline").name == "marts/university_timeline"


def test_dataset_names_are_technical_no_pii() -> None:
    # Invariant RGPD : uniquement des noms de couche/table, jamais de contenu de vue.
    names = [
        lineage.raw_dataset().name,
        lineage.curated_dataset("m").name,
        lineage.mart_dataset().name,
    ]
    assert all(n.startswith(("raw/", "curated/", "marts/")) for n in names)


# ── emit (no-op sans URL, événement complet avec URL) ────────────────────────


def test_emit_is_noop_without_openlineage_url() -> None:
    # Sans OPENLINEAGE_URL, emit ne construit AUCUN client (no-op silencieux assumé :
    # code-location matérialisable hors cluster — tests/CI hermétiques).
    with (
        mock.patch.dict(os.environ, {}, clear=True),
        mock.patch.object(lineage, "OpenLineageClient") as client,
    ):
        assert lineage.emit(RunState.START, "run1", "raw_pageviews", [], []) is None
        client.from_environment.assert_not_called()


def test_emit_sends_event_when_url_present() -> None:
    # run_id : un UUID valide (forme des run ids Dagster ; RunEvent le valide).
    run_id = "11111111-1111-4111-8111-111111111111"
    with (
        mock.patch.dict(os.environ, {"OPENLINEAGE_URL": "http://marquez:5000"}, clear=True),
        mock.patch.object(lineage, "OpenLineageClient") as client,
    ):
        lineage.emit(
            RunState.COMPLETE,
            run_id,
            "raw_pageviews",
            [lineage.source_dataset()],
            [lineage.raw_dataset()],
        )
        client.from_environment.return_value.emit.assert_called_once()


def test_emit_event_carries_datasets_and_default_job_namespace(monkeypatch) -> None:
    # Sans OPENLINEAGE_NAMESPACE : le namespace du job retombe sur `dagster` (défaut).
    monkeypatch.setenv("OPENLINEAGE_URL", "http://marquez.test:5000")
    monkeypatch.delenv("OPENLINEAGE_NAMESPACE", raising=False)
    captured = {}

    class _FakeClient:
        @staticmethod
        def from_environment():
            return _FakeClient()

        def emit(self, event):
            captured["event"] = event

    monkeypatch.setattr(lineage, "OpenLineageClient", _FakeClient)
    run_id = "12345678-1234-1234-1234-123456789abc"
    inputs = [lineage.source_dataset()]
    outputs = [lineage.raw_dataset()]
    lineage.emit(RunState.COMPLETE, run_id, "raw_pageviews", inputs, outputs)

    event = captured["event"]
    assert event.run.runId == run_id
    assert event.job.name == "raw_pageviews"
    assert event.job.namespace == "dagster"  # défaut sans OPENLINEAGE_NAMESPACE
    assert event.eventType == RunState.COMPLETE
    assert {d.name for d in event.inputs} == {"pageview_complete"}
    assert {d.name for d in event.outputs} == {"raw/pageviews"}


def test_emit_job_namespace_overridable_by_env(monkeypatch) -> None:
    # OPENLINEAGE_NAMESPACE (valeur d'instance) surcharge le namespace du job.
    monkeypatch.setenv("OPENLINEAGE_URL", "http://marquez.test:5000")
    monkeypatch.setenv("OPENLINEAGE_NAMESPACE", "custom-ns")
    captured = {}

    class _FakeClient:
        @staticmethod
        def from_environment():
            return _FakeClient()

        def emit(self, event):
            captured["event"] = event

    monkeypatch.setattr(lineage, "OpenLineageClient", _FakeClient)
    lineage.emit(RunState.START, "22222222-2222-4222-8222-222222222222", "raw_pageviews", [], [])
    assert captured["event"].job.namespace == "custom-ns"
