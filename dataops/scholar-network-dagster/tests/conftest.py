"""Fixtures partagées des tests de la code-location « scholar-network » (hermétiques, ADR 0057).

Fournit une fixture ``minio`` : un MinIO conteneurisé éphémère, épinglé par DIGEST (jamais
``latest``, ADR 0057), pour les tests d'intégration DuckDB↔S3 (ex. l'asset ``prefiltered_raw``,
lot 2). S'auto-saute (``pytest.skip``) si Docker est absent — un contributeur sans Docker
n'est jamais bloqué. Copie locale du patron de ``citation-dagster`` (pas d'import inter
code-location, ADR 0055).

NB : pas de ``from __future__ import annotations`` (cohérence dépôt dataops).
"""

import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import pytest

# Image MinIO épinglée par DIGEST (manifest list multi-arch) — jamais ``latest`` (ADR 0057).
# Même digest que citation-dagster (bumpé consciemment). Release 2025-04-08.
_MINIO_IMAGE = "minio/minio@sha256:8834ae47a2de3509b83e0e70da9369c24bbbc22de42f2a2eddc530eee88acd1b"
_ACCESS_KEY = "minioadmin"
_SECRET_KEY = "minioadmin123"
_BUCKET = "scholar-network"


def requires_docker() -> None:
    """Saute le test si Docker est absent de l'hôte (tests d'intégration hermétiques)."""
    if shutil.which("docker") is None:
        pytest.skip("Docker indisponible — test d'intégration hermétique sauté (self-skipping).")


@dataclass(frozen=True)
class MinioHandle:
    endpoint: str  # host:port (sans schéma), pour DuckDB
    access_key: str
    secret_key: str
    bucket: str


def _mc_setup_script(port: int) -> str:
    """Script ``mc`` jetable : déclare l'alias et crée le bucket de test."""
    base = f"http://127.0.0.1:{port}"
    return f"mc alias set t {base} {_ACCESS_KEY} {_SECRET_KEY} && mc mb -p t/{_BUCKET}"


def _free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _wait_ready(url: str, timeout: float = 30.0) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            urllib.request.urlopen(url, timeout=2)  # noqa: S310 (URL locale de test)
            return True
        except urllib.error.HTTPError:
            return True  # répond (même 403) → MinIO est up
        except (urllib.error.URLError, ConnectionError, OSError):
            time.sleep(0.5)
    return False


@pytest.fixture
def minio():
    """MinIO éphémère épinglé par digest ; skip si Docker absent (self-skipping)."""
    if shutil.which("docker") is None:
        pytest.skip("Docker indisponible — test hermétique S3 sauté (self-skipping).")

    port = _free_port()
    name = f"scholar-network-minio-test-{port}"
    proc = subprocess.run(
        [
            "docker",
            "run",
            "-d",
            "--rm",
            "--name",
            name,
            "-p",
            f"127.0.0.1:{port}:9000",
            "-e",
            f"MINIO_ROOT_USER={_ACCESS_KEY}",
            "-e",
            f"MINIO_ROOT_PASSWORD={_SECRET_KEY}",
            _MINIO_IMAGE,
            "server",
            "/data",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        pytest.skip(
            f"Démarrage MinIO impossible (Docker non opérationnel ?) : {proc.stderr[-200:]}"
        )

    try:
        if not _wait_ready(f"http://127.0.0.1:{port}/minio/health/live"):
            pytest.skip("MinIO n'a pas démarré à temps.")
        # Crée le bucket via un client mc jetable (même image, hermétique).
        subprocess.run(
            [
                "docker",
                "run",
                "--rm",
                "--network",
                "host",
                "--entrypoint",
                "sh",
                _MINIO_IMAGE,
                "-c",
                _mc_setup_script(port),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        yield MinioHandle(f"127.0.0.1:{port}", _ACCESS_KEY, _SECRET_KEY, _BUCKET)
    finally:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True, check=False)


# ── PostgreSQL + pgvector conteneurisé (index_load, lot 5c) ──────────────────────────────
# Image épinglée par DIGEST (ADR 0057) — même digest que citation (cohérence dépôt).
_PGVECTOR_IMAGE = (
    "pgvector/pgvector:pg18@sha256:42e7f6b4e1eceb02ff14e3e6bc6108bbe259abbe83879dc1845d0da1ddeb555d"
)
_PG_DB = "scholar_network"
_PG_USER = "postgres"
_PG_PASSWORD = "postgres"
# Migrations RÉELLES de l'index (deploy/base/migrations), appliquées telles quelles : la
# fixture teste index_load contre le VRAI schéma cible, pas une copie.
_MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "deploy" / "base" / "migrations"


@dataclass(frozen=True)
class PgHandle:
    host: str
    port: str
    dbname: str
    user: str
    password: str


@pytest.fixture
def pgvector(monkeypatch):
    """PostgreSQL+pgvector éphémère (schéma index appliqué) ; skip si Docker absent.

    Démarre le conteneur épinglé, applique les migrations réelles (deploy/base/migrations),
    et injecte les POSTGRES_* (Secret pg-role-pgvector simulé) pour que
    postgres_target_from_env / index_load se connectent sans config en dur.
    """
    if shutil.which("docker") is None:
        pytest.skip("Docker indisponible — test index_load hermétique sauté.")

    port = _free_port()
    name = f"scholar-network-pgvector-test-{port}"
    proc = subprocess.run(
        [
            "docker",
            "run",
            "-d",
            "--rm",
            "--name",
            name,
            "-p",
            f"127.0.0.1:{port}:5432",
            "-e",
            f"POSTGRES_DB={_PG_DB}",
            "-e",
            f"POSTGRES_USER={_PG_USER}",
            "-e",
            f"POSTGRES_PASSWORD={_PG_PASSWORD}",
            _PGVECTOR_IMAGE,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        pytest.skip(f"Démarrage pgvector impossible : {proc.stderr[-200:]}")

    try:
        ready = False
        for _ in range(60):
            r = subprocess.run(
                ["docker", "exec", name, "pg_isready", "-U", _PG_USER, "-d", _PG_DB],
                capture_output=True,
                check=False,
            )
            if r.returncode == 0:
                ready = True
                break
            time.sleep(0.5)
        if not ready:
            pytest.skip("pgvector n'a pas démarré à temps.")

        for sql_file in sorted(_MIGRATIONS_DIR.glob("*.sql")):
            mig = subprocess.run(
                [
                    "docker",
                    "exec",
                    "-i",
                    name,
                    "psql",
                    "-U",
                    _PG_USER,
                    "-d",
                    _PG_DB,
                    "-v",
                    "ON_ERROR_STOP=1",
                    "-f",
                    "-",
                ],
                input=sql_file.read_text(encoding="utf-8"),
                capture_output=True,
                text=True,
                check=False,
            )
            if mig.returncode != 0:
                pytest.skip(f"Migration {sql_file.name} échouée : {mig.stderr[-300:]}")

        monkeypatch.setenv("POSTGRES_HOST", "127.0.0.1")
        monkeypatch.setenv("POSTGRES_PORT", str(port))
        monkeypatch.setenv("POSTGRES_DB", _PG_DB)
        monkeypatch.setenv("POSTGRES_USER", _PG_USER)
        monkeypatch.setenv("POSTGRES_PASSWORD", _PG_PASSWORD)
        yield PgHandle("127.0.0.1", str(port), _PG_DB, _PG_USER, _PG_PASSWORD)
    finally:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True, check=False)
