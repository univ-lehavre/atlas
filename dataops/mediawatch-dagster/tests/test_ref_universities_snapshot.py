"""Tests de l'asset ref_universities_snapshot : httpx + rclone mockés, hermétique."""

import gzip
import io
import json
import subprocess
import sys
import zipfile

import httpx
import pytest
from dagster import Failure, build_asset_context

from mediawatch_dagster.assets.ref_universities_snapshot import (
    RefUniversitiesConfig,
    ref_universities_snapshot,
)
from mediawatch_dagster.resources import ceph_target_from_env

_MODULE = sys.modules["mediawatch_dagster.assets.ref_universities_snapshot"]

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "seaweedfs.s3.svc.cluster.local",
    "BUCKET_PORT": "8333",
    "BUCKET_NAME": "mediawatch",
}

_RECORDS = [
    {
        "id": "https://ror.org/03vek6s52",
        "types": ["education"],
        "names": [{"value": "Harvard University", "types": ["ror_display"]}],
        "locations": [{"geonames_details": {"country_code": "US"}}],
    },
    {
        "id": "https://ror.org/01abc1234",
        "types": ["company"],
        "names": [{"value": "Acme Corp", "types": ["ror_display"]}],
    },
]


def _zip_with(member: str, records: list) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr(member, json.dumps(records))
    return buf.getvalue()


class _Resp:
    def __init__(self, content: bytes) -> None:
        self.content = content

    def raise_for_status(self) -> None:
        return None


class _FakeRclone:
    def __init__(self) -> None:
        self.rcat_payload: bytes | None = None

    def __call__(self, cmd, **kwargs):
        if "rcat" in cmd:
            self.rcat_payload = kwargs.get("input")
        return subprocess.CompletedProcess(cmd, 0, stdout=b"", stderr=b"")


def test_ingests_only_universities(monkeypatch) -> None:
    zip_bytes = _zip_with("v2.8-ror-data_schema_v2.json", _RECORDS)
    fake_rclone = _FakeRclone()
    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(_MODULE.httpx, "get", lambda url, **k: _Resp(zip_bytes))
    monkeypatch.setattr(subprocess, "run", fake_rclone)

    result = ref_universities_snapshot(
        build_asset_context(), RefUniversitiesConfig(dump_url="http://example/dump.zip")
    )
    # Seule l'université (Harvard) est ingérée ; Acme (company) exclue.
    assert result.metadata["universities"].value == 1
    written = fake_rclone.rcat_payload
    line = gzip.decompress(written).decode().strip()
    assert json.loads(line)["name"] == "Harvard University"


def test_missing_url_raises(monkeypatch) -> None:
    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    with pytest.raises(Failure, match="Aucune URL"):
        ref_universities_snapshot(build_asset_context(), RefUniversitiesConfig(dump_url=""))


def test_http_error_raises(monkeypatch) -> None:
    def boom(url, **k):
        raise httpx.ConnectError("dns")

    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(_MODULE.httpx, "get", boom)
    with pytest.raises(Failure, match="dump référentiel"):
        ref_universities_snapshot(
            build_asset_context(), RefUniversitiesConfig(dump_url="http://x/d.zip")
        )


def test_prefers_schema_v2_member(monkeypatch) -> None:
    # Une archive avec v1 ET v2 → on choisit le membre _schema_v2.json.
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("ror-data.json", json.dumps([]))  # v1 (vide)
        z.writestr("ror-data_schema_v2.json", json.dumps(_RECORDS))  # v2
    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(_MODULE.httpx, "get", lambda url, **k: _Resp(buf.getvalue()))
    monkeypatch.setattr(subprocess, "run", _FakeRclone())
    result = ref_universities_snapshot(
        build_asset_context(), RefUniversitiesConfig(dump_url="http://x/d.zip")
    )
    # Le membre v2 (non vide) est lu → 1 université (pas le v1 vide).
    assert result.metadata["universities"].value == 1
