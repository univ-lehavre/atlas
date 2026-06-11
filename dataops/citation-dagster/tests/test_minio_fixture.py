"""Vérifie le helper MinIO hermétique lui-même (ADR 0057).

La fixture ``minio`` est définie dans ``conftest.py`` (auto-découverte par pytest).
Ce test s'auto-saute si Docker est absent (le helper appelle ``pytest.skip``).
Quand Docker est là, il prouve que le MinIO épinglé démarre et expose un bucket
utilisable — la fondation des tests d'intégration DuckDB↔S3 (étape 3.1).
"""

import urllib.request


def test_minio_starts_and_serves(minio):
    """Le MinIO épinglé répond et expose les coordonnées attendues."""
    assert minio.bucket == "citation"
    assert ":" in minio.endpoint  # host:port
    resp = urllib.request.urlopen(f"http://{minio.endpoint}/minio/health/live", timeout=5)  # noqa: S310
    assert resp.status == 200
