"""Helper de test : un MinIO conteneurisé, épinglé par digest (ADR 0057).

Démarre un MinIO **hermétique** pour les tests d'intégration DuckDB↔S3 : l'image
est référencée **par digest** (jamais par tag mobile), donc le test est
reproductible dans le temps. Le conteneur est éphémère (supprimé en fin de test).

S'auto-saute (``pytest.skip``) si Docker n'est pas disponible — un contributeur
sans Docker n'est pas bloqué (cf. tests *self-skipping* du dépôt). Les tests qui
en dépendent restent donc hors du chemin de test par défaut quand Docker manque.

Usage (pytest) ::

    def test_x(minio):
        # minio.endpoint, minio.access_key, minio.secret_key, minio.bucket
        ...
"""

import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request
from dataclasses import dataclass

import pytest

# Image MinIO épinglée par DIGEST (manifest list multi-arch) — jamais ``latest``.
# Bumpée consciemment (ADR 0057). Release 2025-04-08.
_MINIO_IMAGE = "minio/minio@sha256:8834ae47a2de3509b83e0e70da9369c24bbbc22de42f2a2eddc530eee88acd1b"
_ACCESS_KEY = "minioadmin"
_SECRET_KEY = "minioadmin123"
_BUCKET = "citation"


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
    """MinIO éphémère épinglé par digest ; skip si Docker absent."""
    if shutil.which("docker") is None:
        pytest.skip("Docker indisponible — test hermétique S3 sauté (self-skipping).")

    port = _free_port()
    name = f"citation-minio-test-{port}"
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
