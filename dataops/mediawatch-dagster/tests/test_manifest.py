"""Tests du contrat manifest GLOBAL : fonctions pures + glue I/O (rclone/DuckDB mockés)."""

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


# ── latest_run_parts : dernier run par jour ──────────────────────────────────


def test_latest_run_parts_keeps_most_recent_run_by_modtime_per_day() -> None:
    # Le run retenu par jour est le plus RÉCENT (ModTime), pas le max lexical du run= (ADR 0101).
    # Jour 1 : run=AAA est lexicalement < run=ZZZ, mais écrit APRÈS → AAA doit gagner. Un test
    # qui échoue sur l'ancien max(run) lexical et passe ici = preuve du correctif.
    entries = [
        {
            "Path": "dt=2026-01-01/run=ZZZ/part.parquet",
            "Size": 10,
            "IsDir": False,
            "ModTime": "2026-01-01T10:00:00Z",
        },
        {
            "Path": "dt=2026-01-01/run=AAA/part.parquet",
            "Size": 20,
            "IsDir": False,
            "ModTime": "2026-01-01T12:00:00Z",
        },  # plus récent malgré run= lexical inférieur
        {
            "Path": "dt=2026-01-02/run=CCC/part.parquet",
            "Size": 30,
            "IsDir": False,
            "ModTime": "2026-01-02T09:00:00Z",
        },
        {
            "Path": "dt=2026-01-01/run=AAA",
            "Size": 0,
            "IsDir": True,
            "ModTime": "",
        },  # dossier ignoré
    ]
    kept = m.latest_run_parts(entries)
    # Jour 1 : run AAA gagne (ZZZ exclu, car plus ancien) ; jour 2 : run CCC.
    assert kept == {
        "marts/university_timeline/dt=2026-01-01/run=AAA/part.parquet": 20,
        "marts/university_timeline/dt=2026-01-02/run=CCC/part.parquet": 30,
    }


def test_latest_run_parts_breaks_modtime_ties_by_run_lexical() -> None:
    # Ex-æquo de ModTime → départage par run= lexical MAX (déterminisme, ADR 0057).
    entries = [
        {
            "Path": "dt=2026-01-01/run=AAA/part.parquet",
            "Size": 10,
            "IsDir": False,
            "ModTime": "2026-01-01T12:00:00Z",
        },
        {
            "Path": "dt=2026-01-01/run=BBB/part.parquet",
            "Size": 20,
            "IsDir": False,
            "ModTime": "2026-01-01T12:00:00Z",
        },
    ]
    assert m.latest_run_parts(entries) == {
        "marts/university_timeline/dt=2026-01-01/run=BBB/part.parquet": 20,
    }


def test_mart_root() -> None:
    assert m.mart_root("ceph", "mediawatch") == "ceph:mediawatch/marts/university_timeline"


def test_parse_hashsum_prefixes_keys() -> None:
    digest = "a" * 64
    out = f"{digest}  dt=2026-01-01/run=BBB/part.parquet"
    assert m.parse_hashsum(out, prefix="marts/university_timeline") == {
        "marts/university_timeline/dt=2026-01-01/run=BBB/part.parquet": digest
    }


def test_parse_hashsum_rejects_malformed_line() -> None:
    with pytest.raises(Failure, match="hashsum"):
        m.parse_hashsum("not-a-hash part.parquet")


def test_build_manifest_global_sorted_crosschecked() -> None:
    k1 = "marts/university_timeline/dt=2026-01-02/run=C/part.parquet"
    k2 = "marts/university_timeline/dt=2026-01-01/run=B/part.parquet"
    sizes = {k1: 30, k2: 20}
    shas = {k1: "c" * 64, k2: "b" * 64}
    man = m.build_manifest(sizes, shas, row_count=5, produced_at="2026-01-01T00:00:00+00:00")
    assert man["mart"] == "marts/university_timeline"
    assert man["row_count"] == 5
    # Parts triées par clé (déterminisme) → jour 1 avant jour 2.
    assert [p["key"] for p in man["parts"]] == [k2, k1]


def test_build_manifest_raises_on_empty() -> None:
    with pytest.raises(Failure, match="Aucune part"):
        m.build_manifest({}, {}, 0, "t")


def test_build_manifest_raises_on_mismatch() -> None:
    with pytest.raises(Failure, match="Désaccord"):
        m.build_manifest({"a": 1}, {"b": "c" * 64}, 1, "t")


# ── Glue I/O + asset complet (rclone + DuckDB mockés) ────────────────────────

_DIGEST = "d" * 64
_PART = "dt=2026-01-01/run=BBB/part.parquet"


class _FakeRclone:
    """Mock rclone : lsjson -R, hashsum -R, rcat."""

    def __init__(self) -> None:
        self.rcat_payload: str | None = None

    def __call__(self, cmd, **kwargs):
        if "lsjson" in cmd:
            out = json.dumps([{"Path": _PART, "Size": 128, "IsDir": False}])
            return subprocess.CompletedProcess(cmd, 0, stdout=out, stderr="")
        if "hashsum" in cmd:
            return subprocess.CompletedProcess(cmd, 0, stdout=f"{_DIGEST}  {_PART}", stderr="")
        if "rcat" in cmd:
            self.rcat_payload = kwargs.get("input")
            return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")
        return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")


class _FakeCon:
    def fetchone(self):
        return (3,)

    def sql(self, _query):
        return self


def test_timeline_manifest_writes_global_contract(monkeypatch) -> None:
    fake = _FakeRclone()
    monkeypatch.setattr(m, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(subprocess, "run", fake)
    monkeypatch.setattr(m.lakehouse, "connect", lambda cfg=None: _FakeCon())

    result = m.timeline_manifest(build_asset_context(partition_key="2026-01-01"))
    assert fake.rcat_payload is not None
    written = json.loads(fake.rcat_payload)
    assert written["schema_version"] == m.MANIFEST_SCHEMA_VERSION
    assert written["row_count"] == 3
    assert written["parts"][0]["key"] == f"marts/university_timeline/{_PART}"
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
        m._latest_sizes("ceph:mediawatch/marts/x", __import__("pathlib").Path("/tmp/c"))


def test_count_rows_empty_is_zero(monkeypatch) -> None:
    # Aucune part retenue → 0 (pas d'appel DuckDB).
    assert m._count_rows("mediawatch", []) == 0
