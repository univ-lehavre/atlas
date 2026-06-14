"""Validation du contrat manifest CÔTÉ CONSOMMATEUR (étape 4, index_load).

L'asset de production écrit le ``manifest.json`` (assets/manifest.py, étape 3.4) ; ce
module fait l'inverse — il LIT et VALIDE ce contrat AVANT de charger un mart dans
Postgres (garde-fou exigé par l'ADR 0058 : ne jamais lire un artefact servi sans
valider sa sentinelle). Symétrique de ``build_manifest`` côté écrivain.

Pur (la fonction ``validate_manifest`` ne fait aucune I/O) : l'asset lit le JSON et le
Parquet via DuckDB, puis appelle la validation. Refuse une ``schema_version`` inconnue
(comme le consommateur TS, ADR 0029), un ``row_count`` incohérent ou un ``sha256``
divergent — toute violation lève ``ManifestError`` (le chargement est alors avorté).

NB : pas de ``from __future__ import annotations`` (cohérence dépôt, drift D9).
"""

import hashlib

from citation_dagster.assets.manifest import MANIFEST_SCHEMA_VERSION


class ManifestError(RuntimeError):
    """Contrat manifest invalide : chargement à refuser (ADR 0058/0029)."""


def validate_manifest(manifest: dict, actual_row_count: int, actual_sha256: dict) -> None:
    """Valide un manifest contre la réalité du Parquet (pur, sans I/O).

    - ``schema_version`` doit être celle attendue (refus de l'inconnu) ;
    - ``row_count`` du manifest == nombre de lignes réellement lues ;
    - chaque part déclarée doit exister avec le MÊME sha256 (octets réels recalculés).
    ``actual_sha256`` : ``{nom_part: sha256}`` recalculé par l'appelant. Lève
    ``ManifestError`` à la première incohérence.
    """
    version = manifest.get("schema_version")
    if version != MANIFEST_SCHEMA_VERSION:
        raise ManifestError(
            f"schema_version inconnue : {version} (attendu {MANIFEST_SCHEMA_VERSION})"
        )
    declared = manifest.get("row_count")
    if declared != actual_row_count:
        raise ManifestError(
            f"row_count incohérent : manifest={declared}, parquet réel={actual_row_count}"
        )
    parts = manifest.get("parts") or []
    if not parts:
        raise ManifestError("manifest sans parts : artefact incomplet")
    for part in parts:
        name = part["key"].rsplit("/", 1)[-1]
        expected = part["sha256"]
        got = actual_sha256.get(name)
        if got is None:
            raise ManifestError(f"part déclarée absente des octets relus : {name}")
        if got != expected:
            raise ManifestError(
                f"sha256 divergent pour {name} : manifest={expected[:12]}…, réel={got[:12]}…"
            )


def sha256_bytes(data: bytes) -> str:
    """sha256 hex des octets d'une part (recalcul indépendant côté consommateur)."""
    return hashlib.sha256(data).hexdigest()
