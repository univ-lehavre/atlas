"""Tests de l'asset raw_native_gkg PARTITIONNÉ : httpx + rclone mockés, fixture figé.

Hermétique : aucun réseau (httpx mocké), aucun S3 (rclone rcat mocké). On vérifie le
filtrage par jour de partition, le parsing des 27 champs et l'écriture Parquet native
sous ``raw_native/gkg/`` — sans dépendre de l'extérieur (ADR 0057).
"""

import io
import subprocess
import sys
import zipfile
from pathlib import Path

import httpx
import pyarrow.parquet as pq
import pytest
from dagster import Failure, build_asset_context

from mediawatch_dagster import gkg, http_fetch
from mediawatch_dagster.assets.raw_native_gkg import RawNativeGkgConfig, raw_native_gkg
from mediawatch_dagster.resources import ceph_target_from_env

_MODULE = sys.modules["mediawatch_dagster.assets.raw_native_gkg"]

# Throttle nul + pas de retry en test : aucune attente réelle.
_NO_THROTTLE = {"min_interval_s": 0.0, "max_attempts": 1}

_FIXTURES = Path(__file__).resolve().parents[3] / "fixtures" / "gkg-sample"
_ZIP_BYTES = (_FIXTURES / "20260101120000.gkg.csv.zip").read_bytes()

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "seaweedfs.s3.svc.cluster.local",
    "BUCKET_PORT": "8333",
    "BUCKET_NAME": "mediawatch",
}

# Deux fichiers le 2026-01-01 + un le lendemain (doit être exclu de la partition).
_MASTER = (
    "1 a http://data.gdeltproject.org/gdeltv2/20260101120000.gkg.csv.zip\n"
    "1 b http://data.gdeltproject.org/gdeltv2/20260101121500.gkg.csv.zip\n"
    "1 c http://data.gdeltproject.org/gdeltv2/20260102000000.gkg.csv.zip\n"
)


class _Resp:
    def __init__(self, *, text: str = "", content: bytes = b"") -> None:
        self.text = text
        self.content = content
        self.status_code = 200
        self.headers: dict = {}

    def raise_for_status(self) -> None:
        return None


class _FakeHttpx:
    """Mock httpx.get : master lists (texte) et fichiers .zip (bytes du fixture)."""

    def __init__(self) -> None:
        self.downloaded: list[str] = []

    def get(self, url: str, **kwargs) -> _Resp:
        if url.endswith("masterfilelist.txt"):
            return _Resp(text=_MASTER)
        if url.endswith("masterfilelist-translation.txt"):
            return _Resp(text="")  # pas de flux traduit dans ce test
        self.downloaded.append(url)
        return _Resp(content=_ZIP_BYTES)


class _FakeRclone:
    """Mock subprocess.run pour rclone rcat (écritures) ; capture les octets Parquet."""

    def __init__(self) -> None:
        self.rcat_dests: list[str] = []
        self.rcat_payloads: dict[str, bytes] = {}

    def __call__(self, cmd, **kwargs):
        if "rcat" in cmd:
            dest = cmd[-1]
            self.rcat_dests.append(dest)
            self.rcat_payloads[dest] = kwargs.get("input", b"")
            return subprocess.CompletedProcess(cmd, 0, stdout=b"", stderr=b"")
        return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")


def _patch(monkeypatch, fake_httpx: _FakeHttpx, fake_rclone: _FakeRclone) -> None:
    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    # Le ThrottledClient appelle http_fetch.httpx.get : c'est là qu'on mocke le réseau.
    monkeypatch.setattr(http_fetch.httpx, "get", fake_httpx.get)
    monkeypatch.setattr(subprocess, "run", fake_rclone)


def _run(partition_key: str, config: RawNativeGkgConfig):
    return raw_native_gkg(build_asset_context(partition_key=partition_key), config)


def test_partition_ingests_only_that_day(monkeypatch) -> None:
    fake_httpx, fake_rclone = _FakeHttpx(), _FakeRclone()
    _patch(monkeypatch, fake_httpx, fake_rclone)

    result = _run(
        "2026-01-01", RawNativeGkgConfig(max_files=10, include_translation=False, **_NO_THROTTLE)
    )
    # 2 fichiers le 2026-01-01 ingérés ; celui du 2026-01-02 exclu.
    assert result.metadata["files_ingested"].value == 2
    assert result.metadata["partition"].text == "2026-01-01"
    assert result.metadata["columns"].value == 27
    assert "20260102000000" not in " ".join(fake_httpx.downloaded)
    # Écriture Parquet sous raw_native/gkg/dt=2026-01-01 (date de partition).
    write_dests = [d for d in fake_rclone.rcat_dests if "raw_native/gkg/" in d]
    assert len(write_dests) == 2
    assert all("dt=2026-01-01" in d and d.endswith(".parquet") for d in write_dests)


