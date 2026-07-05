"""Tests de la configuration des accès stockage (génération du rclone.conf)."""

import pytest

from citation_dagster.resources import (
    MissingEnvError,
    _short_incluster_host,
    ceph_target_from_env,
    duckdb_s3_config_from_env,
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


def test_duckdb_endpoint_shortens_fqdn_host() -> None:
    """CONTRAT prod (piège FQDN, cf. cluster#458) : l'endpoint DuckDB retire le suffixe de
    cluster du BUCKET_HOST de l'OBC → nom court ns-qualifié que le httpfs (c-ares) résout.

    ceph_target (rclone, glibc) GARDE le FQDN ; SEUL DuckDB le raccourcit — c'est la
    divergence exacte du bug prouvé en prod (rclone a ingéré 687 GiB, DuckDB timeoutait)."""
    cfg = duckdb_s3_config_from_env(_ENV)
    assert cfg.endpoint == "rook-ceph-rgw-datalake.rook-ceph:80"
    # ceph_target (rclone) n'est PAS raccourci (glibc tolère le FQDN).
    assert ceph_target_from_env(_ENV).endpoint.endswith(".svc.cluster.local:80")


def test_short_incluster_host_strips_only_k8s_suffixes() -> None:
    # Suffixes k8s retirés (FQDN complet ET forme .svc).
    assert _short_incluster_host("svc.ns.svc.cluster.local:80") == "svc.ns:80"
    assert _short_incluster_host("rook-ceph-rgw-datalake.rook-ceph.svc:80") == (
        "rook-ceph-rgw-datalake.rook-ceph:80"
    )
    # Host banc / externe : INCHANGÉ (pas de suffixe k8s à retirer).
    assert _short_incluster_host("seaweedfs:8333") == "seaweedfs:8333"
    assert _short_incluster_host("s3.amazonaws.com:443") == "s3.amazonaws.com:443"
    # Sans port : géré.
    assert _short_incluster_host("svc.ns.svc") == "svc.ns"


def test_render_rclone_config_has_two_remotes_and_path_style() -> None:
    conf = render_rclone_config(ceph_target_from_env(_ENV))
    assert "[openalex]" in conf
    assert "[ceph]" in conf
    # RGW impose le path-style.
    assert "force_path_style = true" in conf
    # Le remote openalex est anonyme : aucune clé ne doit y figurer.
    openalex_block = conf.split("[ceph]")[0]
    assert "access_key_id" not in openalex_block
