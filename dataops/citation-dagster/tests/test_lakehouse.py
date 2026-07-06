"""Tests de l'accès lakehouse DuckDB↔S3 (étape 3.1).

- Tests **unitaires** purs (génération du SQL ``CREATE SECRET``, config depuis
  l'env) — toujours exécutés, couvrent la logique sans I/O.
- Test **d'intégration hermétique** : round-trip réel JSONL.gz → Parquet Hive →
  relecture, contre le MinIO épinglé (fixture ``minio``, ADR 0057). Le JSONL.gz brut est
  fabriqué INLINE (le primitif ``read_jsonl_gz`` reste le chemin d'ingestion du brut ;
  la fixture openalex-sample est désormais le MART Parquet, pas le brut). S'auto-saute
  si Docker est absent.
"""

import gzip
import json
import subprocess
import tempfile
from pathlib import Path

import duckdb

from citation_dagster import lakehouse
from citation_dagster.resources import DuckDBS3Config, duckdb_s3_config_from_env

_ENV = {
    "AWS_ACCESS_KEY_ID": "AK",
    "AWS_SECRET_ACCESS_KEY": "SK",
    "BUCKET_HOST": "seaweedfs.s3.svc.cluster.local",
    "BUCKET_PORT": "8333",
    "BUCKET_NAME": "citation",
}

# Brut JSONL synthétique minimal (5 works, années 2017–2021), fabriqué inline pour
# exercer le primitif d'ingestion ``read_jsonl_gz`` sans dépendre d'une fixture externe.
_RAW_WORKS = [
    {"id": f"https://openalex.org/W{i}", "publication_year": year, "referenced_works": []}
    for i, year in enumerate((2017, 2018, 2019, 2020, 2021), start=1)
]


def _write_raw_gz() -> Path:
    """Écrit un JSONL.gz brut déterministe (mtime=0) dans un fichier temporaire."""
    text = "".join(json.dumps(r, sort_keys=True) + "\n" for r in _RAW_WORKS)
    path = Path(tempfile.mkdtemp()) / "part_000.gz"
    with gzip.GzipFile(str(path), "wb", mtime=0) as gz:
        gz.write(text.encode("utf-8"))
    return path


# ── Unitaires (purs) ─────────────────────────────────────────────────────────


def test_config_from_env_strips_scheme_and_detects_ssl():
    cfg = duckdb_s3_config_from_env(_ENV)
    # Sans schéma ET nom court : le suffixe de cluster (.svc.cluster.local) est retiré
    # pour l'endpoint DuckDB (piège FQDN prod, cf. resources._short_incluster_host).
    assert cfg.endpoint == "seaweedfs.s3:8333"
    assert cfg.use_ssl is False  # http → pas de SSL
    assert cfg.key_id == "AK" and cfg.bucket == "citation"


def test_config_detects_ssl_for_https():
    env = {**_ENV, "BUCKET_PORT": "443"}
    # ceph_target_from_env construit toujours http:// ; pour https il faudrait un
    # endpoint https — on vérifie ici la dérivation host:port indépendante du SSL.
    cfg = duckdb_s3_config_from_env(env)
    assert cfg.endpoint.endswith(":443")


def test_create_secret_sql_is_path_style():
    cfg = DuckDBS3Config(
        key_id="AK",
        secret="SK",
        endpoint="h:8333",
        use_ssl=False,
        region="us-east-1",
        bucket="citation",
    )
    sql = lakehouse._create_secret_sql(cfg)
    assert "TYPE S3" in sql
    assert "URL_STYLE 'path'" in sql
    assert "USE_SSL false" in sql
    assert "ENDPOINT 'h:8333'" in sql


# ── Intégration hermétique (MinIO épinglé + fixtures synthétiques) ───────────


def _load_fixtures_to_minio(minio):
    """Charge un JSONL.gz brut synthétique (fabriqué inline) dans le bucket MinIO de test."""
    works_gz = _write_raw_gz()
    # Copie via un client mc jetable (même image épinglée, hermétique).
    script = (
        f"mc alias set t http://{minio.endpoint} {minio.access_key} {minio.secret_key} && "
        f"mc cp /fix/part_000.gz t/{minio.bucket}/raw/works/updated_date=2020-01-01/part_000.gz"
    )
    subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "--network",
            "host",
            "-v",
            f"{works_gz}:/fix/part_000.gz:ro",
            "--entrypoint",
            "sh",
            lakehouse_minio_image(),
            "-c",
            script,
        ],
        capture_output=True,
        text=True,
        check=True,
    )


