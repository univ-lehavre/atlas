"""Tests de l'asset de manifest du mart collab (étape 3.4).

- Fonctions **pures** (sans I/O) : parsing lsjson/hashsum, construction du dict
  manifest, clés/partition. Portent l'essentiel de la couverture.
- Corps de l'asset piloté par un **FakeRclone** (subprocess mocké) + DuckDB count
  mocké : couvre l'orchestration sans Docker, et prouve les invariants critiques
  (`--download` sur hashsum, `rcat` du manifest en DERNIER).

Le vrai bout-en-bout (manifest écrit sur S3, sha256 sur octets réels, atomicité)
est prouvé par le smoke hermétique MinIO (test_dbt_models).
"""

import json
import subprocess

import pytest
from dagster import Failure, build_asset_context

import citation_dagster.assets.manifest as cm

# ── Fonctions pures ──────────────────────────────────────────────────────────


def test_partition_and_keys():
    assert cm.partition_str("2020-01", "run9") == "dt=2020-01/run=run9"
    assert cm.mart_prefix("ceph", "citation", "2020-01", "run9") == (
        "ceph:citation/marts/collab/dt=2020-01/run=run9"
    )
    assert cm.part_key("2020-01", "run9", "part.parquet") == (
        "marts/collab/dt=2020-01/run=run9/part.parquet"
    )


def test_parse_lsjson_sizes_skips_dirs():
    stdout = json.dumps(
        [
            {"Name": "part.parquet", "Size": 1006, "IsDir": False},
            {"Name": "sub", "Size": 0, "IsDir": True},
        ]
    )
    assert cm.parse_lsjson_sizes(stdout) == {"part.parquet": 1006}


def test_parse_lsjson_sizes_empty():
    assert cm.parse_lsjson_sizes("") == {}
    assert cm.parse_lsjson_sizes("[]") == {}


def test_parse_hashsum_ok():
    h = "a" * 64
    # Lignes vides intercalées (tolérées) : sortie rclone avec retours à la ligne.
    stdout = f"{h}  part.parquet\n\n{'b' * 64}  part_001.parquet\n"
    assert cm.parse_hashsum(stdout) == {"part.parquet": h, "part_001.parquet": "b" * 64}


def test_parse_hashsum_rejects_malformed():
    with pytest.raises(Failure):
        cm.parse_hashsum("not-a-hash  part.parquet")
    with pytest.raises(Failure):
        cm.parse_hashsum("deadbeef")  # une seule colonne


def test_build_manifest_shape_and_sorting():
    sizes = {"b.parquet": 20, "a.parquet": 10}
    shas = {"a.parquet": "a" * 64, "b.parquet": "b" * 64}
    man = cm.build_manifest("2020-01", "r1", 7, sizes, shas, "2026-06-11T00:00:00+00:00")
    assert man["partition"] == "dt=2020-01/run=r1"
    assert man["schema_version"] == cm.MANIFEST_SCHEMA_VERSION == 1
    assert man["row_count"] == 7
    assert man["produced_at"] == "2026-06-11T00:00:00+00:00"
    # Parts triées par clé (déterminisme), clés relatives au bucket.
    assert [p["key"] for p in man["parts"]] == [
        "marts/collab/dt=2020-01/run=r1/a.parquet",
        "marts/collab/dt=2020-01/run=r1/b.parquet",
    ]
    assert man["parts"][0]["sha256"] == "a" * 64
    assert man["parts"][0]["bytes"] == 10


def test_build_manifest_raises_on_empty_parts():
    with pytest.raises(Failure):
        cm.build_manifest("2020-01", "r1", 0, {}, {}, "t")


def test_build_manifest_raises_on_keyset_mismatch():
    with pytest.raises(Failure):
        cm.build_manifest("2020-01", "r1", 1, {"a.parquet": 10}, {"b.parquet": "a" * 64}, "t")


# ── Corps de l'asset piloté par un FakeRclone ────────────────────────────────

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "rgw.local",
    "BUCKET_NAME": "citation",
}
_SHA = "a0509cedeedaf17fa9de31fc51564a9ee804344ce6cd38097dc2ddc7742ccc1c"


def _completed(args, returncode=0, stdout="", stderr=""):
    return subprocess.CompletedProcess(
        args=args, returncode=returncode, stdout=stdout, stderr=stderr
    )


class FakeRclone:
    """Mock de subprocess.run pour rclone : lsjson / hashsum / rcat."""

    def __init__(self, lsjson=None, hashsum=None):
        self.calls: list[list[str]] = []
        self.rcat_payloads: list[str] = []
        self._lsjson = (
            lsjson
            if lsjson is not None
            else json.dumps([{"Name": "part.parquet", "Size": 1006, "IsDir": False}])
        )
        self._hashsum = hashsum if hashsum is not None else f"{_SHA}  part.parquet\n"

    def __call__(self, cmd, **kwargs):
        self.calls.append(cmd)
        if "lsjson" in cmd:
            return _completed(cmd, stdout=self._lsjson)
        if "hashsum" in cmd:
            return _completed(cmd, stdout=self._hashsum)
        if "rcat" in cmd:
            self.rcat_payloads.append(kwargs.get("input", ""))
            return _completed(cmd)
        return _completed(cmd)


@pytest.fixture
def env(monkeypatch):
    for k, v in _ENV.items():
        monkeypatch.setenv(k, v)
    monkeypatch.delenv("OPENLINEAGE_URL", raising=False)
    return monkeypatch


def test_asset_body_builds_and_writes_manifest_last(env, monkeypatch):
    fake = FakeRclone()
    monkeypatch.setattr(subprocess, "run", fake)
    # DuckDB count mocké (pas d'I/O S3 réelle).
    monkeypatch.setattr(cm, "_count_rows", lambda bucket, dt, run_id: 1)

    res = collab_manifest_invoke()
    assert res.metadata["row_count"].value == 1
    assert res.metadata["parts"].value == 1
    assert res.metadata["schema_version"].value == 1

    # Invariant 1 : hashsum est appelé AVEC --download (sinon « hash type not supported »).
    hashsum_calls = [c for c in fake.calls if "hashsum" in c]
    assert hashsum_calls and "--download" in hashsum_calls[0]
    assert "--include" in hashsum_calls[0] and "*.parquet" in hashsum_calls[0]

    # Invariant 2 : le rcat du manifest est la DERNIÈRE commande rclone (sentinelle).
    assert "rcat" in fake.calls[-1]
    assert fake.calls[-1][-1].endswith("/manifest.json")

    # Le payload écrit est le manifest JSON compact attendu.
    assert len(fake.rcat_payloads) == 1
    man = json.loads(fake.rcat_payloads[0])
    assert man["schema_version"] == 1
    assert man["row_count"] == 1
    assert man["parts"][0]["sha256"] == _SHA
    assert man["parts"][0]["key"].endswith("/part.parquet")


def test_asset_body_fails_on_empty_mart(env, monkeypatch):
    fake = FakeRclone(lsjson="[]", hashsum="")
    monkeypatch.setattr(subprocess, "run", fake)
    monkeypatch.setattr(cm, "_count_rows", lambda bucket, dt, run_id: 0)
    with pytest.raises(Failure):
        collab_manifest_invoke()
    # Aucun manifest écrit si le mart est vide (pas de sentinelle de complétude).
    assert fake.rcat_payloads == []


def collab_manifest_invoke():
    """Invoque l'asset avec un run_id fixe (build_asset_context → run_id 'EPHEMERAL')."""
    return cm.collab_manifest(build_asset_context())
