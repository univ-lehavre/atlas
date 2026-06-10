"""Tests de l'asset de sync ``raw_snapshot`` (rclone mocké)."""

import subprocess

import pytest
from dagster import Failure, build_asset_context

from citation_dagster.assets.raw_snapshot import RawSnapshotConfig, raw_snapshot

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "rgw.local",
    "BUCKET_NAME": "atlas-datalake-x",
    # Pas d'OPENLINEAGE_URL : le lineage est un no-op en test unitaire.
}


def _completed(args, returncode=0, stdout="", stderr=""):
    return subprocess.CompletedProcess(
        args=args, returncode=returncode, stdout=stdout, stderr=stderr
    )


@pytest.fixture
def rclone_calls(monkeypatch):
    """Capture les appels rclone.

    Deux ``lsf`` : ``--dirs-only`` renvoie 2 partitions ; le ``lsf`` de la partition
    renvoie 6 ``.gz``. ``copy`` réussit.
    """
    calls: list[list[str]] = []

    def fake_run(cmd, **_kwargs):
        calls.append(cmd)
        if "lsf" in cmd and "--dirs-only" in cmd:
            return _completed(cmd, stdout="updated_date=2019-07-12/\nupdated_date=2024-01-05/")
        if "lsf" in cmd:
            keys = "\n".join(f"part_{i:03d}.gz" for i in range(6))
            return _completed(cmd, stdout=keys)
        return _completed(cmd)  # copy

    monkeypatch.setenv("AWS_ACCESS_KEY_ID", _ENV["AWS_ACCESS_KEY_ID"])
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", _ENV["AWS_SECRET_ACCESS_KEY"])
    monkeypatch.setenv("BUCKET_HOST", _ENV["BUCKET_HOST"])
    monkeypatch.setenv("BUCKET_NAME", _ENV["BUCKET_NAME"])
    monkeypatch.delenv("OPENLINEAGE_URL", raising=False)
    monkeypatch.setattr(subprocess, "run", fake_run)
    return calls


def test_sync_bounded_to_sample_size(rclone_calls):
    result = raw_snapshot(
        build_asset_context(), RawSnapshotConfig(sample_size=2, entities=["works"])
    )
    # 2 fichiers demandés sur les 6 listés → metadata total_files == 2.
    assert result.metadata["total_files"].value == 2
    copy_calls = [c for c in rclone_calls if "copy" in c]
    assert len(copy_calls) == 1


def test_target_path_uses_raw_entity_partition_never_openalex(rclone_calls):
    raw_snapshot(build_asset_context(), RawSnapshotConfig(sample_size=1, entities=["authors"]))
    copy_cmd = next(c for c in rclone_calls if "copy" in c)
    # Cible = ceph:<bucket>/raw/authors/<partition la plus récente> — jamais « openalex ».
    target = copy_cmd[-1]
    assert target == "ceph:atlas-datalake-x/raw/authors/updated_date=2024-01-05"
    assert "openalex" not in target


def test_lists_partitions_then_gz(rclone_calls):
    raw_snapshot(build_asset_context(), RawSnapshotConfig(sample_size=1, entities=["works"]))
    # 1er lsf borné aux dossiers (partitions), pas de listing récursif global.
    dir_lsf = next(c for c in rclone_calls if "lsf" in c and "--dirs-only" in c)
    assert "--recursive" not in dir_lsf
    # 2e lsf filtre les .gz de la partition.
    gz_lsf = next(c for c in rclone_calls if "lsf" in c and "--dirs-only" not in c)
    assert "*.gz" in gz_lsf


def test_lineage_emitted_when_url_set(monkeypatch):
    """Quand OPENLINEAGE_URL est défini, START + COMPLETE sont émis vers Marquez."""
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "AK")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "SK")
    monkeypatch.setenv("BUCKET_HOST", "rgw.local")
    monkeypatch.setenv("BUCKET_NAME", "b")
    monkeypatch.setenv("OPENLINEAGE_URL", "http://marquez.local:5000")

    def fake_run(cmd, **_kwargs):
        if "lsf" in cmd and "--dirs-only" in cmd:
            return _completed(cmd, stdout="updated_date=2024-01-05/")
        if "lsf" in cmd:
            return _completed(cmd, stdout="part_000.gz")
        return _completed(cmd)

    monkeypatch.setattr(subprocess, "run", fake_run)

    events = []
    # Le sous-module est masqué par l'asset réexporté dans assets/__init__ :
    # on le récupère explicitement via importlib pour patcher OpenLineageClient.
    import importlib

    mod = importlib.import_module("citation_dagster.assets.raw_snapshot")

    class FakeClient:
        @classmethod
        def from_environment(cls):
            return cls()

        def emit(self, event):
            events.append(event)

    monkeypatch.setattr(mod, "OpenLineageClient", FakeClient)

    raw_snapshot(build_asset_context(), RawSnapshotConfig(sample_size=1, entities=["works"]))
    states = [e.eventType for e in events]
    assert mod.RunState.START in states
    assert mod.RunState.COMPLETE in states


def test_copy_failure_raises(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "AK")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "SK")
    monkeypatch.setenv("BUCKET_HOST", "rgw.local")
    monkeypatch.setenv("BUCKET_NAME", "b")
    monkeypatch.delenv("OPENLINEAGE_URL", raising=False)

    def fake_run(cmd, **_kwargs):
        if "lsf" in cmd and "--dirs-only" in cmd:
            return _completed(cmd, stdout="updated_date=2019-07-01/")
        if "lsf" in cmd:
            return _completed(cmd, stdout="part_000.gz")
        return _completed(cmd, returncode=1, stderr="boom")  # copy échoue

    monkeypatch.setattr(subprocess, "run", fake_run)
    with pytest.raises(Failure, match="rclone copy a échoué"):
        raw_snapshot(build_asset_context(), RawSnapshotConfig(sample_size=1, entities=["works"]))