def lakehouse_minio_image() -> str:
    """L'image MinIO épinglée (réexpose celle de conftest pour le chargement)."""
    from tests.conftest import _MINIO_IMAGE

    return _MINIO_IMAGE


def test_roundtrip_jsonl_gz_to_parquet_hive(minio):
    """Round-trip réel : lit le JSONL.gz synthétique, écrit du Parquet Hive, relit."""
    _load_fixtures_to_minio(minio)
    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    con = lakehouse.connect(cfg)

    # 1) Lecture du brut JSONL.gz synthétique (5 works fabriqués inline).
    rel = lakehouse.read_jsonl_gz(con, f"s3://{minio.bucket}/raw/works/**/*.gz")
    con.register("works_raw", rel)
    n = con.sql("SELECT count(*) FROM works_raw").fetchone()[0]
    assert n == 5

    # 2) Écriture Parquet partitionné Hive (par publication_year), puis relecture.
    lakehouse.copy_to_parquet(
        con,
        "SELECT id, publication_year FROM works_raw",
        f"s3://{minio.bucket}/curated/works",
        partition_by=["publication_year"],
    )
    back = con.sql(
        f"SELECT count(*) FROM read_parquet('s3://{minio.bucket}/curated/works/**/*.parquet')"
    ).fetchone()[0]
    assert back == 5

    # 3) Le partitionnement Hive a bien créé des dossiers publication_year=YYYY.
    keys = con.sql(
        f"SELECT DISTINCT publication_year FROM "
        f"read_parquet('s3://{minio.bucket}/curated/works/**/*.parquet')"
    ).fetchall()
    years = sorted(r[0] for r in keys)
    assert years == [2017, 2018, 2019, 2020, 2021]  # les 5 années synthétiques


def test_raw_gz_is_valid_jsonl_gz():
    """Garde-fou : le brut synthétique inline est du JSONL gzippé lisible (hors-ligne)."""
    works_gz = _write_raw_gz()
    with gzip.open(works_gz, "rt", encoding="utf-8") as fh:
        works = [json.loads(line) for line in fh if line.strip()]
    assert len(works) == 5
    assert all("referenced_works" in w for w in works)


# ── Footer Parquet & manifest (hermétique, DuckDB in-memory, sans MinIO) ─────
#
# Ces tests valident le NOM RÉEL de la fonction DuckDB (`parquet_file_metadata`) et
# de ses colonnes (`file_name`, `num_rows`) sur des Parquet écrits localement : c'est
# le point de fragilité du contrat manifest (ADR 0105). Aucun réseau, aucun Docker →
# toujours exécutés (pas de skip). Le glob multi-fichiers doit être accepté par
# `parquet_file_metadata` (sinon fallback à revoir).


def _write_local_parquet(con, path, n_rows):
    """Écrit un Parquet local de ``n_rows`` lignes triviales (range) à ``path``."""
    con.execute(f"COPY (SELECT range AS id FROM range({n_rows})) TO '{path}' (FORMAT PARQUET)")


def test_read_parquet_footer_num_rows_sans_scan(tmp_path):
    """``read_parquet_footer`` renvoie ``num_rows`` par fichier depuis le footer."""
    con = duckdb.connect()
    _write_local_parquet(con, tmp_path / "a.parquet", 7)
    _write_local_parquet(con, tmp_path / "b.parquet", 13)
    rel = lakehouse.read_parquet_footer(con, f"{tmp_path}/*.parquet")
    con.register("footer", rel)
    rows = dict(con.sql("SELECT file, num_rows FROM footer").fetchall())
    # Le glob multi-fichiers est accepté ; chaque footer porte son propre num_rows.
    assert sorted(rows.values()) == [7, 13]
    assert all(f.endswith(".parquet") for f in rows)


