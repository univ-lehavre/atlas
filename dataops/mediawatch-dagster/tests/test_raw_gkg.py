"""Tests de l'asset raw_gkg : httpx + rclone mockés, contre le fixture figé.

Hermétique : aucun réseau (httpx mocké), aucun S3 (rclone rcat mocké). On vérifie
la sélection incrémentale, la projection, l'écriture lakehouse et l'avancée du
watermark — sans dépendre de l'extérieur (ADR 0057).
"""

import subprocess
import sys
from pathlib import Path

import httpx
import pytest
from dagster import Failure, build_asset_context

from mediawatch_dagster.assets.raw_gkg import RawGkgConfig, raw_gkg
from mediawatch_dagster.resources import ceph_target_from_env

# Module réel (et non l'asset re-exporté sous le même nom dans assets/__init__) :
# c'est lui qu'on patche pour ceph_target_from_env (idiome partagé avec citation).
_MODULE = sys.modules["mediawatch_dagster.assets.raw_gkg"]

_FIXTURES = Path(__file__).resolve().parents[3] / "fixtures" / "gkg-sample"
_ZIP_BYTES = (_FIXTURES / "20260101120000.gkg.csv.zip").read_bytes()

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "seaweedfs.s3.svc.cluster.local",
    "BUCKET_PORT": "8333",
    "BUCKET_NAME": "mediawatch",
}

_MASTER = (
    "1 a http://data.gdeltproject.org/gdeltv2/20260101120000.gkg.csv.zip\n"
    "1 b http://data.gdeltproject.org/gdeltv2/20260101121500.gkg.csv.zip\n"
)


class _Resp:
    def __init__(self, *, text: str = "", content: bytes = b"") -> None:
        self.text = text
        self.content = content

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
    """Mock subprocess.run pour rclone : cat (watermark) + rcat (écritures)."""

    def __init__(self, watermark_json: str = "") -> None:
        self.watermark_json = watermark_json
        self.rcat_dests: list[str] = []

    def __call__(self, cmd, **kwargs):
        if "cat" in cmd:
            return subprocess.CompletedProcess(cmd, 0, stdout=self.watermark_json, stderr="")
        if "rcat" in cmd:
            self.rcat_dests.append(cmd[-1])  # dernière arg = destination
            return subprocess.CompletedProcess(cmd, 0, stdout=b"", stderr=b"")
        return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")


def _patch(monkeypatch, fake_httpx: _FakeHttpx, fake_rclone: _FakeRclone) -> None:
    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(_MODULE.httpx, "get", fake_httpx.get)
    monkeypatch.setattr(subprocess, "run", fake_rclone)


def _run(config: RawGkgConfig):
    return raw_gkg(build_asset_context(), config)


def test_bootstrap_ingests_oldest_bounded(monkeypatch) -> None:
    # Premier run (watermark vide) : ingère le plus ancien fichier, borné à 1.
    fake_httpx, fake_rclone = _FakeHttpx(), _FakeRclone(watermark_json="")
    _patch(monkeypatch, fake_httpx, fake_rclone)

    result = _run(RawGkgConfig(max_files=1, include_translation=False))
    assert result.metadata["files_ingested"].value == 1
    # 1 fichier (20260101120000) → 4 mentions (GOLDEN : doc4 sans org ignoré, Harvard dédup).
    assert result.metadata["mentions_written"].value == 4
    assert result.metadata["watermark"].text == "20260101120000"
    assert result.metadata["truncated"].value is True
    # Écriture sous raw/gkg/dt=2026-01-01/run=.../20260101120000.jsonl.gz.
    write_dests = [d for d in fake_rclone.rcat_dests if "raw/gkg/" in d]
    assert len(write_dests) == 1
    assert "dt=2026-01-01" in write_dests[0]
    assert write_dests[0].endswith("20260101120000.jsonl.gz")


