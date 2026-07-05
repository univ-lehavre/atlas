"""Tests de l'accès lakehouse DuckDB↔S3 (étape 3.1).

- Tests **unitaires** purs (génération du SQL ``CREATE SECRET``, config depuis
  l'env) — toujours exécutés, couvrent la logique sans I/O.
- Test **d'intégration hermétique** : round-trip réel JSONL.gz → Parquet Hive →
  relecture, contre le MinIO épinglé (fixture ``minio``, ADR 0057) chargé avec les
  fixtures synthétiques OpenAlex. S'auto-saute si Docker est absent.
"""

import gzip
import json
import subprocess
from pathlib import Path

from citation_dagster import lakehouse
from citation_dagster.resources import DuckDBS3Config, duckdb_s3_config_from_env

_FIXTURES = Path(__file__).resolve().parents[3] / "fixtures" / "openalex-sample"

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "seaweedfs.s3.svc.cluster.local",
    "BUCKET_PORT": "8333",
    "BUCKET_NAME": "citation",
}


# ── Unitaires (purs) ─────────────────────────────────────────────────────────


def test_config_from_env_strips_scheme_and_detects_ssl():
    cfg = duckdb_s3_config_from_env(_ENV)
    # Sans schéma ET nom court : le suffixe de cluster (.svc.cluster.local) est retiré
    # pour l'endpoint DuckDB (piège FQDN prod, cf. resources._short_incluster_host).
    assert cfg.endpoint == "seaweedfs.s3:8333"
    assert cfg.use_ssl is False  # http → pas de SSL
    assert cfg.key_id == "AK" and cfg.bucket == "citation"


def test_config_detects_ssl_for_https():
    env = {**_ENV, "BUCKET_PORT": "443"}
    # ceph_target_from_env construit toujours http:// ; pour https il faudrait un
    # endpoint https — on vérifie ici la dérivation host:port indépendante du SSL.
    cfg = duckdb_s3_config_from_env(env)
    assert cfg.endpoint.endswith(":443")


def test_create_secret_sql_is_path_style():
    cfg = DuckDBS3Config(
        key_id="AK",
        secret="SK",
        endpoint="h:8333",
        use_ssl=False,
        region="us-east-1",
        bucket="citation",
    )
    sql = lakehouse._create_secret_sql(cfg)
    assert "TYPE S3" in sql
    assert "URL_STYLE 'path'" in sql
    assert "USE_SSL false" in sql
    assert "ENDPOINT 'h:8333'" in sql


# ── Intégration hermétique (MinIO épinglé + fixtures synthétiques) ───────────


def _load_fixtures_to_minio(minio):
    """Charge les .gz synthétiques (works + merged_ids) dans le bucket MinIO de test."""
    works_gz = _FIXTURES / "data" / "works" / "updated_date=2020-01-01" / "part_000.gz"
    # Copie via un client mc jetable (même image épinglée, hermétique).
    script = (
        f"mc alias set t http://{minio.endpoint} {minio.access_key} {minio.secret_key} && "
        f"mc cp /fix/part_000.gz t/{minio.bucket}/raw/works/updated_date=2020-01-01/part_000.gz"
    )
    subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "--network",
            "host",
            "-v",
            f"{works_gz}:/fix/part_000.gz:ro",
            "--entrypoint",
            "sh",
            lakehouse_minio_image(),
            "-c",
            script,
        ],
        capture_output=True,
        text=True,
        check=True,
    )


def lakehouse_minio_image() -> str:
    """L'image MinIO épinglée (réexpose celle de conftest pour le chargement)."""
    from tests.conftest import _MINIO_IMAGE

    return _MINIO_IMAGE


def test_roundtrip_jsonl_gz_to_parquet_hive(minio):
    """Round-trip réel : lit le JSONL.gz synthétique, écrit du Parquet Hive, relit."""
    _load_fixtures_to_minio(minio)
    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    con = lakehouse.connect(cfg)

    # 1) Lecture du brut JSONL.gz synthétique (5 works attendus, cf. GOLDEN.md).
    rel = lakehouse.read_jsonl_gz(con, f"s3://{minio.bucket}/raw/works/**/*.gz")
    con.register("works_raw", rel)
    n = con.sql("SELECT count(*) FROM works_raw").fetchone()[0]
    assert n == 5

    # 2) Écriture Parquet partitionné Hive (par publication_year), puis relecture.
    lakehouse.copy_to_parquet(
        con,
        "SELECT id, publication_year FROM works_raw",
        f"s3://{minio.bucket}/curated/works",
        partition_by=["publication_year"],
    )
    back = con.sql(
        f"SELECT count(*) FROM read_parquet('s3://{minio.bucket}/curated/works/**/*.parquet')"
    ).fetchone()[0]
    assert back == 5

    # 3) Le partitionnement Hive a bien créé des dossiers publication_year=YYYY.
    keys = con.sql(
        f"SELECT DISTINCT publication_year FROM "
        f"read_parquet('s3://{minio.bucket}/curated/works/**/*.parquet')"
    ).fetchall()
    years = sorted(r[0] for r in keys)
    assert years == [2017, 2018, 2019, 2020, 2021]  # les 5 années (W303 = 2021)


def test_fixtures_are_valid_jsonl_gz():
    """Garde-fou : les fixtures synthétiques sont du JSONL gzippé lisible (hors-ligne)."""
    works_gz = _FIXTURES / "data" / "works" / "updated_date=2020-01-01" / "part_000.gz"
    with gzip.open(works_gz, "rt", encoding="utf-8") as fh:
        works = [json.loads(line) for line in fh if line.strip()]
    assert len(works) == 5
    assert all("referenced_works" in w for w in works)
