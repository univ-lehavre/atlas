"""Smoke hermétique des modèles dbt staging → curated → marts (étapes 3.2/3.3, ADR 0057).

« Preuve de mécanique » : lance un VRAI `dbt build` contre le MinIO épinglé chargé
des fixtures synthétiques, puis relit le Parquet écrit sur S3 et vérifie :
  - `curated_edges` = exactement les 3 arêtes golden (W101→W201, W102→W201, W202→W101) ;
  - `marts_collab_pairs` (3.3) = la paire (Alice, Bob) avec cross_citations=3, a_to_b=2,
    b_to_a=1 (GOLDEN.md) ;
  - `curated_work_topics`/`curated_work_keywords` (lot researchers) = provenance grain
    publication (work_id, label) golden, scores < 0,3 conservés (ADR 0059) ;
  - déterminisme : un 2ᵉ run (run=<id> distinct) produit un contenu canonique identique
    (sha256 des lignes triées — PAS des octets Parquet, que DuckDB ne garantit pas
    bit-à-bit) et n'écrase pas la partition du 1ᵉʳ run (immutabilité).

S'auto-saute si Docker (donc MinIO) est absent : hors chemin de test par défaut sans
Docker, comme les autres tests d'intégration du dépôt.
"""

import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path

import duckdb
import pytest
from dagster import build_asset_context

import citation_dagster.assets.manifest as cm
from citation_dagster import lakehouse
from citation_dagster.dbt import CURATED_DT
from citation_dagster.resources import (
    DuckDBS3Config,
    ceph_target_from_env,
    render_rclone_config,
)
from tests.conftest import load_raw_fixtures, requires_rclone

_DBT_PROJECT = Path(__file__).resolve().parents[2] / "citation-dbt"

# Arêtes attendues (GOLDEN.md) — ids OpenAlex complets, dédupliqués.
_GOLDEN_EDGES = {
    ("https://openalex.org/W101", "https://openalex.org/W201"),
    ("https://openalex.org/W102", "https://openalex.org/W201"),
    ("https://openalex.org/W202", "https://openalex.org/W101"),
}

# Citations croisées attendues (GOLDEN.md) pour la paire (Alice, Bob), canonique
# author_a < author_b : A1000000001 < A1000000002 → a_to_b = Alice→Bob = 2,
# b_to_a = Bob→Alice = 1, cross_citations = 3.
_ALICE = "https://openalex.org/A1000000001"
_BOB = "https://openalex.org/A1000000002"
_GOLDEN_PAIR = (_ALICE, _BOB, 3, 2, 1)  # author_a, author_b, cross, a_to_b, b_to_a


def _dbt_build(
    minio, curated_run: str, curated_dt: str = "2020-01", opposition_pairs: str = "[]"
) -> subprocess.CompletedProcess:
    """Lance `dbt build` (staging+curated+marts+tests) contre MinIO, pour un run donné.

    `marts_root` redirige le mart « servi » (3.4) vers le bucket MinIO ; `curated_dt`
    est paramétrable pour aligner la partition avec l'asset manifest (qui fige
    CURATED_DT) lors du test d'intégration du manifest. `opposition_pairs` (JSON,
    défaut vide) pilote la purge chirurgicale RGPD (lot 5).
    """
    env = {
        **os.environ,
        "AWS_ACCESS_KEY_ID": minio.access_key,
        "AWS_SECRET_ACCESS_KEY": minio.secret_key,
        "BUCKET_HOST": minio.endpoint.split(":")[0],
        "BUCKET_PORT": minio.endpoint.split(":")[1],
        "DBT_S3_USE_SSL": "false",
    }
    dbt_vars = {
        "raw_root": f"s3://{minio.bucket}/raw",
        "curated_root": f"s3://{minio.bucket}/curated",
        "marts_root": f"s3://{minio.bucket}/marts",
        "curated_dt": curated_dt,
        "curated_run": curated_run,
        "opposition_pairs": opposition_pairs,
    }
    return subprocess.run(
        [
            "uv",
            "run",
            "dbt",
            "build",
            "--project-dir",
            os.fspath(_DBT_PROJECT),
            "--profiles-dir",
            os.fspath(_DBT_PROJECT),
            "--target",
            "dev",
            "--vars",
            json.dumps(dbt_vars),
        ],
        cwd=os.fspath(_DBT_PROJECT.parent / "citation-dagster"),
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )


