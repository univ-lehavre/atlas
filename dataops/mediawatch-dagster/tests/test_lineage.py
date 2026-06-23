"""Tests de la convention de nommage des datasets de lineage (graphe connecté)."""

import os
from unittest import mock

from openlineage.client.event_v2 import RunState

from mediawatch_dagster import lineage


def test_namespaces_are_generic_no_brand() -> None:
    # Neutralité (ADR 0035) : namespace interne générique ; la source porte un nom
    # de namespace technique, jamais une marque dans un IDENTIFIANT applicatif.
    assert lineage.NAMESPACE == "mediawatch"
    assert lineage.SOURCE_NAMESPACE == "gdelt"


def test_dataset_names_chain_raw_curated_mart() -> None:
    # Un dataset de sortie doit porter le même (namespace, name) que l'entrée aval.
    assert lineage.raw_dataset().name == "raw/gkg"
    assert lineage.raw_dataset().namespace == "mediawatch"
    assert lineage.curated_dataset("org_mentions").name == "curated/org_mentions"
    assert lineage.mart_dataset().name == "marts/university_timeline"
    assert lineage.source_dataset().namespace == "gdelt"


def test_emit_is_noop_without_openlineage_url() -> None:
    # Sans OPENLINEAGE_URL, emit ne construit aucun client (no-op silencieux assumé).
    with (
        mock.patch.dict(os.environ, {}, clear=True),
        mock.patch.object(lineage, "OpenLineageClient") as client,
    ):
        lineage.emit(RunState.START, "run1", "raw_gkg", [], [])
        client.from_environment.assert_not_called()


def test_emit_sends_event_when_url_present() -> None:
    # run_id : un UUID valide (forme des run ids Dagster ; RunEvent le valide).
    run_id = "11111111-1111-4111-8111-111111111111"
    with (
        mock.patch.dict(os.environ, {"OPENLINEAGE_URL": "http://marquez:5000"}, clear=True),
        mock.patch.object(lineage, "OpenLineageClient") as client,
    ):
        lineage.emit(RunState.COMPLETE, run_id, "raw_gkg", [], [lineage.raw_dataset()])
        client.from_environment.return_value.emit.assert_called_once()
