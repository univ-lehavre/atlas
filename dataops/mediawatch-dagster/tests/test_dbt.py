"""Tests de l'intégration dbt ↔ Dagster (vars, dégradation propre)."""

from mediawatch_dagster import dbt


def test_build_dbt_vars_injects_run_id_as_immutable_run() -> None:
    vars_ = dbt.build_dbt_vars("run-abc", curated_dt="2026-01")
    # curated_run = run_id → un rejeu écrit un nouveau préfixe run=<id>/ (immutabilité).
    assert vars_ == {"curated_dt": "2026-01", "curated_run": "run-abc"}


def test_dbt_components_degrades_cleanly_when_build_fails(monkeypatch) -> None:
    # Si la construction de l'asset dbt échoue (pas de manifest, dbt indisponible),
    # dbt_components renvoie ([], {}) → la code-location reste chargeable (lint/CI).
    def boom():
        raise RuntimeError("no manifest")

    monkeypatch.setattr(dbt, "build_mediawatch_dbt_assets", boom)
    assets, resources = dbt.dbt_components()
    assert assets == []
    assert resources == {}


def test_dbt_components_returns_assets_and_resource_nominal(monkeypatch) -> None:
    sentinel = object()
    monkeypatch.setattr(dbt, "build_mediawatch_dbt_assets", lambda: sentinel)
    assets, resources = dbt.dbt_components()
    assert assets == [sentinel]
    assert "dbt" in resources
