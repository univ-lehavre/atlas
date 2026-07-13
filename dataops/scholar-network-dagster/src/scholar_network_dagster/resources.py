"""Configuration des accès stockage objet (S3) et Postgres pour la code-location.

Copié (jamais importé — ADR 0055) du gabarit `citation` : générique, sans logique
métier scholar-network. Deux *remotes* (dépôts S3 distants) rclone sont nécessaires :

- ``openalex`` — le bucket source public ``s3://openalex`` (AWS Open Data), en
  accès **anonyme** (sans clé) ;
- ``ceph`` — le lakehouse interne (RGW Ceph du cluster), dont les identifiants
  proviennent du Secret de l'``ObjectBucketClaim`` (variables ``AWS_ACCESS_KEY_ID``
  / ``AWS_SECRET_ACCESS_KEY``) et l'endpoint du ConfigMap associé.

Le fichier ``rclone.conf`` est rendu **à l'exécution** depuis l'environnement et
écrit dans un répertoire temporaire : aucun identifiant n'est committé ni présent
dans l'image.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


class MissingEnvError(RuntimeError):
    """Une variable d'environnement requise pour le sync est absente."""


@dataclass(frozen=True)
class CephTarget:
    """Coordonnées du bucket cible (RGW Ceph), lues depuis l'``ObjectBucketClaim``."""

    access_key_id: str
    secret_access_key: str
    endpoint: str
    bucket: str


def _require(env: dict[str, str], key: str) -> str:
    value = env.get(key)
    if not value:
        raise MissingEnvError(f"Variable d'environnement requise absente : {key}")
    return value


def ceph_target_from_env(env: dict[str, str] | None = None) -> CephTarget:
    """Construit la cible Ceph depuis l'environnement (Secret + ConfigMap de l'OBC).

    Endpoint : ``http://<BUCKET_HOST>:<BUCKET_PORT>`` (path-style imposé par RGW).
    Bucket : ``BUCKET_NAME`` — jamais codé en dur (l'OBC choisit le nom réel).
    """
    env = dict(os.environ if env is None else env)
    host = _require(env, "BUCKET_HOST")
    port = env.get("BUCKET_PORT", "80")
    return CephTarget(
        access_key_id=_require(env, "AWS_ACCESS_KEY_ID"),
        secret_access_key=_require(env, "AWS_SECRET_ACCESS_KEY"),
        endpoint=f"http://{host}:{port}",
        bucket=_require(env, "BUCKET_NAME"),
    )


@dataclass(frozen=True)
class PostgresTarget:
    """Coordonnées Postgres/CNPG cibles de l'index des profils (lot 5).

    Lues du Secret ``pg-role-pgvector`` injecté au pod de run (jamais en dur). Le mot de
    passe ne doit JAMAIS être loggé (pas de print de la DSN).
    """

    host: str
    port: str
    dbname: str
    user: str
    password: str


def postgres_target_from_env(env: dict[str, str] | None = None) -> PostgresTarget:
    """Construit la cible Postgres depuis l'environnement (Secret pg-role-pgvector).

    Variables : ``POSTGRES_HOST`` / ``POSTGRES_PORT`` (défaut 5432) / ``POSTGRES_DB`` /
    ``POSTGRES_USER`` / ``POSTGRES_PASSWORD``. Mêmes conventions que le contrat cluster ;
    le branchement effectif du Secret au pod relève du déployeur (frontière infra).
    """
    env = dict(os.environ if env is None else env)
    return PostgresTarget(
        host=_require(env, "POSTGRES_HOST"),
        port=env.get("POSTGRES_PORT", "5432"),
        dbname=_require(env, "POSTGRES_DB"),
        user=_require(env, "POSTGRES_USER"),
        password=_require(env, "POSTGRES_PASSWORD"),
    )


def render_rclone_config(target: CephTarget) -> str:
    """Rend le contenu d'un ``rclone.conf`` à deux remotes (openalex, ceph).

    - ``openalex`` : S3 AWS public, accès anonyme (aucune clé) ;
    - ``ceph`` : S3 « Other » (RGW), **path-style** obligatoire.
    """
    return "\n".join(
        [
            "[openalex]",
            "type = s3",
            "provider = AWS",
            "region = us-east-1",
            # Accès anonyme au bucket public (équivalent --no-sign-request).
            "",
            "[ceph]",
            "type = s3",
            "provider = Other",
            f"access_key_id = {target.access_key_id}",
            f"secret_access_key = {target.secret_access_key}",
            f"endpoint = {target.endpoint}",
            "force_path_style = true",
            # Le bucket OBC est PRÉ-provisionné par Rook et l'utilisateur S3 a un quota
            # `max_buckets` : le check/create de bucket que rclone tente par défaut (rcat,
            # copy) le dépasse → `TooManyBuckets` (400). On le saute (le bucket existe déjà).
            "no_check_bucket = true",
            "",
        ]
    )


@dataclass(frozen=True)
class DuckDBS3Config:
    """Coordonnées S3 au format attendu par le ``CREATE SECRET`` de DuckDB.

    DuckDB veut un ``ENDPOINT`` **sans schéma** (``host:port``) et un drapeau
    ``USE_SSL`` explicite — à la différence de rclone qui prend l'URL complète.
    """

    key_id: str
    secret: str
    endpoint: str  # host:port, sans schéma
    use_ssl: bool
    region: str
    bucket: str


def _short_incluster_host(host_port: str) -> str:
    """Raccourcit un host de Service k8s en retirant le suffixe DNS de cluster.

    Le ConfigMap de l'OBC Rook expose ``BUCKET_HOST`` en forme QUASI-FQDN
    (``rook-ceph-rgw-datalake.rook-ceph.svc``). rclone (résolveur glibc) tolère cette
    forme, mais le httpfs de DuckDB (c-ares) BUTE en prod : avec un search domain externe
    (resolv.conf, ndots:5), la résolution du FQDN complet **timeoute**
    (« Could not resolve hostname », piège FQDN prod, cf. univ-lehavre/cluster#458). On
    retire donc le suffixe de cluster (``.svc.cluster.local`` / ``.svc``) pour retomber sur
    le nom COURT ns-qualifié (``<svc>.<ns>``), qui résout de façon fiable. N'affecte QUE les
    hosts k8s (MinIO / host externe = inchangés)."""
    host, _, port = host_port.partition(":")
    for suffix in (".svc.cluster.local", ".svc"):
        if host.endswith(suffix):
            host = host[: -len(suffix)]
            break
    return f"{host}:{port}" if port else host


def duckdb_s3_config_from_env(env: dict[str, str] | None = None) -> DuckDBS3Config:
    """Construit la config S3 DuckDB depuis l'environnement.

    Réutilise ``ceph_target_from_env`` (mêmes variables ``AWS_*``/``BUCKET_*``),
    puis dérive le format DuckDB : ``host:port`` sans schéma, ``use_ssl`` selon
    que l'endpoint est en ``https`` (RGW prod) ou ``http`` (MinIO). Le host
    est raccourci au nom court ns-qualifié (piège FQDN prod, cf. ``_short_incluster_host``).
    """
    target = ceph_target_from_env(env)
    use_ssl = target.endpoint.startswith("https://")
    host_port = _short_incluster_host(target.endpoint.split("://", 1)[-1])
    return DuckDBS3Config(
        key_id=target.access_key_id,
        secret=target.secret_access_key,
        endpoint=host_port,
        use_ssl=use_ssl,
        region="us-east-1",
        bucket=target.bucket,
    )
