"""Tests de l'intégration dbt ↔ Dagster (vars, lineage, manifest paresseux, dégradation).

Hermétiques : aucun run dbt RÉEL (le corps du ``@dbt_assets`` est ``# pragma: no cover``
— aucune logique métier Python à y couvrir). On exerce :
- ``build_dbt_vars`` (pur) : mois de partition MENSUELLE + id de run + source du réf ;
- ``_dataset`` / ``_emit`` : convention de nommage neutre et no-op sans OPENLINEAGE_URL ;
- ``ensure_manifest`` : retour immédiat si le manifest existe, ``dbt parse`` paresseux sinon ;
- ``dbt_components`` : ``[asset], {"dbt": …}`` nominal, ``([], {})`` en dégradation propre.
"""

import os
import shutil
import subprocess
import sys

import pytest
from openlineage.client.event_v2 import Dataset, RunState

from pageviews_dagster import dbt

_DBT_EXE = shutil.which("dbt") or os.path.join(os.path.dirname(sys.executable), "dbt")


# ── build_dbt_vars (pur, curseur MENSUEL) ─────────────────────────────────────


def test_build_dbt_vars_injects_month_and_default_ref_source(monkeypatch) -> None:
    # month (YYYY-MM) borne le scan du brut ET sert de période immuable (curated_dt).
    # curated_run = run_id → un rejeu écrit un nouveau préfixe run=<id>/ (immutabilité).
    # ref_source défaut = seed (exemple versionné, tests hermétiques). Grain MENSUEL (ADR 0097).
    monkeypatch.delenv("PAGEVIEWS_REF_SOURCE", raising=False)
    vars_ = dbt.build_dbt_vars("run-abc", month="2024-06")
    assert vars_ == {
        "month": "2024-06",
        "curated_dt": "2024-06",
        "curated_run": "run-abc",
        "ref_source": "seed",
    }


def test_build_dbt_vars_relays_ingested_ref_source(monkeypatch) -> None:
    # La prod pose PAGEVIEWS_REF_SOURCE=ingested (référentiel d'établissements ingéré).
    monkeypatch.setenv("PAGEVIEWS_REF_SOURCE", "ingested")
    assert dbt.build_dbt_vars("r", month="2024-06")["ref_source"] == "ingested"


# ── _dataset / _emit (lineage neutre, no-op sans URL) ────────────────────────


def test_dataset_uses_internal_neutral_namespace() -> None:
    # Namespace interne `pageviews` (neutre, ADR 0022/0035). Nom TECHNIQUE, pas de PII.
    ds = dbt._dataset("raw/pageviews")
    assert isinstance(ds, Dataset)
    assert ds.namespace == "pageviews" == dbt.LINEAGE_NAMESPACE
    assert ds.name == "raw/pageviews"


def test_emit_is_noop_without_openlineage_url(monkeypatch) -> None:
    # Sans OPENLINEAGE_URL : _emit ne construit AUCUN client (no-op silencieux assumé).
    monkeypatch.delenv("OPENLINEAGE_URL", raising=False)

    def _boom(*a, **k):
        raise AssertionError("OpenLineageClient ne doit pas être instancié sans URL")

    monkeypatch.setattr(dbt, "OpenLineageClient", type("C", (), {"from_environment": _boom}))
    assert dbt._emit(RunState.START, "run1", "pageviews_dbt_models", [], []) is None


def test_emit_sends_event_with_url(monkeypatch) -> None:
    # Avec URL : l'événement porte runId/job/datasets attendus (client mocké).
    monkeypatch.setenv("OPENLINEAGE_URL", "http://marquez.test:5000")
    monkeypatch.delenv("OPENLINEAGE_NAMESPACE", raising=False)
    captured = {}

    class _FakeClient:
        @staticmethod
        def from_environment():
            return _FakeClient()

        def emit(self, event):
            captured["event"] = event

    monkeypatch.setattr(dbt, "OpenLineageClient", _FakeClient)
    run_id = "12345678-1234-1234-1234-123456789abc"
    inputs = [dbt._dataset("raw/pageviews")]
    outputs = [dbt._dataset("marts/university_timeline")]
    dbt._emit(RunState.COMPLETE, run_id, "pageviews_dbt_models", inputs, outputs)

    event = captured["event"]
    assert event.run.runId == run_id
    assert event.job.name == "pageviews_dbt_models"
    assert event.job.namespace == "dagster"  # défaut sans OPENLINEAGE_NAMESPACE
    assert {d.name for d in event.inputs} == {"raw/pageviews"}
    assert {d.name for d in event.outputs} == {"marts/university_timeline"}


# ── ensure_manifest (retour immédiat si présent, parse paresseux sinon) ──────


def test_ensure_manifest_returns_path_when_present(monkeypatch, tmp_path) -> None:
    # Manifest présent (image prod / parse déjà fait) → retour immédiat, aucun parse.
    manifest = tmp_path / "manifest.json"
    manifest.write_text("{}")

    class _FakeProject:
        manifest_path = manifest

    def _no_parse(*a, **k):
        raise AssertionError("DbtCliResource ne doit pas être appelé si le manifest existe")

    monkeypatch.setattr(dbt, "dbt_project", _FakeProject())
    monkeypatch.setattr(dbt, "DbtCliResource", _no_parse)
    assert dbt.ensure_manifest() == manifest


