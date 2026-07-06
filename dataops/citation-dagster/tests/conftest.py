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
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import pytest

# `drift_draft` vit à côté de ce conftest ; on garantit que son dossier est sur
# `sys.path` (selon le rootdir pytest, il ne l'est pas toujours) avant l'import.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from drift_draft import write_draft  # noqa: E402


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Capture un brouillon de drift au point d'échec (ADR 0080, volet a).

    *Wrapper* du hook qui produit le rapport de chaque phase d'un test : on laisse
    pytest construire le ``report`` (``yield``), puis on l'observe **sans le
    modifier**. On n'agit qu'à la phase ``call`` (l'exécution du test, là où vit
    l'erreur réelle) et uniquement sur un **échec** (``report.failed``) — jamais
    sur un *skip* (le *self-skip* sans Docker est un état assumé, ADR 0057, pas un
    drift). Le brouillon capture le message à chaud ; le verdict du test est
    inchangé. Un *hook* d'observation, rien de plus.
    """
    outcome = yield
    report = outcome.get_result()
    if report.when != "call" or not report.failed:
        return
    config = item.session.config
    discriminator = str(config.workerinput["workerid"]) if hasattr(config, "workerinput") else ""
    write_draft(
        source="pytest:citation-dagster",
        symptome=report.longreprtext or f"{item.nodeid} : échec sans détail.",
        campagne=item.nodeid,
        discriminator=discriminator,
    )


# Racine des fixtures synthétiques : le MART EUNICoast (Parquet), figé et commité
# (ADR 0057, ADR 0105). parents[3] depuis tests/conftest.py → dataops/citation-dagster/../..
# → racine du dépôt.
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


def requires_rclone() -> None:
    """Saute le test si le binaire ``rclone`` est absent de l'hôte.

    ``rclone`` n'est PAS une dépendance pip : il vit dans l'image (Dockerfile), pas
    forcément sur l'hôte de CI ni la machine d'un contributeur. Les tests qui
    invoquent ``rclone`` directement (manifest 3.4) s'auto-sautent alors — la logique
    de l'asset reste couverte par les tests FakeRclone (rclone mocké).
    """
    if shutil.which("rclone") is None:
        pytest.skip("rclone indisponible sur l'hôte — test sauté (self-skipping).")


# Mapping fixture local → clé S3 : le MART EUNICoast Parquet (déjà filtré au périmètre,
# ADR 0105), sous `mart_eunicoast/run=fixture/` (layout écrit par l'asset `mart_eunicoast`).
# Le test dbt passe `mart_root` = `s3://<bucket>/mart_eunicoast` → la source `citation_raw.works`
# résout `read_parquet(mart_root/run=*/*.parquet)`.
_RAW_FIXTURES = {
    "data/mart_eunicoast/run=fixture/part_000.parquet": (
        "mart_eunicoast/run=fixture/part_000.parquet"
    ),
}


def load_raw_fixtures(minio: "MinioHandle") -> None:
    """Charge le MART EUNICoast synthétique (Parquet) dans le bucket MinIO.

    Reproduit le layout écrit par l'asset `mart_eunicoast` (`mart_eunicoast/run=<id>/*.parquet`)
    pour que la source dbt (glob `mart_root/run=*/*.parquet`) matche la réalité. Upload via
    un client `mc` jetable (même image épinglée, hermétique).
    """
    mounts: list[str] = []
    cmds: list[str] = [
        f"mc alias set t http://{minio.endpoint} {minio.access_key} {minio.secret_key}"
    ]
    for i, (local, key) in enumerate(_RAW_FIXTURES.items()):
        src = FIXTURES_DIR / local
        mounts += ["-v", f"{src}:/fix/{i}.parquet:ro"]
        cmds.append(f"mc cp /fix/{i}.parquet t/{minio.bucket}/{key}")
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


@pytest.fixture(scope="session")
def embedding_model():
    """Télécharge le modèle d'embedding (révision figée + sha256) dans le cache
    par défaut, une fois par session. Skip si le réseau HuggingFace est
    indisponible (le modèle n'est pas versionné — cf. scripts/fetch_model.py)."""
    import urllib.error

    from citation_dagster import embedding

    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
    import fetch_model  # noqa: E402

    dest = embedding.model_dir()
    # En CI, le modèle est pré-téléchargé par une étape dédiée (cache + fetch_model) :
    # fetch() ci-dessous est alors un no-op (fichiers déjà présents et valides). Hors
    # CI sans réseau, on skip proprement. fetch_model lève SystemExit sur sha256
    # mismatch (BaseException, PAS Exception) : on l'attrape explicitement pour skip
    # au lieu de faire crasher pytest.
    try:
        fetch_model.fetch(str(dest))
    except (urllib.error.URLError, OSError, SystemExit) as exc:  # pragma: no cover
        pytest.skip(f"modèle d'embedding indisponible (réseau ?) : {exc}")
    return dest


# Image PostgreSQL+pgvector épinglée par DIGEST (ADR 0057) — même digest que le test
# d'intégration TS (packages/citation/src/pg/integration.test.ts) pour la cohérence.
_PGVECTOR_IMAGE = (
    "pgvector/pgvector:pg18@sha256:42e7f6b4e1eceb02ff14e3e6bc6108bbe259abbe83879dc1845d0da1ddeb555d"
)
_PG_DB = "citation"
_PG_USER = "postgres"
_PG_PASSWORD = "postgres"
# Migrations réelles de l'index (schéma researchers FTS + pgvector), appliquées telles
# quelles : la fixture teste l'asset contre le VRAI schéma cible, pas une copie.
_MIGRATIONS_DIR = Path(__file__).resolve().parents[3] / "packages" / "citation" / "migrations"


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

    Démarre le conteneur épinglé, applique les migrations 0001/0002 réelles, et injecte
    les POSTGRES_* dans l'environnement (Secret pg-role-pgvector simulé) pour que
    postgres_target_from_env / l'asset index_load se connectent sans config en dur.
    """
    if shutil.which("docker") is None:
        pytest.skip("Docker indisponible — test index_load hermétique sauté.")

    port = _free_port()
    name = f"citation-pgvector-test-{port}"
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
        # Attente readiness via pg_isready dans le conteneur.
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

        # Applique les migrations réelles (ordre lexical 0001, 0002).
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

        # Injecte les POSTGRES_* (Secret pg-role-pgvector simulé).
        monkeypatch.setenv("POSTGRES_HOST", "127.0.0.1")
        monkeypatch.setenv("POSTGRES_PORT", str(port))
        monkeypatch.setenv("POSTGRES_DB", _PG_DB)
        monkeypatch.setenv("POSTGRES_USER", _PG_USER)
        monkeypatch.setenv("POSTGRES_PASSWORD", _PG_PASSWORD)
        yield PgHandle("127.0.0.1", str(port), _PG_DB, _PG_USER, _PG_PASSWORD)
    finally:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True, check=False)