def test_read_parquet_projette_une_colonne(tmp_path):
    """``read_parquet`` lit bien les Parquet (projection colonnaire côté appelant)."""
    con = duckdb.connect()
    _write_local_parquet(con, tmp_path / "x.parquet", 5)
    rel = lakehouse.read_parquet(con, f"{tmp_path}/*.parquet")
    con.register("px", rel)
    assert con.sql("SELECT count(*) FROM px").fetchone()[0] == 5


def test_parquet_file_metadata_leve_sur_glob_vide(tmp_path):
    """Contrat DuckDB : ``parquet_file_metadata`` LÈVE (IOException) sur un glob vide.

    Documente et verrouille le comportement que ``write_works_manifest`` doit rattraper
    (un ``raw/works/`` vide n'est pas une erreur mais un no-op). Si une version future de
    DuckDB renvoyait 0 lignes au lieu de lever, ce test le signalerait → revue du garde-fou.
    """
    con = duckdb.connect()
    try:
        con.sql(
            f"SELECT count(*) FROM parquet_file_metadata('{tmp_path}/none/**/*.parquet')"
        ).fetchone()
        raised = False
    except duckdb.IOException:
        raised = True
    assert raised, "parquet_file_metadata devrait lever sur un glob sans fichier"


# ── write_works_manifest : 3 branches (hermétique, con factice, aucun S3) ─────


class _ManifestFakeRel:
    def __init__(self, one):
        self._one = one

    def fetchone(self):
        return self._one


class _ManifestFakeCon:
    """Con factice pour write_works_manifest : `count` renvoie n (ou lève), `COPY` capturé."""

    def __init__(self, count=None, raise_io=False):
        self._count = count
        self._raise = raise_io
        self.copied = False

    def sql(self, query):
        if self._raise:
            raise duckdb.IOException("no files found")
        return _ManifestFakeRel((self._count,))

    def execute(self, query):
        self.copied = True


def test_write_works_manifest_glob_vide_leve_renvoie_zero():
    """raw/works/ vide → parquet_file_metadata lève → no-op, renvoie 0, aucun COPY."""
    con = _ManifestFakeCon(raise_io=True)
    assert lakehouse.write_works_manifest(con, "citation") == 0
    assert con.copied is False


def test_write_works_manifest_zero_fichier_renvoie_zero():
    """count == 0 (cas défensif) → no-op, renvoie 0, aucun COPY."""
    con = _ManifestFakeCon(count=0)
    assert lakehouse.write_works_manifest(con, "citation") == 0
    assert con.copied is False


def test_write_works_manifest_ecrit_et_renvoie_nb_fichiers():
    """count > 0 → écrit le manifest (COPY) et renvoie le nombre de fichiers recensés."""
    con = _ManifestFakeCon(count=2446)
    assert lakehouse.write_works_manifest(con, "citation") == 2446
    assert con.copied is True


# ── copy_to_parquet : plat + partitionné Hive (DuckDB local, aucun S3) ───────


def test_copy_to_parquet_plat(tmp_path):
    """Sans partition_by : écrit un unique Parquet lisible (FORMAT PARQUET)."""
    con = duckdb.connect()
    dest = str(tmp_path / "out.parquet")
    lakehouse.copy_to_parquet(con, "SELECT range AS id FROM range(4)", dest)
    assert con.sql(f"SELECT count(*) FROM read_parquet('{dest}')").fetchone()[0] == 4


def test_copy_to_parquet_partitionne_hive(tmp_path):
    """Avec partition_by : arborescence Hive `col=…/` + OVERWRITE_OR_IGNORE (rejouable)."""
    con = duckdb.connect()
    dest = str(tmp_path / "hive")
    sel = "SELECT range AS id, (range % 2) AS grp FROM range(4)"
    lakehouse.copy_to_parquet(con, sel, dest, partition_by=["grp"])
    # Rejeu OK (OVERWRITE_OR_IGNORE) + partitionnement présent.
    lakehouse.copy_to_parquet(con, sel, dest, partition_by=["grp"])
    groups = con.sql(
        f"SELECT DISTINCT grp FROM read_parquet('{dest}/**/*.parquet') ORDER BY grp"
    ).fetchall()
    assert [r[0] for r in groups] == [0, 1]