def _read_edges(con: duckdb.DuckDBPyConnection, bucket: str, run: str) -> list[tuple]:
    glob = f"s3://{bucket}/curated/curated_edges/dt=2020-01/run={run}/*.parquet"
    return con.sql(
        f"SELECT citing_work_id, cited_work_id FROM read_parquet('{glob}') "
        "ORDER BY citing_work_id, cited_work_id"
    ).fetchall()


def _canonical_sha256(rows: list[tuple]) -> str:
    payload = "\n".join(f"{a}>{b}" for a, b in rows)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _read_collab_pairs(con: duckdb.DuckDBPyConnection, bucket: str, run: str) -> list[tuple]:
    # Le mart « servi » vit désormais sous marts/collab/ (étape 3.4), plus curated/.
    glob = f"s3://{bucket}/marts/collab/dt=2020-01/run={run}/*.parquet"
    return con.sql(
        f"SELECT author_a, author_b, cross_citations, a_to_b, b_to_a "
        f"FROM read_parquet('{glob}') ORDER BY author_a, author_b"
    ).fetchall()


def test_dbt_build_curated_edges_golden_and_deterministic(minio):
    """dbt build réel → curated_edges golden (3 arêtes) + déterminisme + immutabilité."""
    load_raw_fixtures(minio)

    # ── Run 1 ────────────────────────────────────────────────────────────────
    r1 = _dbt_build(minio, curated_run="smoke1")
    assert r1.returncode == 0, f"dbt build (run 1) a échoué :\n{r1.stdout}\n{r1.stderr}"

    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    con = lakehouse.connect(cfg)

    edges1 = _read_edges(con, minio.bucket, "smoke1")
    assert len(edges1) == 3, f"attendu 3 arêtes golden, obtenu {len(edges1)} : {edges1}"
    assert set(edges1) == _GOLDEN_EDGES

    # Les autres modèles curated sont bien matérialisés (works/authors/authorships).
    works_n = con.sql(
        f"SELECT count(*) FROM read_parquet("
        f"'s3://{minio.bucket}/curated/curated_works/dt=2020-01/run=smoke1/*.parquet')"
    ).fetchone()[0]
    assert works_n == 5  # W101, W102, W201, W202, W303 (co-écrit Alice+Bob)

    # ── Run 2 (id distinct) : déterminisme + immutabilité ────────────────────
    r2 = _dbt_build(minio, curated_run="smoke2")
    assert r2.returncode == 0, f"dbt build (run 2) a échoué :\n{r2.stdout}\n{r2.stderr}"

    edges2 = _read_edges(con, minio.bucket, "smoke2")
    # Même contenu canonique (déterminisme au niveau ligne/ordre, ADR 0057).
    assert _canonical_sha256(edges1) == _canonical_sha256(edges2)
    # La partition du run 1 n'a pas été écrasée (immutabilité : préfixes distincts).
    assert _read_edges(con, minio.bucket, "smoke1") == edges1


def _read_work_topics(con: duckdb.DuckDBPyConnection, bucket: str, run: str) -> list[tuple]:
    glob = f"s3://{bucket}/curated/curated_work_topics/dt=2020-01/run={run}/*.parquet"
    return con.sql(
        f"SELECT work_id, topic_id FROM read_parquet('{glob}') ORDER BY work_id, topic_id"
    ).fetchall()


def _read_work_keywords(con: duckdb.DuckDBPyConnection, bucket: str, run: str) -> list[tuple]:
    glob = f"s3://{bucket}/curated/curated_work_keywords/dt=2020-01/run={run}/*.parquet"
    return con.sql(
        f"SELECT work_id, keyword_id, score FROM read_parquet('{glob}') "
        "ORDER BY work_id, keyword_id"
    ).fetchall()


# Provenance topics/keywords attendue (GOLDEN.md), grain publication (work_id, label) :
# T20001 PARTAGÉ par W101+W102 → 2 lignes distinctes (jamais agrégé par author_id, ADR 0059).
_W = "https://openalex.org/W"
_T = "https://openalex.org/T"
_K = "https://openalex.org/keywords/"
_GOLDEN_WORK_TOPICS = {
    (_W + "101", _T + "20001"),
    (_W + "101", _T + "20002"),
    (_W + "102", _T + "20001"),
    (_W + "201", _T + "20003"),
    (_W + "202", _T + "20004"),
    (_W + "303", _T + "20005"),  # W303 co-écrit Alice+Bob
}
_GOLDEN_WORK_KEYWORDS = {
    (_W + "101", _K + "plasma"),
    (_W + "101", _K + "shield"),
    (_W + "102", _K + "plasma"),
    (_W + "201", _K + "chemistry"),
    (_W + "201", _K + "reagent"),
    (_W + "202", _K + "chemistry"),
    (_W + "303", _K + "fusion"),  # W303 co-écrit Alice+Bob
}


