"""Tests de l'index_load (étape 4) : validation de contrat + e2e DuckDB→pgvector.

Deux niveaux :
  - PURS : le validateur de manifest côté consommateur (manifest_read), sans I/O ;
  - SMOKE hermétique : dbt build + asset embeddings (MinIO) PUIS index_load chargeant
    l'index Postgres réel (pgvector épinglé), avec vérification FTS + kNN + idempotence
    + mapping author_id→researcher_id. S'auto-saute sans Docker.
"""

import pytest

from citation_dagster import manifest_read
from citation_dagster.assets.manifest import MANIFEST_SCHEMA_VERSION

# ── Tests purs du validateur de contrat (manifest_read) ──────────────────────


def _good_manifest():
    return {
        "schema_version": MANIFEST_SCHEMA_VERSION,
        "row_count": 2,
        "parts": [
            {"key": "marts/researchers_fts/dt=2020-01/run=r/part.parquet", "sha256": "a" * 64}
        ],
    }


def test_validate_manifest_accepts_consistent():
    manifest_read.validate_manifest(_good_manifest(), 2, {"part.parquet": "a" * 64})


def test_validate_manifest_rejects_unknown_schema_version():
    m = _good_manifest()
    m["schema_version"] = 999
    with pytest.raises(manifest_read.ManifestError, match="schema_version"):
        manifest_read.validate_manifest(m, 2, {"part.parquet": "a" * 64})


def test_validate_manifest_rejects_row_count_mismatch():
    with pytest.raises(manifest_read.ManifestError, match="row_count"):
        manifest_read.validate_manifest(_good_manifest(), 3, {"part.parquet": "a" * 64})


def test_validate_manifest_rejects_sha256_divergent():
    with pytest.raises(manifest_read.ManifestError, match="sha256"):
        manifest_read.validate_manifest(_good_manifest(), 2, {"part.parquet": "b" * 64})


def test_validate_manifest_rejects_missing_part():
    with pytest.raises(manifest_read.ManifestError, match="absente"):
        manifest_read.validate_manifest(_good_manifest(), 2, {"autre.parquet": "a" * 64})


def test_validate_manifest_rejects_empty_parts():
    m = _good_manifest()
    m["parts"] = []
    with pytest.raises(manifest_read.ManifestError, match="sans parts"):
        manifest_read.validate_manifest(m, 2, {})


# ── Tests purs du SQL d'insertion + corps de l'asset (fakes, sans Docker) ────


def test_insert_sql_maps_author_to_researcher_and_vector():
    import importlib

    il = importlib.import_module("citation_dagster.assets.index_load")

    sql = il._researcher_insert_sql(
        "https://openalex.org/A1", "plasma fusion", [0.1, 0.2, 0.3], "2020-01", "r1"
    )
    # Mapping author_id → researcher_id (même valeur, colonne researcher_id).
    assert "('https://openalex.org/A1'," in sql
    # Vecteur converti côté PG (::vector), document en to_tsvector('simple', …).
    assert "'[0.1,0.2,0.3]'::vector" in sql
    assert "to_tsvector('simple', 'plasma fusion')" in sql
    assert "dt, run) VALUES" in sql and "'2020-01', 'r1'" in sql


def test_insert_sql_null_embedding_when_no_vector():
    import importlib

    il = importlib.import_module("citation_dagster.assets.index_load")

    sql = il._researcher_insert_sql("https://openalex.org/A2", "chemistry", None, "2020-01", "r1")
    # Chercheur sans vecteur (LEFT JOIN) → embedding NULL (schéma nullable, ADR migr 0002).
    assert ", NULL, to_tsvector" in sql


def test_insert_sql_escapes_quotes():
    import importlib

    il = importlib.import_module("citation_dagster.assets.index_load")

    sql = il._researcher_insert_sql("a'b", "d'oc", None, "2020-01", "r1")
    assert "a''b" in sql and "d''oc" in sql  # quotes doublées (anti-injection)


class _FakeCon:
    """Faux con DuckDB : sert le manifest, le count, les blobs et les rows de jointure."""

    def __init__(self, manifest_json, rows, row_count, blobs):
        self._manifest_json = manifest_json
        self._rows = rows
        self._row_count = row_count
        self._blobs = blobs
        self.pg_calls = []

    def sql(self, query):
        self._last = query
        return self

    def fetchall(self):
        if "read_text" in self._last:
            return [(self._manifest_json,)]
        if "read_blob" in self._last:
            return self._blobs
        if "LEFT JOIN" in self._last:
            return self._rows
        return []

    def fetchone(self):
        if "count(*)" in self._last:
            return (self._row_count,)
        return (None,)

    def execute(self, query):
        self.pg_calls.append(query)
        return self


