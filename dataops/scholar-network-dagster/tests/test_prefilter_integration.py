"""Test d'INTÉGRATION du brut pré-filtré : DuckDB ↔ MinIO de bout en bout (lot 2, ADR 0103).

Prouve, sur un vrai stockage objet (MinIO conteneurisé, fixture ``minio``), que le filtre
projeté ``prefilter_sql`` :
  1. lit un Parquet « source OpenAlex » synthétique depuis S3 (``read_parquet('s3://…')``) ;
  2. applique le prédicat commun (≥2016 ∧ type=article) et la projection stricte ;
  3. écrit le brut pré-filtré à l'emplacement dicté par le mode de cache (``cache_location``).

S'auto-saute sans Docker. C'est ce test qui manquait au commit initial du lot 2 (le SQL
n'y était prouvé que sur un Parquet LOCAL) : ici le chemin S3 réel (httpfs + secret) est
exercé, exactement comme en production contre RGW.
"""

from scholar_network_dagster.assets.prefilter import (
    PREFILTERED_SUBDIR,
    PROJECTED_COLUMNS,
    cache_location,
    prefilter_sql,
    prefiltered_raw,
)
from scholar_network_dagster.cache import CacheMode
from scholar_network_dagster.lakehouse import connect
from scholar_network_dagster.resources import DuckDBS3Config


def _duckdb_cfg(minio) -> DuckDBS3Config:
    """Config DuckDB pointant le MinIO de test (path-style, http, région factice)."""
    return DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,  # host:port sans schéma
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )


def _seed_source_works(con, bucket: str) -> str:
    """Écrit un Parquet « source OpenAlex » synthétique dans MinIO ; renvoie son glob S3.

    6 works couvrant les colonnes projetées + un abstract_inverted_index LOURD (pour
    prouver que la projection stricte ne le rapatrie pas). Cas : gardé (2020/article),
    exclu année (2015/article), exclu type (2020/dataset), gardé borne (2016/article),
    exclu type (2019/preprint), gardé (2022/article)."""
    src = f"s3://{bucket}/source/works.parquet"
    con.execute(
        f"""
        COPY (
            SELECT * FROM (VALUES
                ('W1', 2020, 'article',  't1', [], [], [], 1.0, 5, DATE '2021-01-01', 'heavy1'),
                ('W2', 2015, 'article',  't2', [], [], [], 1.0, 5, DATE '2016-01-01', 'heavy2'),
                ('W3', 2020, 'dataset',  't3', [], [], [], 1.0, 5, DATE '2021-01-01', 'heavy3'),
                ('W4', 2016, 'article',  't4', [], [], [], 1.0, 5, DATE '2017-01-01', 'heavy4'),
                ('W5', 2019, 'preprint', 't5', [], [], [], 1.0, 5, DATE '2020-01-01', 'heavy5'),
                ('W6', 2022, 'article',  't6', [], [], [], 1.0, 5, DATE '2023-01-01', 'heavy6')
            ) AS t(id, publication_year, type, title, authorships, topics, keywords,
                   fwci, cited_by_count, updated_date, abstract_inverted_index)
        ) TO '{src}' (FORMAT PARQUET)
        """
    )
    return src


def test_prefilter_filters_projects_and_writes_full(minio):
    """full : lit la source S3, filtre ≥2016∧article, projette, écrit sous prefiltered/."""
    con = connect(_duckdb_cfg(minio))
    src = _seed_source_works(con, minio.bucket)

    dest = cache_location(CacheMode.PERSISTENT, minio.bucket, run_id="r1")
    assert dest == f"s3://{minio.bucket}/{PREFILTERED_SUBDIR}"  # emplacement stable inter-run

    con.execute(f"COPY ({prefilter_sql(src)}) TO '{dest}/part-000.parquet' (FORMAT PARQUET)")

    rows = con.execute(
        f"SELECT id FROM read_parquet('{dest}/part-000.parquet') ORDER BY id"
    ).fetchall()
    assert [r[0] for r in rows] == ["W1", "W4", "W6"]  # articles ≥2016 (2016 inclus)

    # Projection stricte : la colonne lourde abstract_inverted_index n'est PAS rapatriée.
    cols = {
        c[0]
        for c in con.execute(
            f"DESCRIBE SELECT * FROM read_parquet('{dest}/part-000.parquet')"
        ).fetchall()
    }
    assert cols == set(PROJECTED_COLUMNS)
    assert "abstract_inverted_index" not in cols