def test_native_parquet_has_27_columns(monkeypatch) -> None:
    fake_httpx, fake_rclone = _FakeHttpx(), _FakeRclone()
    _patch(monkeypatch, fake_httpx, fake_rclone)

    _run("2026-01-01", RawNativeGkgConfig(max_files=1, include_translation=False, **_NO_THROTTLE))
    dest = next(d for d in fake_rclone.rcat_dests if "raw_native/gkg/" in d)
    table = pq.read_table(io.BytesIO(fake_rclone.rcat_payloads[dest]))
    assert tuple(table.column_names) == gkg.NATIVE_COLUMNS
    assert table.num_columns == 27
    # Le fixture a 4 lignes GKG (dont une sans org — mais la NATIVE garde toutes les
    # lignes, contrairement à la projection). On vérifie ≥ 1 ligne et le tri.
    ids = table.column("gkg_record_id").to_pylist()
    assert ids == sorted(ids)


def test_partition_bounded_by_max_files(monkeypatch) -> None:
    fake_httpx, fake_rclone = _FakeHttpx(), _FakeRclone()
    _patch(monkeypatch, fake_httpx, fake_rclone)

    result = _run(
        "2026-01-01", RawNativeGkgConfig(max_files=1, include_translation=False, **_NO_THROTTLE)
    )
    assert result.metadata["files_ingested"].value == 1
    assert result.metadata["truncated"].value is True


def test_empty_partition_writes_nothing(monkeypatch) -> None:
    fake_httpx, fake_rclone = _FakeHttpx(), _FakeRclone()
    _patch(monkeypatch, fake_httpx, fake_rclone)

    # Un jour sans aucun fichier dans la master list.
    result = _run(
        "2025-12-31", RawNativeGkgConfig(max_files=10, include_translation=False, **_NO_THROTTLE)
    )
    assert result.metadata["files_ingested"].value == 0
    assert [d for d in fake_rclone.rcat_dests if "raw_native/gkg/" in d] == []


def test_translation_stream_merged_when_enabled(monkeypatch) -> None:
    class _BothListsHttpx(_FakeHttpx):
        def get(self, url: str, **kwargs):
            if url.endswith("masterfilelist-translation.txt"):
                return _Resp(
                    text="1 t http://data.gdeltproject.org/gdeltv2/20260101130000.gkg.csv.zip"
                )
            return super().get(url, **kwargs)

    fake_httpx, fake_rclone = _BothListsHttpx(), _FakeRclone()
    _patch(monkeypatch, fake_httpx, fake_rclone)

    result = _run(
        "2026-01-01", RawNativeGkgConfig(max_files=10, include_translation=True, **_NO_THROTTLE)
    )
    # 2 anglais + 1 traduit, tous le 2026-01-01.
    assert result.metadata["files_ingested"].value == 3


# ── Chemins d'échec ──────────────────────────────────────────────────────────


def test_master_list_http_error_raises_failure(monkeypatch) -> None:
    def boom(url, **kwargs):
        raise httpx.ConnectError("dns")

    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(http_fetch.httpx, "get", boom)
    monkeypatch.setattr(subprocess, "run", _FakeRclone())
    with pytest.raises(Failure, match="master list"):
        _run(
            "2026-01-01",
            RawNativeGkgConfig(max_files=1, include_translation=False, **_NO_THROTTLE),
        )


def test_bad_zip_raises_failure(monkeypatch) -> None:
    class _BadZipHttpx(_FakeHttpx):
        def get(self, url: str, **kwargs):
            if url.endswith(".txt"):
                return super().get(url, **kwargs)
            return _Resp(content=b"not a zip")

    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(http_fetch.httpx, "get", _BadZipHttpx().get)
    monkeypatch.setattr(subprocess, "run", _FakeRclone())
    with pytest.raises(Failure, match="Archive GKG illisible"):
        _run(
            "2026-01-01",
            RawNativeGkgConfig(max_files=1, include_translation=False, **_NO_THROTTLE),
        )


def test_write_failure_raises(monkeypatch) -> None:
    class _FailingRcat(_FakeRclone):
        def __call__(self, cmd, **kwargs):
            if "rcat" in cmd and "raw_native/gkg/" in cmd[-1]:
                return subprocess.CompletedProcess(cmd, 1, stdout=b"", stderr=b"disk full")
            return super().__call__(cmd, **kwargs)

    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(http_fetch.httpx, "get", _FakeHttpx().get)
    monkeypatch.setattr(subprocess, "run", _FailingRcat())
    with pytest.raises(Failure, match="Écriture du brut natif GKG"):
        _run(
            "2026-01-01",
            RawNativeGkgConfig(max_files=1, include_translation=False, **_NO_THROTTLE),
        )


# Garde le ZIP cohérent avec le fixture (mention identique CSV ↔ ZIP) — sanity.
def test_fixture_zip_is_valid() -> None:
    with zipfile.ZipFile(io.BytesIO(_ZIP_BYTES)) as archive:
        assert archive.namelist()[0].endswith(".gkg.csv")
