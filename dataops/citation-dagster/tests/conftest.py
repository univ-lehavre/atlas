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
from pathlib import Path

import pytest

# Racine des fixtures synthétiques (works/authors/merged_ids), figées et commitées
# (ADR 0057). parents[3] depuis tests/conftest.py → dataops/citation-dagster/../.. →
# racine du dépôt.
FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures" / "openalex-sample"

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


# Mapping fixture local → clé S3 sous `raw/` (layout écrit par `raw_snapshot`).
_PART = "updated_date=2020-01-01/part_000.gz"
_RAW_FIXTURES = {
    f"data/works/{_PART}": f"raw/works/{_PART}",
    f"data/authors/{_PART}": f"raw/authors/{_PART}",
    "legacy-data/merged_ids/works/2022-07-15.gz": "raw/merged_ids/works/2022-07-15.gz",
}


def load_raw_fixtures(minio: "MinioHandle") -> None:
    """Charge works + authors + merged_ids synthétiques sous `raw/` du bucket MinIO.

    Reproduit le layout écrit par l'asset `raw_snapshot`
    (`raw/<entity>/updated_date=…/…gz`, `raw/merged_ids/works/…gz`) pour que les
    sources dbt (globs `raw_root/<entity>/**/*.gz`) matchent la réalité. Upload via
    un client `mc` jetable (même image épinglée, hermétique).
    """
    mounts: list[str] = []
    cmds: list[str] = [
        f"mc alias set t http://{minio.endpoint} {minio.access_key} {minio.secret_key}"
    ]
    for i, (local, key) in enumerate(_RAW_FIXTURES.items()):
        src = FIXTURES_DIR / local
        mounts += ["-v", f"{src}:/fix/{i}.gz:ro"]
        cmds.append(f"mc cp /fix/{i}.gz t/{minio.bucket}/{key}")
    subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "--network",
            "host",
            *mounts,
            "--entrypoint",
            "sh",
            _MINIO_IMAGE,
            "-c",
            " && ".join(cmds),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