def test_dbt_build_work_topics_keywords_provenance_golden(minio):
    """dbt build réel → curated_work_topics/keywords : provenance grain publication
    (work_id, label), golden exact, score NON filtré (< 0,3 conservés, ADR 0059),
    déterministe d'un run à l'autre."""
    load_raw_fixtures(minio)

    r1 = _dbt_build(minio, curated_run="smoke_lex1")
    assert r1.returncode == 0, f"dbt build (run 1) a échoué :\n{r1.stdout}\n{r1.stderr}"

    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    con = lakehouse.connect(cfg)

    topics1 = _read_work_topics(con, minio.bucket, "smoke_lex1")
    # Grain (work_id, topic_id) distinct : T20001 partagé W101/W102 = 2 lignes, pas 1.
    assert len(topics1) == 6, f"attendu 6 lignes topics golden, obtenu {len(topics1)} : {topics1}"
    assert set(topics1) == _GOLDEN_WORK_TOPICS

    keywords1 = _read_work_keywords(con, minio.bucket, "smoke_lex1")
    assert len(keywords1) == 7, f"attendu 7 lignes keywords golden, obtenu {len(keywords1)}"
    assert {(w, k) for w, k, _ in keywords1} == _GOLDEN_WORK_KEYWORDS
    # Provenance COMPLÈTE : les scores < 0,3 (shield 0,21 ; reagent 0,11) sont conservés.
    # Le seuil ≥ 0,3 est une décision d'agrégation du mart par author_id (lot 2), pas du curated.
    assert sum(1 for _w, _k, s in keywords1 if s < 0.3) == 2

    # Déterminisme : un 2ᵉ run produit le même contenu canonique (ADR 0057).
    r2 = _dbt_build(minio, curated_run="smoke_lex2")
    assert r2.returncode == 0, f"dbt build (run 2) a échoué :\n{r2.stdout}\n{r2.stderr}"
    assert _read_work_topics(con, minio.bucket, "smoke_lex2") == topics1
    assert _read_work_keywords(con, minio.bucket, "smoke_lex2") == keywords1


def test_dbt_build_marts_collab_pairs_golden(minio):
    """dbt build réel → marts_collab_pairs : la paire (Alice, Bob) a les valeurs golden."""
    load_raw_fixtures(minio)
    r = _dbt_build(minio, curated_run="smoke3")
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"

    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    con = lakehouse.connect(cfg)

    pairs = _read_collab_pairs(con, minio.bucket, "smoke3")
    # Une seule paire dans les fixtures : (Alice, Bob), valeurs exactes (GOLDEN.md).
    assert len(pairs) == 1, f"attendu 1 paire golden, obtenu {len(pairs)} : {pairs}"
    assert pairs[0] == _GOLDEN_PAIR
    # cross_citations est bien la somme des deux sens.
    _a, _b, cross, a_to_b, b_to_a = pairs[0]
    assert cross == a_to_b + b_to_a


def _read_researchers(con: duckdb.DuckDBPyConnection, bucket: str, run: str) -> list[tuple]:
    glob = f"s3://{bucket}/marts/researchers/dt=2020-01/run={run}/*.parquet"
    return con.sql(
        f"SELECT author_id, kind, label_id, weight, freq FROM read_parquet('{glob}') "
        "ORDER BY author_id, kind, label_id"
    ).fetchall()


