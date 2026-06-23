"""Tests du watermark de timestamp (rclone cat/rcat mocké, hermétique)."""

import subprocess
from pathlib import Path

import pytest
from dagster import Failure

from mediawatch_dagster import watermark


class _FakeRclone:
    """Mock de subprocess.run pour rclone cat/rcat."""

    def __init__(self, watermark_json: str = "", rcat_returncode: int = 0) -> None:
        self.watermark_json = watermark_json
        self.rcat_returncode = rcat_returncode
        self.rcat_payloads: list[str] = []

    def __call__(self, cmd, **kwargs):
        if "cat" in cmd:
            return subprocess.CompletedProcess(cmd, 0, stdout=self.watermark_json, stderr="")
        if "rcat" in cmd:
            self.rcat_payloads.append(kwargs.get("input", ""))
            return subprocess.CompletedProcess(cmd, self.rcat_returncode, stdout="", stderr="boom")
        return subprocess.CompletedProcess(cmd, 0, stdout="", stderr="")


def test_read_watermark_none_on_first_run(monkeypatch) -> None:
    monkeypatch.setattr(subprocess, "run", _FakeRclone(watermark_json=""))
    assert watermark.read_watermark("mediawatch", Path("/tmp/x")) is None


def test_read_watermark_returns_stored_timestamp(monkeypatch) -> None:
    monkeypatch.setattr(subprocess, "run", _FakeRclone(watermark_json='{"gkg": "20260101120000"}'))
    assert watermark.read_watermark("mediawatch", Path("/tmp/x")) == "20260101120000"


def test_read_watermark_tolerates_malformed_json(monkeypatch) -> None:
    monkeypatch.setattr(subprocess, "run", _FakeRclone(watermark_json="{not json"))
    assert watermark.read_watermark("mediawatch", Path("/tmp/x")) is None


def test_write_watermark_advances_key(monkeypatch) -> None:
    fake = _FakeRclone(watermark_json="{}")
    monkeypatch.setattr(subprocess, "run", fake)
    watermark.write_watermark("20260101123000", "mediawatch", Path("/tmp/x"))
    # Le payload rcat contient la nouvelle valeur, clé "gkg".
    assert '"gkg": "20260101123000"' in fake.rcat_payloads[-1]


def test_write_watermark_raises_on_rcat_failure(monkeypatch) -> None:
    monkeypatch.setattr(subprocess, "run", _FakeRclone(watermark_json="{}", rcat_returncode=1))
    with pytest.raises(Failure, match="watermark"):
        watermark.write_watermark("20260101123000", "mediawatch", Path("/tmp/x"))
