"""Tests de la configuration des accès stockage « pageviews » (rclone.conf + config DuckDB).

Module pur (aucun I/O) : on ne fait que dériver des dataclasses depuis un environnement
factice. La source pageviews étant HTTP (dumps Wikimedia, API REST, SPARQL, API OpenAlex),
un SEUL remote rclone est nécessaire (``ceph``), le lakehouse interne — pas de remote source
S3→S3. Mêmes noms d'env que citation/mediawatch (contrat banc ↔ prod, ADR 0043).
"""

import pytest

from pageviews_dagster.resources import (
    MissingEnvError,
    ceph_target_from_env,
    duckdb_s3_config_from_env,
    render_rclone_config,
)

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "rook-ceph-rgw-datalake.rook-ceph.svc.cluster.local",
    "BUCKET_PORT": "80",
    "BUCKET_NAME": "pageviews-datalake-abc123",
}


def test_ceph_target_from_env_builds_path_style_endpoint() -> None:
    target = ceph_target_from_env(_ENV)
    assert target.bucket == "pageviews-datalake-abc123"
    assert target.endpoint == "http://rook-ceph-rgw-datalake.rook-ceph.svc.cluster.local:80"
    assert target.access_key_id == "AK"
    assert target.secret_access_key == "SK"


def test_ceph_target_defaults_port_to_80() -> None:
    env = {k: v for k, v in _ENV.items() if k != "BUCKET_PORT"}
    assert ceph_target_from_env(env).endpoint.endswith(":80")


def test_ceph_target_missing_bucket_raises() -> None:
    env = {k: v for k, v in _ENV.items() if k != "BUCKET_NAME"}
    with pytest.raises(MissingEnvError, match="BUCKET_NAME"):
        ceph_target_from_env(env)


def test_ceph_target_missing_host_raises() -> None:
    env = {k: v for k, v in _ENV.items() if k != "BUCKET_HOST"}
    with pytest.raises(MissingEnvError, match="BUCKET_HOST"):
        ceph_target_from_env(env)


def test_ceph_target_missing_access_key_raises() -> None:
    env = {k: v for k, v in _ENV.items() if k != "AWS_ACCESS_KEY_ID"}
    with pytest.raises(MissingEnvError, match="AWS_ACCESS_KEY_ID"):
        ceph_target_from_env(env)


def test_ceph_target_empty_value_is_missing() -> None:
    # Une variable présente mais VIDE est traitée comme absente (garde-fou déploiement).
    env = {**_ENV, "AWS_SECRET_ACCESS_KEY": ""}
    with pytest.raises(MissingEnvError, match="AWS_SECRET_ACCESS_KEY"):
        ceph_target_from_env(env)


def test_ceph_target_reads_process_env(monkeypatch) -> None:
    # env=None → lit os.environ (chemin par défaut en cluster).
    for k, v in _ENV.items():
        monkeypatch.setenv(k, v)
    target = ceph_target_from_env()
    assert target.bucket == "pageviews-datalake-abc123"


def test_render_rclone_config_has_single_ceph_remote_path_style() -> None:
    conf = render_rclone_config(ceph_target_from_env(_ENV))
    # Source pageviews en HTTP → aucun remote source S3 ; un seul remote ceph.
    assert "[ceph]" in conf
    assert "[wikimedia]" not in conf
    assert "[openalex]" not in conf
    # RGW impose le path-style.
    assert "force_path_style = true" in conf
    assert "provider = Other" in conf
    assert "access_key_id = AK" in conf
    assert "secret_access_key = SK" in conf
    assert "endpoint = http://rook-ceph-rgw-datalake.rook-ceph.svc.cluster.local:80" in conf


def test_duckdb_config_strips_scheme_and_sets_use_ssl_false_on_http() -> None:
    cfg = duckdb_s3_config_from_env(_ENV)
    # DuckDB veut host:port SANS schéma.
    assert cfg.endpoint == "rook-ceph-rgw-datalake.rook-ceph.svc.cluster.local:80"
    assert cfg.use_ssl is False
    assert cfg.key_id == "AK"
    assert cfg.secret == "SK"
    assert cfg.region == "us-east-1"
    assert cfg.bucket == "pageviews-datalake-abc123"


def test_duckdb_config_use_ssl_follows_endpoint_scheme() -> None:
    # ceph_target_from_env force http:// (RGW banc/SeaweedFS) → use_ssl reste False, même sur
    # un port 443 : le passage TLS relève du schéma de l'endpoint, pas du numéro de port.
    env = {**_ENV, "BUCKET_HOST": "rgw.example", "BUCKET_PORT": "443"}
    cfg = duckdb_s3_config_from_env(env)
    assert cfg.use_ssl is False
    assert cfg.endpoint == "rgw.example:443"