# Agrégat lexical golden (GOLDEN.md), grain (author_id, kind, label_id). Poids = somme
# des scores des publications du chercheur portant le label (>= seuil) ; freq = nombre
# de ces publications. Seuils différenciés topic >= 0,5 / keyword >= 0,2 :
# - reagent (0,1138 < 0,2) est ABSENT — prouve le filtre keyword ;
# - shield (0,2103 >= 0,2) est PRÉSENT ;
# - tous les topics (0,95–0,999) passent >= 0,5.
# T20001 (W101 0,9991 + W102 0,9876) et plasma (W101 0,5598 + W102 0,4471) ont freq=2.
# T20005/fusion viennent de W303 co-écrit Alice+Bob → présents pour LES DEUX auteurs.
_K = "https://openalex.org/keywords/"
_GOLDEN_RESEARCHERS = {
    # (author_id, kind, label_id): (weight, freq)
    (_ALICE, "topic", "https://openalex.org/T20001"): (1.9867, 2),
    (_ALICE, "topic", "https://openalex.org/T20002"): (0.9982, 1),
    (_ALICE, "topic", "https://openalex.org/T20005"): (0.9500, 1),
    (_ALICE, "keyword", _K + "plasma"): (1.0069, 2),
    (_ALICE, "keyword", _K + "shield"): (0.2103, 1),
    (_ALICE, "keyword", _K + "fusion"): (0.8000, 1),
    (_BOB, "topic", "https://openalex.org/T20003"): (0.9678, 1),
    (_BOB, "topic", "https://openalex.org/T20004"): (0.9510, 1),
    (_BOB, "topic", "https://openalex.org/T20005"): (0.9500, 1),
    (_BOB, "keyword", _K + "chemistry"): (1.5041, 2),
    (_BOB, "keyword", _K + "fusion"): (0.8000, 1),
}


def test_dbt_build_marts_researchers_golden_and_deterministic(minio):
    """dbt build réel → marts_researchers : agrégat lexical par author_id golden
    (11 lignes, seuils différenciés topic>=0,5 / keyword>=0,2, reagent coupé) +
    déterminisme du contenu sur 2 runs."""
    load_raw_fixtures(minio)

    r1 = _dbt_build(minio, curated_run="smoke_res1")
    assert r1.returncode == 0, f"dbt build (run 1) a échoué :\n{r1.stdout}\n{r1.stderr}"

    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    con = lakehouse.connect(cfg)

    rows1 = _read_researchers(con, minio.bucket, "smoke_res1")
    assert len(rows1) == 11, f"attendu 11 lignes golden, obtenu {len(rows1)} : {rows1}"
    # reagent (0,1138) coupé par le seuil keyword 0,2 ; aucun label sous son seuil.
    assert not any("reagent" in label_id for _a, _k, label_id, _w, _f in rows1)
    # Chaque ligne servie a le poids et la fréquence golden attendus.
    for author_id, kind, label_id, weight, freq in rows1:
        assert (author_id, kind, label_id) in _GOLDEN_RESEARCHERS, (
            f"label inattendu : {(author_id, kind, label_id)}"
        )
        exp_weight, exp_freq = _GOLDEN_RESEARCHERS[(author_id, kind, label_id)]
        assert weight == pytest.approx(exp_weight, abs=1e-4)
        assert freq == exp_freq

    # Déterminisme : un 2ᵉ run produit le même contenu (ADR 0057).
    r2 = _dbt_build(minio, curated_run="smoke_res2")
    assert r2.returncode == 0, f"dbt build (run 2) a échoué :\n{r2.stdout}\n{r2.stderr}"
    assert _read_researchers(con, minio.bucket, "smoke_res2") == rows1


def test_dbt_build_marts_researchers_opposition_rgpd(minio):
    """PURGE CHIRURGICALE RGPD (lot 5) : une opposition (author_id, work_id) ne retire
    QUE le périmètre revendiqué, jamais la donnée d'autrui ni un author_id en bloc."""
    load_raw_fixtures(minio)
    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    con = lakehouse.connect(cfg)

    def rows_as_dict(run):
        return {
            (a, k, lid): (round(w, 4), f)
            for a, k, lid, w, f in _read_researchers(con, minio.bucket, run)
        }

    # ── Cas 1 — opposition (Alice, W303) : anti-sur-effacement CO-AUTEUR ──────────
    # W303 est co-écrit Alice+Bob. Alice s'oppose à SA participation à W303.
    r = _dbt_build(
        minio,
        curated_run="opp_w303",
        opposition_pairs=json.dumps([{"author_id": _ALICE, "work_id": _W + "303"}]),
    )
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"
    m = rows_as_dict("opp_w303")
    t5 = "https://openalex.org/T20005"
    fusion = _K + "fusion"
    # Alice PERD ce que W303 lui apportait en propre (T20005, fusion).
    assert (_ALICE, "topic", t5) not in m
    assert (_ALICE, "keyword", fusion) not in m
    # Bob CONSERVE T20005 et fusion (portés par SA participation à W303, non opposée).
    # PREUVE anti-sur-effacement : l'opposition d'Alice ne touche PAS le co-auteur Bob.
    assert m[(_BOB, "topic", t5)] == (0.9500, 1)
    assert m[(_BOB, "keyword", fusion)] == (0.8000, 1)
    # Le reste d'Alice (hors W303) intact ; tout Bob intact.
    assert m[(_ALICE, "topic", "https://openalex.org/T20001")] == (1.9867, 2)
    assert m[(_BOB, "keyword", _K + "chemistry")] == (1.5041, 2)

    # ── Cas 2 — opposition (Alice, W101) : label PARTAGÉ survit via W102 ──────────
    r = _dbt_build(
        minio,
        curated_run="opp_w101",
        opposition_pairs=json.dumps([{"author_id": _ALICE, "work_id": _W + "101"}]),
    )
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"
    m = rows_as_dict("opp_w101")
    # T20001 est sur W101 ET W102 : SURVIT via W102 (poids/freq re-dérivés sur W102 seul).
    assert m[(_ALICE, "topic", "https://openalex.org/T20001")] == (0.9876, 1)
    # plasma idem (W101 0,5598 + W102 0,4471 → reste 0,4471 via W102).
    assert m[(_ALICE, "keyword", _K + "plasma")] == (0.4471, 1)
    # T20002 et shield (W101 seul) DISPARAISSENT.
    assert (_ALICE, "topic", "https://openalex.org/T20002") not in m
    assert (_ALICE, "keyword", _K + "shield") not in m
    # Bob totalement intact.
    assert m[(_BOB, "topic", "https://openalex.org/T20003")] == (0.9678, 1)

    # ── Cas 3 — NON-RÉGRESSION : opposition vide == golden 11 lignes ─────────────
    r = _dbt_build(minio, curated_run="opp_empty", opposition_pairs="[]")
    assert r.returncode == 0
    assert len(_read_researchers(con, minio.bucket, "opp_empty")) == 11


