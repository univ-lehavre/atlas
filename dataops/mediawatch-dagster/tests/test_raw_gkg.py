"""Tests de l'asset raw_gkg DÉRIVÉ (ADR 0100) : lecture native + projection mockées.

Hermétique : aucun réseau, aucun S3. ``raw_gkg`` ne télécharge plus GDELT — il LIT la
couche native (mockée) et écrit la couche projetée en Parquet (écriture DuckDB mockée).
On vérifie la projection 6 champs, l'éclatement des organisations et l'écriture sous
``raw/gkg/dt=/run=`` (ADR 0057/0100).
"""

import sys
from pathlib import Path

import pytest
from dagster import Failure, build_asset_context

from mediawatch_dagster import gkg, lakehouse
from mediawatch_dagster.assets.raw_gkg import RawGkgConfig, raw_gkg
from mediawatch_dagster.resources import ceph_target_from_env

_MODULE = sys.modules["mediawatch_dagster.assets.raw_gkg"]

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "seaweedfs.s3.svc.cluster.local",
    "BUCKET_PORT": "8333",
    "BUCKET_NAME": "mediawatch",
}

# Lignes NATIVES (dict 27 champs) telles que raw_native_gkg les a écrites, lues par la
# projection. On ne renseigne que les champs utiles ; les autres valent "" (défaut).
_FIXTURES = Path(__file__).resolve().parents[3] / "fixtures" / "gkg-sample"


def _native_row(record_id, date, orgs, source="example.com", url="http://a", trans=""):
    """Construit une ligne native (dict des 27 colonnes) pour les tests."""
    row = dict.fromkeys(gkg.NATIVE_COLUMNS, "")
    row["gkg_record_id"] = record_id
    row["v21_date"] = date
    row["v2_source_common_name"] = source
    row["v2_document_identifier"] = url
    row["v2_enhanced_organizations"] = orgs
    row["v21_translation_info"] = trans
    return row


class _CaptureCon:
    """Connexion DuckDB factice : capture les écritures via register/copy_to_parquet.

    ``registered`` retient la table même après ``unregister`` (l'asset la désenregistre
    dans un ``finally``) pour que les tests puissent l'inspecter APRÈS le run.
    """

    def __init__(self) -> None:
        self.registered: dict = {}
        self._live: dict = {}

    def register(self, name, table) -> None:
        self.registered[name] = table
        self._live[name] = table

    def unregister(self, name) -> None:  # noqa: D401 — nettoyage (ne purge pas la capture)
        self._live.pop(name, None)


def _patch(monkeypatch, native_rows, capture: _CaptureCon, dests: list) -> None:
    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(lakehouse, "connect", lambda cfg=None: capture)
    monkeypatch.setattr(
        lakehouse, "read_native_rows", lambda con, bucket, prefix, dt, run_id: native_rows
    )

    def _fake_copy(con, select_sql, dest_dir, partition_by=None):
        dests.append(dest_dir)

    monkeypatch.setattr(lakehouse, "copy_to_parquet", _fake_copy)


def _run(partition_key: str, config: RawGkgConfig):
    return raw_gkg(build_asset_context(partition_key=partition_key), config)


def test_projects_native_rows_to_mentions(monkeypatch) -> None:
    native = [
        _native_row("r1", "20260101120000", "Harvard University,10;MIT,20"),
        _native_row("r2", "20260101121500", "Stanford,5"),
    ]
    capture, dests = _CaptureCon(), []
    _patch(monkeypatch, native, capture, dests)

    result = _run("2026-01-01", RawGkgConfig())
    # 2 mentions (r1) + 1 (r2) = 3.
    assert result.metadata["mentions_written"].value == 3
    assert result.metadata["native_rows_read"].value == 2
    # Écriture sous raw/gkg/dt=2026-01-01 (date de partition).
    assert len(dests) == 1
    assert "raw/gkg/dt=2026-01-01" in dests[0]
    # La table Arrow enregistrée porte les 6 colonnes du contrat dbt.
    table = capture.registered["projected_mentions"]
    assert set(table.column_names) == {
        "record_id",
        "date",
        "organization",
        "source_common_name",
        "document_identifier",
        "translated",
    }
    # translated typé BOOLEAN (contrat staging : coalesce(translated, false)).
    assert str(table.schema.field("translated").type) == "bool"


def test_row_without_org_yields_no_mention(monkeypatch) -> None:
    native = [_native_row("r1", "20260101120000", "")]  # aucune organisation
    capture, dests = _CaptureCon(), []
    _patch(monkeypatch, native, capture, dests)

    result = _run("2026-01-01", RawGkgConfig())
    assert result.metadata["mentions_written"].value == 0
    # Aucune mention → pas d'écriture Parquet (pas de part vide).
    assert dests == []


def test_translated_flag_from_translation_info(monkeypatch) -> None:
    native = [
        _native_row("r1", "20260101120000", "UNESCO,3", trans="srclc:fra"),  # traduit
        _native_row("r2", "20260101120000", "NATO,3", trans=""),  # natif anglais
    ]
    capture, dests = _CaptureCon(), []
    _patch(monkeypatch, native, capture, dests)

    _run("2026-01-01", RawGkgConfig())
    table = capture.registered["projected_mentions"]
    by_id = dict(
        zip(
            table.column("record_id").to_pylist(),
            table.column("translated").to_pylist(),
            strict=True,
        )
    )
    assert by_id["r1"] is True
    assert by_id["r2"] is False


def test_empty_native_writes_nothing(monkeypatch) -> None:
    capture, dests = _CaptureCon(), []
    _patch(monkeypatch, [], capture, dests)

    result = _run("2026-01-01", RawGkgConfig())
    assert result.metadata["mentions_written"].value == 0
    assert result.metadata["native_rows_read"].value == 0
    assert dests == []


def test_native_read_failure_raises(monkeypatch) -> None:
    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(lakehouse, "connect", lambda cfg=None: _CaptureCon())

    def _boom(con, bucket, prefix, dt, run_id):
        raise RuntimeError("no such file")

    monkeypatch.setattr(lakehouse, "read_native_rows", _boom)
    with pytest.raises(Failure, match="Lecture de la couche native GKG"):
        _run("2026-01-01", RawGkgConfig())
