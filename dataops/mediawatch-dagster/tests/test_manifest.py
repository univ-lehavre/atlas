"""Tests du contrat manifest : fonctions pures + glue I/O (rclone/DuckDB mockés)."""

import json
import subprocess

import pytest
from dagster import Failure, build_asset_context

from mediawatch_dagster.assets import manifest as m
from mediawatch_dagster.resources import ceph_target_from_env

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "seaweedfs.s3.svc.cluster.local",
    "BUCKET_PORT": "8333",
    "BUCKET_NAME": "mediawatch",
}


def test_partition_str_and_keys() -> None:
    assert m.partition_str("2026-01", "run1") == "dt=2026-01/run=run1"
    assert m.part_key("2026-01", "run1", "part.parquet") == (
        "marts/university_timeline/dt=2026-01/run=run1/part.parquet"
    )
    assert m.mart_prefix("ceph", "mediawatch", "2026-01", "run1") == (
        "ceph:mediawatch/marts/university_timeline/dt=2026-01/run=run1"
    )


def test_parse_lsjson_sizes_ignores_dirs() -> None:
    stdout = '[{"Name":"part.parquet","Size":42,"IsDir":false},{"Name":"d","Size":0,"IsDir":true}]'
    assert m.parse_lsjson_sizes(stdout) == {"part.parquet": 42}


def test_parse_hashsum_parses_lines() -> None:
    digest = "a" * 64
    assert m.parse_hashsum(f"{digest}  part.parquet") == {"part.parquet": digest}


def test_parse_hashsum_rejects_malformed_line() -> None:
    with pytest.raises(Failure, match="hashsum"):
        m.parse_hashsum("not-a-hash part.parquet")


def test_build_manifest_sorted_and_crosschecked() -> None:
    sizes = {"b.parquet": 2, "a.parquet": 1}
    shas = {"a.parquet": "a" * 64, "b.parquet": "b" * 64}
    man = m.build_manifest("2026-01", "run1", 5, sizes, shas, "2026-01-01T00:00:00+00:00")
    assert man["schema_version"] == m.MANIFEST_SCHEMA_VERSION
    assert man["row_count"] == 5
    assert man["partition"] == "dt=2026-01/run=run1"
    # Parts triées par clé (déterminisme).
    assert [p["key"].split("/")[-1] for p in man["parts"]] == ["a.parquet", "b.parquet"]


def test_build_manifest_raises_on_empty_parts() -> None:
    with pytest.raises(Failure, match="Aucune part"):
        m.build_manifest("2026-01", "run1", 0, {}, {}, "t")


def test_build_manifest_raises_on_lsjson_hashsum_mismatch() -> None:
    with pytest.raises(Failure, match="Désaccord"):
        m.build_manifest("2026-01", "run1", 1, {"a": 1}, {"b": "c" * 64}, "t")


# ── Glue I/O + asset complet (rclone + DuckDB mockés) ────────────────────────

_DIGEST = "d" * 64


class _FakeRclone:
    """Mock subprocess.run pour rclone : lsjson, hashsum, rcat."""

    def __init__(self) -> None:
        self.rcat_payload: str | None = None

    def __call__(self, cmd, **kwargs):
        if "lsjson" in cmd:
            out = json.dumps([{"Name": "part.parquet", "Size": 128, "IsDir": False}])
            return subprocess.CompletedProcess(cmd, 0, stdout=out, stderr="")
        if "hashsum" in cmd:
            return subprocess.CompletedProcess(cmd, 0, stdout=f"{_DIGEST}  part.parquet", stderr="")
        if "rcat" in cmd:
            self.rcat_payload = kwargs.get("input")
            return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")
        return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")


class _FakeCon:
    def fetchone(self):
        return (3,)

    def sql(self, _query):
        return self


def test_timeline_manifest_writes_contract(monkeypatch) -> None:
    fake = _FakeRclone()
    monkeypatch.setattr(m, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(subprocess, "run", fake)
    monkeypatch.setattr(m.lakehouse, "connect", lambda cfg=None: _FakeCon())

    result = m.timeline_manifest(build_asset_context())
    # Le manifest a bien été écrit (rcat) avec le contrat attendu.
    assert fake.rcat_payload is not None
    written = json.loads(fake.rcat_payload)
    assert written["schema_version"] == m.MANIFEST_SCHEMA_VERSION
    assert written["row_count"] == 3
    assert written["parts"][0]["sha256"] == _DIGEST
    assert result.metadata["row_count"].value == 3


def test_lsjson_failure_raises(monkeypatch) -> None:
    class _Boom(_FakeRclone):
        def __call__(self, cmd, **kwargs):
            if "lsjson" in cmd:
                return subprocess.CompletedProcess(cmd, 1, stdout="", stderr="nope")
            return super().__call__(cmd, **kwargs)

    monkeypatch.setattr(subprocess, "run", _Boom())
    with pytest.raises(Failure, match="lsjson"):
        m._lsjson_sizes("ceph:mediawatch/marts/x", __import__("pathlib").Path("/tmp/c"))
