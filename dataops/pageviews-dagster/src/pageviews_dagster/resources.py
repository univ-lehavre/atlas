"""Configuration des accès stockage objet pour la code-location « pageviews ».

La source de pageviews est **HTTP** (dumps `pageview_complete` de Wikimedia, API
REST Pageviews, SPARQL Wikidata, API OpenAlex) : le téléchargement se fait en HTTP,
pas par rclone S3→S3. Un **seul remote** rclone est donc nécessaire — ``ceph``, le
lakehouse interne (RGW Ceph en prod, SeaweedFS au banc) — pour l'écriture du brut et
du ``manifest`` (même patron que mediawatch, dont la source GDELT est aussi HTTP).

Les identifiants proviennent du Secret de l'``ObjectBucketClaim`` (``AWS_ACCESS_KEY_ID``
/ ``AWS_SECRET_ACCESS_KEY``) et l'endpoint du ConfigMap associé (``BUCKET_HOST`` /
``BUCKET_PORT`` / ``BUCKET_NAME``) — **mêmes noms** que citation/mediawatch, pour que
le contrat banc ↔ prod soit identique (ADR 0043).

Le ``rclone.conf`` est rendu **à l'exécution** depuis l'environnement : aucun
identifiant n'est committé ni présent dans l'image.
"""

from __future__ import annotations

import os
from dataclasses import dataclass


class MissingEnvError(RuntimeError):
    """Une variable d'environnement requise pour le lakehouse est absente."""


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


def render_rclone_config(target: CephTarget) -> str:
    """Rend le contenu d'un ``rclone.conf`` à deux remotes (``openalex``, ``ceph``).

    - ``openalex`` : S3 AWS public (AWS Open Data), accès **anonyme** (aucune clé) —
      source du snapshot ``institutions`` (Parquet) rapatrié par ``ref_universities``.
      Aligné sur le remote homonyme de ``citation``. On COPIE le snapshot en local (137
      petits fichiers, ~91 Mio) plutôt que le lire en httpfs : rclone parallélise la
      copie (~5 s) là où httpfs enchaîne 137 aller-retours S3 (>2 min) ;
    - ``ceph`` : S3 « Other » (RGW), **path-style** obligatoire — le lakehouse interne.

    La source Wikimedia (redirections/SPARQL) reste HTTP directe, hors rclone.
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


def duckdb_s3_config_from_env(env: dict[str, str] | None = None) -> DuckDBS3Config:
    """Construit la config S3 DuckDB depuis l'environnement.

    Réutilise ``ceph_target_from_env`` (mêmes variables ``AWS_*``/``BUCKET_*``), puis
    dérive le format DuckDB : ``host:port`` sans schéma, ``use_ssl`` selon que
    l'endpoint est en ``https`` (RGW prod) ou ``http`` (SeaweedFS/MinIO banc).
    """
    target = ceph_target_from_env(env)
    use_ssl = target.endpoint.startswith("https://")
    host_port = target.endpoint.split("://", 1)[-1]
    return DuckDBS3Config(
        key_id=target.access_key_id,
        secret=target.secret_access_key,
        endpoint=host_port,
        use_ssl=use_ssl,
        region="us-east-1",
        bucket=target.bucket,
    )
