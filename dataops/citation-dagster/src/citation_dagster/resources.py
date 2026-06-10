"""Configuration des accès stockage objet pour le sync rclone.

Deux *remotes* (dépôts S3 distants) rclone sont nécessaires :

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
            "",
        ]
    )
