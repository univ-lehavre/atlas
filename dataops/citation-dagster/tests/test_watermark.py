"""Tests du watermark de date persistant (rclone cat/rcat mockés)."""

import json
import subprocess
from pathlib import Path

from citation_dagster import watermark


def _completed(args, returncode=0, stdout="", stderr=""):
    return subprocess.CompletedProcess(
        args=args, returncode=returncode, stdout=stdout, stderr=stderr
    )


def test_read_absent_returns_none(monkeypatch):
    """`rclone cat` d'un objet absent renvoie code 0 + sortie vide → None (bootstrap)."""
    monkeypatch.setattr(subprocess, "run", lambda cmd, **k: _completed(cmd, stdout=""))
    assert watermark.read_watermark("works", "bucket", Path("/tmp/x")) is None


def test_read_invalid_json_returns_none(monkeypatch):
    monkeypatch.setattr(subprocess, "run", lambda cmd, **k: _completed(cmd, stdout="not json"))
    assert watermark.read_watermark("works", "bucket", Path("/tmp/x")) is None


def test_read_existing_entity(monkeypatch):
    payload = json.dumps({"works": "2024-01-05", "authors": "2024-01-03"})
    monkeypatch.setattr(subprocess, "run", lambda cmd, **k: _completed(cmd, stdout=payload))
    assert watermark.read_watermark("works", "bucket", Path("/tmp/x")) == "2024-01-05"
    assert watermark.read_watermark("missing", "bucket", Path("/tmp/x")) is None


def test_write_merges_existing_keys(monkeypatch):
    """L'écriture met à jour une entité sans écraser l'autre (merge du JSON)."""
    written = {}

    def fake_run(cmd, **kwargs):
        if "cat" in cmd and "rcat" not in cmd:
            return _completed(cmd, stdout=json.dumps({"authors": "2024-01-03"}))
        if "rcat" in cmd:
            written["payload"] = kwargs.get("input", "")
            return _completed(cmd)
        return _completed(cmd)

    monkeypatch.setattr(subprocess, "run", fake_run)
    watermark.write_watermark("works", "2024-01-05", "bucket", Path("/tmp/x"))
    data = json.loads(written["payload"])
    assert data == {"authors": "2024-01-03", "works": "2024-01-05"}


def test_write_failure_raises(monkeypatch):
    def fake_run(cmd, **kwargs):
        if "cat" in cmd and "rcat" not in cmd:
            return _completed(cmd, stdout="")
        return _completed(cmd, returncode=1, stderr="disk full")  # rcat échoue

    monkeypatch.setattr(subprocess, "run", fake_run)
    try:
        watermark.write_watermark("works", "2024-01-05", "bucket", Path("/tmp/x"))
        raise AssertionError("devrait lever RuntimeError")
    except RuntimeError as exc:
        assert "watermark" in str(exc).lower()