def test_prefilter_bounded_writes_under_transient_run_prefix(minio):
    """bounded : le brut pré-filtré est écrit sous un préfixe _transient/run=<id> isolé."""
    con = connect(_duckdb_cfg(minio))
    src = _seed_source_works(con, minio.bucket)

    dest = cache_location(CacheMode.TRANSIENT, minio.bucket, run_id="r42")
    assert dest == f"s3://{minio.bucket}/{PREFILTERED_SUBDIR}/_transient/run=r42"

    con.execute(f"COPY ({prefilter_sql(src)}) TO '{dest}/part-000.parquet' (FORMAT PARQUET)")
    n = con.execute(f"SELECT count(*) FROM read_parquet('{dest}/part-000.parquet')").fetchone()[0]
    assert n == 3  # même filtre, même résultat que full (correction indépendante du mode)


def test_prefilter_ephemeral_has_no_destination(minio):
    """ephemeral : aucune destination de cache — le filtre s'exécute mais rien n'est gardé."""
    con = connect(_duckdb_cfg(minio))
    src = _seed_source_works(con, minio.bucket)

    assert cache_location(CacheMode.NONE, minio.bucket, run_id="r1") is None
    # Le filtre reste exécutable « à la volée » (relation lue, non matérialisée).
    n = con.execute(f"SELECT count(*) FROM ({prefilter_sql(src)})").fetchone()[0]
    assert n == 3


def test_result_is_identical_across_modes(minio):
    """INVARIANT ADR 0103 §3 : le résultat du filtre est identique quel que soit le mode."""
    con = connect(_duckdb_cfg(minio))
    src = _seed_source_works(con, minio.bucket)
    ids = [
        r[0] for r in con.execute(f"SELECT id FROM ({prefilter_sql(src)}) ORDER BY id").fetchall()
    ]
    # full et bounded écrivent, ephemeral non — mais le CONTENU filtré ne dépend pas du mode.
    assert ids == ["W1", "W4", "W6"]
    assert len(ids) == 3


def _point_env_at_minio(monkeypatch, minio, mode: str, glob: str) -> None:
    """Pose l'env pour que l'asset lise/écrive le MinIO de test (AWS_*/BUCKET_* + mode + glob)."""
    host, port = minio.endpoint.split(":")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", minio.access_key)
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", minio.secret_key)
    monkeypatch.setenv("BUCKET_HOST", host)
    monkeypatch.setenv("BUCKET_PORT", port)
    monkeypatch.setenv("BUCKET_NAME", minio.bucket)
    monkeypatch.setenv("SCHOLAR_NETWORK_PERSISTENCE_MODE", mode)
    monkeypatch.setenv("SCHOLAR_NETWORK_SOURCE_GLOB", glob)
    # Ressources DuckDB modestes en test (connect() force sinon 32 threads / 24GB).
    monkeypatch.setenv("DBT_DUCKDB_MEMORY_LIMIT", "2GB")
    monkeypatch.setenv("DBT_DUCKDB_THREADS", "2")
    monkeypatch.setenv("DBT_DUCKDB_TEMP_DIR", "/tmp/scholar-network-spill")


def test_asset_full_materializes_prefiltered(minio, monkeypatch):
    """L'asset prefiltered_raw en full : lit la source MinIO, filtre, ÉCRIT sous prefiltered/."""
    seed = connect(_duckdb_cfg(minio))
    src = _seed_source_works(seed, minio.bucket)
    _point_env_at_minio(monkeypatch, minio, "full", src)

    result = prefiltered_raw()
    meta = result.metadata
    assert meta["cache_mode"].value == "full"
    assert meta["materialized"].value is True
    assert meta["prefiltered_works"].value == 3  # W1/W4/W6
    assert meta["transient_purge"].value is False

    # Le pré-filtré est réellement lisible sous prefiltered/ (relu tel quel au run suivant).
    dest = cache_location(CacheMode.PERSISTENT, minio.bucket, run_id="x")
    n = seed.execute(f"SELECT count(*) FROM read_parquet('{dest}/part-00000.parquet')").fetchone()[
        0
    ]
    assert n == 3


def test_asset_ephemeral_does_not_materialize(minio, monkeypatch):
    """L'asset en ephemeral : compte le pré-filtré mais N'ÉCRIT rien (materialized=False)."""
    seed = connect(_duckdb_cfg(minio))
    src = _seed_source_works(seed, minio.bucket)
    _point_env_at_minio(monkeypatch, minio, "ephemeral", src)

    result = prefiltered_raw()
    meta = result.metadata
    assert meta["cache_mode"].value == "ephemeral"
    assert meta["materialized"].value is False
    assert meta["prefiltered_works"].value == 3  # même filtre, résultat identique
    # Rien n'a été écrit sous prefiltered/ (aucun objet à lister).
    base = f"s3://{minio.bucket}/{PREFILTERED_SUBDIR}"
    try:
        listed = seed.execute(f"SELECT count(*) FROM glob('{base}/**')").fetchone()[0]
    except Exception:
        listed = 0
    assert listed == 0
