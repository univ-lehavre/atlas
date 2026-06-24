"""Tests de la configuration des accès stockage (génération du rclone.conf)."""

import pytest

from citation_dagster.resources import (
    MissingEnvError,
    ceph_target_from_env,
    render_rclone_config,
)

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "rook-ceph-rgw-datalake.rook-ceph.svc.cluster.local",
    "BUCKET_PORT": "80",
    "BUCKET_NAME": "citation-datalake-abc123",
}


def test_ceph_target_from_env_builds_path_style_endpoint() -> None:
    target = ceph_target_from_env(_ENV)
    assert target.bucket == "citation-datalake-abc123"
    assert target.endpoint == "http://rook-ceph-rgw-datalake.rook-ceph.svc.cluster.local:80"
    assert target.access_key_id == "AK"


def test_ceph_target_defaults_port_to_80() -> None:
    env = {k: v for k, v in _ENV.items() if k != "BUCKET_PORT"}
    assert ceph_target_from_env(env).endpoint.endswith(":80")


def test_ceph_target_missing_var_raises() -> None:
    env = {k: v for k, v in _ENV.items() if k != "BUCKET_NAME"}
    with pytest.raises(MissingEnvError, match="BUCKET_NAME"):
        ceph_target_from_env(env)


def test_render_rclone_config_has_two_remotes_and_path_style() -> None:
    conf = render_rclone_config(ceph_target_from_env(_ENV))
    assert "[openalex]" in conf
    assert "[ceph]" in conf
    # RGW impose le path-style.
    assert "force_path_style = true" in conf
    # Le remote openalex est anonyme : aucune clé ne doit y figurer.
    openalex_block = conf.split("[ceph]")[0]
    assert "access_key_id" not in openalex_block
