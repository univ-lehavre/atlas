"""Tests des ressources d'accès stockage (S3/Postgres) — helpers purs, hermétiques."""

import pytest

from scholar_network_dagster.resources import (
    CephTarget,
    MissingEnvError,
    ceph_target_from_env,
    duckdb_s3_config_from_env,
    postgres_target_from_env,
    render_rclone_config,
)
from scholar_network_dagster.resources import _short_incluster_host as short_host

_S3_ENV = {
    "AWS_ACCESS_KEY_ID": "key",
    "AWS_SECRET_ACCESS_KEY": "secret",
    "BUCKET_HOST": "rook-ceph-rgw-datalake.rook-ceph.svc",
    "BUCKET_PORT": "80",
    "BUCKET_NAME": "scholar-network-datalake-abc123",
}

_PG_ENV = {
    "POSTGRES_HOST": "pg-rw.postgres",
    "POSTGRES_DB": "pgvector",
    "POSTGRES_USER": "u",
    "POSTGRES_PASSWORD": "p",
}


def test_ceph_target_from_env_builds_endpoint_and_bucket():
    t = ceph_target_from_env(_S3_ENV)
    assert t.access_key_id == "key"
    assert t.endpoint == "http://rook-ceph-rgw-datalake.rook-ceph.svc:80"
    assert t.bucket == "scholar-network-datalake-abc123"  # jamais codé en dur


def test_ceph_target_default_port_80():
    env = {**_S3_ENV}
    del env["BUCKET_PORT"]
    assert ceph_target_from_env(env).endpoint.endswith(":80")


def test_missing_env_raises():
    with pytest.raises(MissingEnvError):
        ceph_target_from_env({"BUCKET_HOST": "h"})  # AWS_* absents


def test_postgres_target_from_env():
    t = postgres_target_from_env(_PG_ENV)
    assert t.host == "pg-rw.postgres"
    assert t.port == "5432"  # défaut
    assert t.dbname == "pgvector"


def test_postgres_target_missing_raises():
    with pytest.raises(MissingEnvError):
        postgres_target_from_env({"POSTGRES_HOST": "h"})  # DB/USER/PASSWORD absents


def test_render_rclone_config_has_both_remotes_and_pathstyle():
    cfg = render_rclone_config(CephTarget("k", "s", "http://ceph:80", "b"))
    assert "[openalex]" in cfg
    assert "[ceph]" in cfg
    assert "force_path_style = true" in cfg
    assert "no_check_bucket = true" in cfg


_SHORT = "rook-ceph-rgw-datalake.rook-ceph:80"


@pytest.mark.parametrize(
    "host_port,expected",
    [
        ("rook-ceph-rgw-datalake.rook-ceph.svc.cluster.local:80", _SHORT),
        ("rook-ceph-rgw-datalake.rook-ceph.svc:80", _SHORT),
        ("minio:9000", "minio:9000"),  # host externe inchangé
        ("host-sans-port", "host-sans-port"),  # pas de port → renvoyé tel quel
    ],
)
def test_short_incluster_host(host_port, expected):
    assert short_host(host_port) == expected


def test_duckdb_s3_config_http_is_no_ssl_and_short_host():
    cfg = duckdb_s3_config_from_env(_S3_ENV)
    assert cfg.use_ssl is False  # endpoint http:// → pas de SSL
    assert cfg.endpoint == "rook-ceph-rgw-datalake.rook-ceph:80"  # suffixe .svc retiré
    assert cfg.bucket == "scholar-network-datalake-abc123"


def test_duckdb_s3_config_https_is_ssl():
    env = {**_S3_ENV, "BUCKET_PORT": "443"}
    cfg = duckdb_s3_config_from_env(env)
    # endpoint http:// (ceph_target force http) → use_ssl False ; on vérifie le port propagé.
    assert cfg.endpoint.endswith(":443")