def test_index_load_body_with_fakes(monkeypatch):
    """Exerce le corps de l'asset (validation contrat, ATTACH, DELETE+INSERT idempotent,
    lineage) sans Docker : con/postgres_execute/attach mockés."""
    import importlib
    import json as _json

    from dagster import build_asset_context

    il = importlib.import_module("citation_dagster.assets.index_load")
    from citation_dagster.assets.manifest import MANIFEST_SCHEMA_VERSION

    # Manifest cohérent avec les rows (2 chercheurs) et le sha des blobs.
    sha = "a" * 64
    manifest = _json.dumps(
        {
            "schema_version": MANIFEST_SCHEMA_VERSION,
            "row_count": 2,
            "parts": [{"key": "x/dt=0000-00/run=EPHEMERAL/part.parquet", "sha256": sha}],
        }
    )
    monkeypatch.setattr(il.manifest_read, "sha256_bytes", lambda _b: sha)
    rows = [
        ("https://openalex.org/A1", "plasma", [0.1, 0.2]),
        ("https://openalex.org/A2", "chemistry", None),
    ]
    fake = _FakeCon(manifest, rows, row_count=2, blobs=[("part.parquet", b"x")])
    monkeypatch.setattr(il.lakehouse, "connect", lambda cfg=None: fake)
    monkeypatch.setattr(il, "ceph_target_from_env", lambda: type("C", (), {"bucket": "citation"})())
    monkeypatch.setattr(il, "postgres_target_from_env", lambda: object())
    monkeypatch.setattr(il.lakehouse, "attach_postgres", lambda con, target: None)
    monkeypatch.setattr(
        il.lakehouse, "postgres_execute", lambda con, sql: fake.pg_calls.append(sql)
    )
    monkeypatch.delenv("OPENLINEAGE_URL", raising=False)

    res = il.index_load(build_asset_context())
    assert res.metadata["researchers_loaded"].value == 2
    assert res.metadata["vectors_present"].value == 1  # A1 a un vecteur, A2 NULL
    # Idempotence : un DELETE par partition AVANT les INSERT.
    assert any(c.startswith("DELETE FROM researchers") for c in fake.pg_calls)
    assert sum(1 for c in fake.pg_calls if c.startswith("INSERT INTO researchers")) == 2


# ── Smoke hermétique : dbt + embeddings (MinIO) → index_load (pgvector) ──────


def _build_index(minio, monkeypatch):
    """dbt build + asset embeddings + tous les manifests, sur la partition EPHEMERAL.

    Réutilise les helpers du smoke dbt/embeddings. Renvoie le run_id chargé.
    """
    from dagster import build_asset_context

    import citation_dagster.assets.manifest as cm
    from citation_dagster.assets.researcher_embeddings import researcher_embeddings
    from citation_dagster.dbt import CURATED_DT
    from tests.conftest import load_raw_fixtures, requires_rclone
    from tests.test_dbt_models import _dbt_build, _set_minio_env

    requires_rclone()
    load_raw_fixtures(minio)
    _set_minio_env(monkeypatch, minio)
    run_id = "EPHEMERAL"  # = run_id de build_asset_context
    r = _dbt_build(minio, curated_run=run_id, curated_dt=CURATED_DT)
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"
    # Embeddings (vecteurs) + tous les manifests servis dont a besoin index_load.
    researcher_embeddings(build_asset_context())
    cm.researchers_fts_manifest(build_asset_context())
    cm.researcher_vectors_manifest(build_asset_context())
    return run_id, CURATED_DT


def test_index_load_e2e_fts_and_knn(embedding_model, pgvector, minio, monkeypatch):
    """e2e : index_load charge researchers (FTS + embedding) dans pgvector ; FTS et kNN
    fonctionnent ; mapping author_id→researcher_id ; idempotence sur 2 runs."""
    import subprocess

    from dagster import build_asset_context

    from citation_dagster.assets.index_load import index_load

    run_id, dt = _build_index(minio, monkeypatch)

    res = index_load(build_asset_context())
    # 3 chercheurs (Alice, Bob, Carol), tous avec vecteur (fixtures).
    assert res.metadata["researchers_loaded"].value == 3
    assert res.metadata["vectors_present"].value == 3

    # Vérif en base via le conteneur pgvector.
    def psql(sql):
        out = subprocess.run(
            [
                "docker",
                "exec",
                f"citation-pgvector-test-{pgvector.port}",
                "psql",
                "-U",
                pgvector.user,
                "-d",
                pgvector.dbname,
                "-tA",
                "-c",
                sql,
            ],
            capture_output=True,
            text=True,
            check=True,
        )
        return out.stdout.strip()

    # count == 3, et researcher_id porte bien l'author_id (mapping).
    assert psql(f"SELECT count(*) FROM researchers WHERE dt='{dt}' AND run='{run_id}'") == "3"
    assert (
        psql(
            "SELECT count(*) FROM researchers WHERE researcher_id = 'https://openalex.org/A1000000001'"
        )
        == "1"
    )

    def fts_ids(query):
        """Ensemble des researcher_id matchant une requête FTS (ordre non garanti)."""
        out = psql(
            f"SELECT string_agg(researcher_id, ',' ORDER BY researcher_id) FROM researchers "
            f"WHERE fts @@ to_tsquery('simple','{query}')"
        )
        return set(out.split(",")) if out else set()

    _ALICE = "https://openalex.org/A1000000001"
    _BOB = "https://openalex.org/A1000000002"
    _CAROL = "https://openalex.org/A1000000003"
    # FTS discriminant sur le graphe 3 auteurs (GOLDEN.md, doc_text) :
    # - 'muscle' (W5 solo) ne concerne QU'Alice ;
    # - 'glycosylation' (T20003 : W3 Alice+Carol, W10 Carol) → Alice ET Carol ;
    # - 'materials' (T20002 : W1 Alice+Bob, W7 Alice) → Alice ET Bob.
    assert fts_ids("muscle") == {_ALICE}
    assert fts_ids("glycosylation") == {_ALICE, _CAROL}
    assert fts_ids("materials") == {_ALICE, _BOB}

    # kNN : la requête la plus proche du vecteur d'Alice renvoie Alice en tête.
    knn = psql(
        "SELECT researcher_id FROM researchers WHERE embedding IS NOT NULL "
        "ORDER BY embedding <=> (SELECT embedding FROM researchers "
        "WHERE researcher_id='https://openalex.org/A1000000001') LIMIT 1"
    )
    assert knn == "https://openalex.org/A1000000001"

    # Idempotence : recharger le MÊME run ne duplique pas (DELETE+INSERT).
    index_load(build_asset_context())
    assert psql(f"SELECT count(*) FROM researchers WHERE dt='{dt}' AND run='{run_id}'") == "3"