def test_ensure_manifest_runs_lazy_parse_when_missing(monkeypatch, tmp_path) -> None:
    # Manifest absent (checkout neuf / CI) → dbt parse paresseux avec target/ ; on injecte
    # aussi les identifiants S3 FACTICES (parse sans I/O S3) — vérifiés posés.
    manifest = tmp_path / "target" / "manifest.json"  # n'existe pas
    for key in dbt._DUMMY_PARSE_ENV:
        monkeypatch.delenv(key, raising=False)
    calls = {}

    class _FakeProject:
        manifest_path = manifest

    class _FakeCli:
        def cli(self, args, target_path=None):
            calls["args"] = args
            calls["target_path"] = str(target_path)

            class _Handle:
                def wait(_self):
                    calls["waited"] = True

            return _Handle()

    monkeypatch.setattr(dbt, "dbt_project", _FakeProject())
    monkeypatch.setattr(dbt, "DbtCliResource", lambda project_dir: _FakeCli())

    out = dbt.ensure_manifest()
    assert out == manifest
    assert calls["args"] == ["parse"]
    assert calls["target_path"] == "target"
    assert calls["waited"] is True
    # Identifiants S3 factices posés (uniquement s'ils manquaient) pour un parse hermétique.
    for key, value in dbt._DUMMY_PARSE_ENV.items():
        assert os.environ[key] == value


# ── dbt_components (nominal vs dégradation propre) ───────────────────────────


def test_dbt_components_degrades_cleanly_when_build_fails(monkeypatch) -> None:
    # build_pageviews_dbt_assets échoue (pas de manifest, dbt indisponible) → ([], {})
    # → la code-location reste chargeable (lint / collecte pytest sans dbt).
    def _boom():
        raise RuntimeError("no manifest")

    monkeypatch.setattr(dbt, "build_pageviews_dbt_assets", _boom)
    assets, resources = dbt.dbt_components()
    assert assets == []
    assert resources == {}


def test_dbt_components_returns_assets_and_resource_nominal(monkeypatch) -> None:
    # Chemin nominal (manifest packagé) : renvoie [asset] + ressource CLI `dbt`. On mocke
    # BOTH build ET DbtCliResource (l'exe dbt peut manquer du PATH en environnement de test).
    sentinel = object()
    monkeypatch.setattr(dbt, "build_pageviews_dbt_assets", lambda: sentinel)
    monkeypatch.setattr(dbt, "DbtCliResource", lambda project_dir: ("dbt-resource", project_dir))
    assets, resources = dbt.dbt_components()
    assert assets == [sentinel]
    assert "dbt" in resources


# ── build_pageviews_dbt_assets (application réelle du @dbt_assets) ────────────


def _parse_manifest_into(target_dir) -> object:
    """``dbt parse`` du projet pageviews-dbt vers ``target_dir`` ISOLÉ (aucune fuite
    dans le ``target/`` du repo). Identifiants S3 factices (parse sans I/O S3). Renvoie
    le chemin du manifest, ou ``None`` si dbt/le parse est indisponible (test alors skip)."""
    env = {**os.environ, **dbt._DUMMY_PARSE_ENV}
    try:
        proc = subprocess.run(
            [
                _DBT_EXE,
                "parse",
                "--project-dir",
                os.fspath(dbt.DBT_PROJECT_DIR),
                "--profiles-dir",
                os.fspath(dbt.DBT_PROJECT_DIR),
                "--target-path",
                os.fspath(target_dir),
            ],
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    manifest = target_dir / "manifest.json"
    return manifest if proc.returncode == 0 and manifest.exists() else None


def test_build_pageviews_dbt_assets_wraps_multi_model_asset(monkeypatch, tmp_path) -> None:
    # Le décorateur @dbt_assets s'applique sur un manifest RÉEL (généré par dbt parse dans un
    # target ISOLÉ, sans toucher au repo) et produit un AssetsDefinition multi-modèles porté
    # par la partition MENSUELLE. Le CORPS de la fonction décorée est # pragma: no cover
    # (streamer dbt build : logique dbt, aucun Python métier à couvrir). Skip si dbt absent.
    from dagster import AssetsDefinition

    manifest = _parse_manifest_into(tmp_path / "dbt_target")
    if manifest is None:
        pytest.skip("binaire dbt/parse indisponible : impossible de générer un manifest réel")

    # ensure_manifest renvoie le manifest isolé → aucun parse ni écriture dans le repo.
    monkeypatch.setattr(dbt, "ensure_manifest", lambda: manifest)
    asset_def = dbt.build_pageviews_dbt_assets()
    assert isinstance(asset_def, AssetsDefinition)
    # Partition MENSUELLE portée par l'asset (la série est mensuelle, ADR 0097).
    assert asset_def.partitions_def is dbt.pageviews_monthly_partitions
