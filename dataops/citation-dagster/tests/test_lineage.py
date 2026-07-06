"""Tests de l'émission OpenLineage (étape 3.5b).

Hermétiques : aucun Marquez réel. On vérifie (a) la convention de nommage qui
CONNECTE la chaîne source→raw→curated→mart→manifest, (b) le no-op sans
``OPENLINEAGE_URL``, et (c) qu'avec l'URL posée, l'événement émis porte les bons
datasets (client OpenLineage mocké). La visibilité réelle dans Marquez est une
preuve d'intégration jouée au banc (ADR 0057), hors de ce test.
"""

from openlineage.client.event_v2 import RunState

from citation_dagster import lineage


def test_dataset_naming_connects_the_chain():
    # Les sorties brutes de raw_snapshot == les entrées dbt (même namespace+nom).
    assert lineage.raw_dataset("works").namespace == "citation"
    assert lineage.raw_dataset("works").name == "raw/works"
    # La sortie mart de dbt == l'entrée de collab_manifest (manifest._MART_SUBDIR).
    from citation_dagster.assets import manifest

    assert lineage.mart_dataset().name == manifest._MART_SUBDIR


def test_dbt_lineage_io_inputs_outputs():
    inputs, outputs = lineage.dbt_lineage_io()
    in_names = {d.name for d in inputs}
    out_names = {d.name for d in outputs}
    # Entrée = le mart EUNICoast (connecte l'asset mart_eunicoast → dbt, ADR 0105).
    assert in_names == {"mart_eunicoast"}
    # Sorties = curated + mart de co-autorat (connecte dbt → collab_manifest).
    assert "marts/collab" in out_names
    assert "curated/curated_authorships" in out_names
    # Le volet citations a disparu : plus de curated_edges dans le lineage.
    assert "curated/curated_edges" not in out_names
    # Pas de PII : uniquement des noms techniques (préfixes de couche / mart).
    assert all(d.name.startswith(("raw/", "curated/", "marts/", "mart_")) for d in inputs + outputs)


def test_emit_is_noop_without_url(monkeypatch):
    monkeypatch.delenv("OPENLINEAGE_URL", raising=False)
    called = {"client": False}

    def _boom(*a, **k):
        called["client"] = True
        raise AssertionError("OpenLineageClient ne doit pas être instancié sans URL")

    monkeypatch.setattr(lineage, "OpenLineageClient", type("C", (), {"from_environment": _boom}))
    # Ne lève pas, n'instancie pas de client.
    lineage.emit(RunState.START, "run1", "citation_dbt_models", *lineage.dbt_lineage_io())
    assert called["client"] is False


def test_emit_sends_event_with_url(monkeypatch):
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
    inputs, outputs = lineage.dbt_lineage_io()
    # runId doit être un UUID (validé par le client OpenLineage), comme context.run_id.
    run_id = "12345678-1234-1234-1234-123456789abc"
    lineage.emit(RunState.COMPLETE, run_id, "citation_dbt_models", inputs, outputs)

    event = captured["event"]
    assert event.run.runId == run_id
    assert event.job.name == "citation_dbt_models"
    assert event.eventType == RunState.COMPLETE
    assert {d.name for d in event.inputs} == {"mart_eunicoast"}
    assert "marts/collab" in {d.name for d in event.outputs}