# ── Manifest atomique du mart collab (étape 3.4) ─────────────────────────────


def _set_minio_env(monkeypatch, minio) -> None:
    """Pointe l'environnement S3 (rclone + DuckDB) vers le MinIO de test."""
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", minio.access_key)
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", minio.secret_key)
    monkeypatch.setenv("BUCKET_HOST", minio.endpoint.split(":")[0])
    monkeypatch.setenv("BUCKET_PORT", minio.endpoint.split(":")[1])
    monkeypatch.setenv("BUCKET_NAME", minio.bucket)
    monkeypatch.delenv("OPENLINEAGE_URL", raising=False)


def _rclone_lsjson(minio, prefix: str) -> list:
    """Liste un préfixe du bucket MinIO via un rclone configuré à la volée."""
    target = ceph_target_from_env()
    with tempfile.TemporaryDirectory() as tmp:
        cfg = Path(tmp) / "rclone.conf"
        cfg.write_text(render_rclone_config(target))
        proc = cm._run_rclone(["lsjson", prefix], cfg)
    return json.loads(proc.stdout) if proc.stdout.strip() else []


def test_collab_manifest_atomic_and_correct(minio, monkeypatch):
    """e2e : dbt écrit le mart sous marts/collab/, l'asset écrit un manifest correct."""
    requires_rclone()  # l'asset + ce test shellent rclone (absent de l'hôte CI/contributeur)
    load_raw_fixtures(minio)
    _set_minio_env(monkeypatch, minio)

    # Le run_id de l'asset (invocation directe) est 'EPHEMERAL' ; on aligne le dbt build
    # dessus (même dt=CURATED_DT, même run) pour que les préfixes coïncident.
    run_id = "EPHEMERAL"
    r = _dbt_build(minio, curated_run=run_id, curated_dt=CURATED_DT)
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"

    prefix_s3 = f"ceph:{minio.bucket}/marts/collab/dt={CURATED_DT}/run={run_id}"

    # ── NÉGATIF : avant l'asset, le mart existe mais PAS de manifest (sentinelle) ──
    names_before = {e["Name"] for e in _rclone_lsjson(minio, prefix_s3)}
    assert "part.parquet" in names_before
    assert "manifest.json" not in names_before  # un consommateur refuserait de lire

    # ── POSITIF : l'asset écrit le manifest EN DERNIER ──
    res = cm.collab_manifest(build_asset_context())
    assert res.metadata["row_count"].value == 1  # paire golden unique
    assert res.metadata["partition"].value == f"dt={CURATED_DT}/run={run_id}"

    names_after = {e["Name"] for e in _rclone_lsjson(minio, prefix_s3)}
    assert "manifest.json" in names_after

    # Relire le manifest et vérifier le contrat contre les octets réels.
    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    con = lakehouse.connect(cfg)
    man = json.loads(
        con.sql(
            f"SELECT content FROM read_text("
            f"'s3://{minio.bucket}/marts/collab/dt={CURATED_DT}/run={run_id}/manifest.json')"
        ).fetchone()[0]
    )
    assert man["schema_version"] == cm.MANIFEST_SCHEMA_VERSION == 1
    assert man["row_count"] == 1
    assert man["partition"] == f"dt={CURATED_DT}/run={run_id}"
    assert len(man["parts"]) == 1
    part = man["parts"][0]
    assert part["key"] == f"marts/collab/dt={CURATED_DT}/run={run_id}/part.parquet"

    # sha256 + bytes recalculés INDÉPENDAMMENT sur le même objet.
    target = ceph_target_from_env()
    with tempfile.TemporaryDirectory() as tmp:
        rc = Path(tmp) / "rclone.conf"
        rc.write_text(render_rclone_config(target))
        raw = subprocess.run(
            ["rclone", "--config", str(rc), "cat", f"{prefix_s3}/part.parquet"],
            capture_output=True,
            check=True,
        ).stdout
    assert hashlib.sha256(raw).hexdigest() == part["sha256"]
    assert len(raw) == part["bytes"]


