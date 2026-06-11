"""Tests unitaires de l'intégration dbt ↔ Dagster (étape 3.2).

Purs (aucun run dbt, aucune I/O S3) : couvrent la construction des vars, la
résolution du chemin projet, la garantie de manifest et la dégradation propre.
Le run dbt réel est prouvé séparément par le smoke hermétique (test_dbt_models).
"""

from pathlib import Path

from citation_dagster import dbt as dbt_mod


def test_build_dbt_vars_uses_run_id_as_immutable_run():
    vars_ = dbt_mod.build_dbt_vars(run_id="run-abc", curated_dt="2026-06")
    assert vars_ == {"curated_dt": "2026-06", "curated_run": "run-abc"}


def test_project_dir_points_to_citation_dbt():
    # En dépôt, le projet dbt est le frère `citation-dbt` sous `dataops/`.
    assert dbt_mod.DBT_PROJECT_DIR.name == "citation-dbt"
    assert (dbt_mod.DBT_PROJECT_DIR / "dbt_project.yml").exists()


def test_ensure_manifest_returns_existing_without_parsing(monkeypatch):
    # Manifest déjà présent (généré par un parse antérieur / le build) → pas de parse.
    called = {"cli": False}

    def _boom(*a, **k):  # ne doit pas être appelé
        called["cli"] = True
        raise AssertionError("dbt parse ne devrait pas être lancé si le manifest existe")

    manifest = dbt_mod.dbt_project.manifest_path
    if not manifest.exists():
        dbt_mod.ensure_manifest()  # garantit l'existence pour ce test
    monkeypatch.setattr(dbt_mod.DbtCliResource, "cli", _boom)
    assert dbt_mod.ensure_manifest() == manifest
    assert called["cli"] is False


def test_ensure_manifest_parses_when_absent(monkeypatch, tmp_path):
    # Manifest absent → un parse paresseux est déclenché.
    fake_manifest = tmp_path / "target" / "manifest.json"

    class _FakeProject:
        manifest_path = fake_manifest

    calls = {"parse": 0}

    class _FakeInvocation:
        def wait(self):
            # Simule l'écriture du manifest par `dbt parse`.
            fake_manifest.parent.mkdir(parents=True, exist_ok=True)
            fake_manifest.write_text("{}", encoding="utf-8")

    class _FakeCli:
        def __init__(self, *a, **k):
            pass

        def cli(self, args, **kwargs):
            calls["parse"] += 1
            assert args == ["parse"]
            return _FakeInvocation()

    monkeypatch.setattr(dbt_mod, "dbt_project", _FakeProject)
    monkeypatch.setattr(dbt_mod, "DbtCliResource", _FakeCli)
    result = dbt_mod.ensure_manifest()
    assert result == fake_manifest
    assert calls["parse"] == 1
    assert fake_manifest.exists()


def test_dbt_components_nominal_returns_asset_and_resource():
    assets, resources = dbt_mod.dbt_components()
    assert len(assets) == 1
    assert "dbt" in resources


def test_dbt_components_degrades_when_build_fails(monkeypatch):
    # Si la construction des assets échoue (dbt indisponible, manifest impossible),
    # on dégrade proprement en ([], {}) pour garder la code-location chargeable.
    def _boom():
        raise RuntimeError("dbt indisponible")

    monkeypatch.setattr(dbt_mod, "build_citation_dbt_assets", _boom)
    assert dbt_mod.dbt_components() == ([], {})


def test_definitions_module_loads_with_dbt_assets():
    # L'import construit `defs` à l'import : on vérifie que les assets dbt + le job
    # de transformation sont bien enregistrés (manifest présent en dev/test).
    from citation_dagster import definitions as d

    job_names = {j.name for j in d._jobs}
    assert "ingestion_job" in job_names
    assert "transform_job" in job_names  # présent car les assets dbt existent
    assert len(d._dbt_assets) == 1  # l'asset multi-modèles dbt
    assert isinstance(dbt_mod.DBT_PROJECT_DIR, Path)