def test_translation_stream_merged_when_enabled(monkeypatch) -> None:
    # include_translation=True : la master list traduite est fusionnée (multilingue
    # natif, ADR 0064). Ici elle apporte un fichier 15 min supplémentaire plus récent.
    class _BothListsHttpx(_FakeHttpx):
        def get(self, url: str, **kwargs):
            if url.endswith("masterfilelist-translation.txt"):
                return _Resp(
                    text="1 t http://data.gdeltproject.org/gdeltv2/20260101123000.gkg.csv.zip"
                )
            return super().get(url, **kwargs)

    fake_httpx, fake_rclone = (
        _BothListsHttpx(),
        _FakeRclone(watermark_json='{"gkg": "20260101121500"}'),
    )
    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(_MODULE.httpx, "get", fake_httpx.get)
    monkeypatch.setattr(subprocess, "run", fake_rclone)

    result = raw_gkg(build_asset_context(), RawGkgConfig(max_files=10, include_translation=True))
    # Seul le fichier traduit (20260101123000) est postérieur au watermark.
    assert result.metadata["files_ingested"].value == 1
    assert result.metadata["watermark"].text == "20260101123000"


def test_incremental_skips_already_ingested(monkeypatch) -> None:
    fake_httpx = _FakeHttpx()
    fake_rclone = _FakeRclone(watermark_json='{"gkg": "20260101120000"}')
    _patch(monkeypatch, fake_httpx, fake_rclone)

    result = _run(RawGkgConfig(max_files=10, include_translation=False))
    # Seul 20260101121500 est postérieur au watermark.
    assert result.metadata["files_ingested"].value == 1
    assert result.metadata["watermark"].text == "20260101121500"
    assert result.metadata["truncated"].value is False
    assert fake_httpx.downloaded == [
        "http://data.gdeltproject.org/gdeltv2/20260101121500.gkg.csv.zip"
    ]


def test_nothing_fresh_keeps_watermark(monkeypatch) -> None:
    fake_httpx = _FakeHttpx()
    fake_rclone = _FakeRclone(watermark_json='{"gkg": "20260101121500"}')
    _patch(monkeypatch, fake_httpx, fake_rclone)

    result = _run(RawGkgConfig(max_files=10, include_translation=False))
    assert result.metadata["files_ingested"].value == 0
    # Aucune écriture raw/gkg ; watermark inchangé (aucun rcat de watermark non plus).
    assert [d for d in fake_rclone.rcat_dests if "raw/gkg/" in d] == []


# ── Chemins d'échec (Failure remonté, watermark non avancé) ──────────────────


def test_master_list_http_error_raises_failure(monkeypatch) -> None:
    def boom(url, **kwargs):
        raise httpx.ConnectError("dns")

    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(_MODULE.httpx, "get", boom)
    monkeypatch.setattr(subprocess, "run", _FakeRclone(watermark_json=""))
    with pytest.raises(Failure, match="master list"):
        _run(RawGkgConfig(max_files=1, include_translation=False))


def test_bad_zip_raises_failure(monkeypatch) -> None:
    class _BadZipHttpx(_FakeHttpx):
        def get(self, url: str, **kwargs):
            if url.endswith(".txt"):
                return super().get(url, **kwargs)
            return _Resp(content=b"not a zip")

    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(_MODULE.httpx, "get", _BadZipHttpx().get)
    monkeypatch.setattr(subprocess, "run", _FakeRclone(watermark_json=""))
    with pytest.raises(Failure, match="Archive GKG illisible"):
        _run(RawGkgConfig(max_files=1, include_translation=False))


def test_write_failure_raises(monkeypatch) -> None:
    class _FailingRcat(_FakeRclone):
        def __call__(self, cmd, **kwargs):
            if "rcat" in cmd and "raw/gkg/" in cmd[-1]:
                return subprocess.CompletedProcess(cmd, 1, stdout=b"", stderr=b"disk full")
            return super().__call__(cmd, **kwargs)

    monkeypatch.setattr(_MODULE, "ceph_target_from_env", lambda: ceph_target_from_env(_ENV))
    monkeypatch.setattr(_MODULE.httpx, "get", _FakeHttpx().get)
    monkeypatch.setattr(subprocess, "run", _FailingRcat(watermark_json=""))
    with pytest.raises(Failure, match="Écriture du brut GKG"):
        _run(RawGkgConfig(max_files=1, include_translation=False))