def test_ge_checks_pass_on_served_fixtures(minio, monkeypatch):
    """Asset checks Great Expectations (3.5a) verts sur le brut + curated + mart réels."""
    from citation_dagster.assets import quality as q

    load_raw_fixtures(minio)
    _set_minio_env(monkeypatch, minio)
    run_id = "gesmoke"
    r = _dbt_build(minio, curated_run=run_id, curated_dt=CURATED_DT)
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"

    # Les trois portes de qualité passent sur la donnée servie par dbt.
    assert q.check_raw(minio.bucket).passed is True
    assert q.check_curated_edges(minio.bucket, run_id).passed is True
    assert q.check_marts(minio.bucket, run_id).passed is True
    # Mart lexical researchers (lot 2) : contrat de colonnes + bornes weight/freq.
    assert q.check_researchers(minio.bucket, run_id).passed is True


def test_researchers_manifest_atomic_and_correct(minio, monkeypatch):
    """e2e : dbt écrit marts/researchers, l'asset researchers_manifest écrit un manifest
    correct (sentinelle atomique, sha256 recalculé), sans toucher au mart collab."""
    requires_rclone()
    load_raw_fixtures(minio)
    _set_minio_env(monkeypatch, minio)
    run_id = "EPHEMERAL"  # = run_id de build_asset_context (invocation directe)
    r = _dbt_build(minio, curated_run=run_id, curated_dt=CURATED_DT)
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"

    prefix_s3 = f"ceph:{minio.bucket}/marts/researchers/dt={CURATED_DT}/run={run_id}"
    names_before = {e["Name"] for e in _rclone_lsjson(minio, prefix_s3)}
    assert "part.parquet" in names_before
    assert "manifest.json" not in names_before  # sentinelle : pas encore écrite

    res = cm.researchers_manifest(build_asset_context())
    assert res.metadata["row_count"].value == 11  # 11 lignes golden (lot 2 + W303 co-auteur)
    assert res.metadata["partition"].value == f"dt={CURATED_DT}/run={run_id}"

    cfg = DuckDBS3Config(
        key_id=minio.access_key,
        secret=minio.secret_key,
        endpoint=minio.endpoint,
        use_ssl=False,
        region="us-east-1",
        bucket=minio.bucket,
    )
    con = lakehouse.connect(cfg)
    man = json.loads(
        con.sql(
            f"SELECT content FROM read_text("
            f"'s3://{minio.bucket}/marts/researchers/dt={CURATED_DT}/run={run_id}/manifest.json')"
        ).fetchone()[0]
    )
    assert man["schema_version"] == cm.MANIFEST_SCHEMA_VERSION == 1
    assert man["row_count"] == 11
    part = man["parts"][0]
    # La clé porte bien le préfixe researchers (PAS collab) : preuve du paramétrage.
    assert part["key"] == f"marts/researchers/dt={CURATED_DT}/run={run_id}/part.parquet"

    target = ceph_target_from_env()
    with tempfile.TemporaryDirectory() as tmp:
        rc = Path(tmp) / "rclone.conf"
        rc.write_text(render_rclone_config(target))
        raw = subprocess.run(
            ["rclone", "--config", str(rc), "cat", f"{prefix_s3}/part.parquet"],
            capture_output=True,
            check=True,
        ).stdout
    assert hashlib.sha256(raw).hexdigest() == part["sha256"]
    assert len(raw) == part["bytes"]
