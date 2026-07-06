"""Smoke hermétique des modèles dbt staging → curated → marts (ADR 0057, ADR 0105).

« Preuve de mécanique » : lance un VRAI `dbt build` contre le MinIO épinglé chargé de la
fixture MART EUNICoast synthétique (déjà filtrée au périmètre), puis relit le Parquet écrit
sur S3 et vérifie :
  - `marts_collab_pairs` = CO-AUTORAT golden : (Alice,Bob)=3, (Alice,Carol)=2, (Bob,Carol)=1 ;
  - `curated_work_topics`/`curated_work_keywords` = provenance grain publication
    (work_id, label) golden, scores < 0,3 conservés (ADR 0059) ;
  - `marts_researchers` = agrégat lexical par author_id golden (seuils différenciés) ;
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

# Trois chercheurs, tous affiliés EUNICoast (le mart EST le périmètre filtré, ADR 0105).
_ALICE = "https://openalex.org/A1000000001"
_BOB = "https://openalex.org/A1000000002"
_CAROL = "https://openalex.org/A1000000003"

# Co-autorat attendu (GOLDEN.md), forme canonique author_a < author_b, avec
# co_publications = nombre de works co-signés :
#   (Alice, Bob)   : W1, W2, W4 → 3
#   (Alice, Carol) : W3, W4     → 2
#   (Bob, Carol)   : W4         → 1
_GOLDEN_PAIRS = {
    (_ALICE, _BOB): 3,
    (_ALICE, _CAROL): 2,
    (_BOB, _CAROL): 1,
}


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
        "mart_root": f"s3://{minio.bucket}/mart_eunicoast",
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


def _canonical_sha256(rows: list[tuple]) -> str:
    payload = "\n".join("|".join(str(c) for c in row) for row in rows)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _read_collab_pairs(con: duckdb.DuckDBPyConnection, bucket: str, run: str) -> list[tuple]:
    # Le mart « servi » vit sous marts/collab/ (étape 3.4).
    glob = f"s3://{bucket}/marts/collab/dt=2020-01/run={run}/*.parquet"
    return con.sql(
        f"SELECT author_a, author_b, co_publications "
        f"FROM read_parquet('{glob}') WHERE author_a IS NOT NULL "
        f"ORDER BY author_a, author_b"
    ).fetchall()


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
# T20001 PARTAGÉ par W1+W2 → 2 lignes distinctes (jamais agrégé par author_id, ADR 0059).
_W = "https://openalex.org/W"
_T = "https://openalex.org/T"
_K = "https://openalex.org/keywords/"
_GOLDEN_WORK_TOPICS = {
    (_W + "1", _T + "20001"),
    (_W + "1", _T + "20002"),
    (_W + "2", _T + "20001"),
    (_W + "3", _T + "20003"),
    (_W + "4", _T + "20005"),
    (_W + "5", _T + "20004"),
    # ── solo antérieures (baseline d'uplift, lot 3) ──
    (_W + "6", _T + "20001"),
    (_W + "7", _T + "20002"),
    (_W + "8", _T + "20001"),
    (_W + "9", _T + "20005"),
    (_W + "10", _T + "20003"),
}
_GOLDEN_WORK_KEYWORDS = {
    (_W + "1", _K + "plasma"),
    (_W + "1", _K + "shield"),
    (_W + "2", _K + "plasma"),
    (_W + "3", _K + "chemistry"),
    (_W + "3", _K + "reagent"),
    (_W + "4", _K + "fusion"),
    (_W + "5", _K + "chemistry"),
    # ── solo antérieures (baseline d'uplift, lot 3) ──
    (_W + "6", _K + "plasma"),
    (_W + "7", _K + "shield"),
    (_W + "8", _K + "plasma"),
    (_W + "9", _K + "fusion"),
    (_W + "10", _K + "chemistry"),
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
    # Grain (work_id, topic_id) distinct : 5 co/solo topics distincts sur 11 works
    # (T20001 partagé W1/W2/W6/W8, T20005 par W4/W9, T20002 par W1/W7, T20003 par W3/W10).
    assert len(topics1) == 11, f"attendu 11 lignes topics golden, obtenu {len(topics1)} : {topics1}"
    assert set(topics1) == _GOLDEN_WORK_TOPICS

    keywords1 = _read_work_keywords(con, minio.bucket, "smoke_lex1")
    assert len(keywords1) == 12, f"attendu 12 lignes keywords golden, obtenu {len(keywords1)}"
    assert {(w, k) for w, k, _ in keywords1} == _GOLDEN_WORK_KEYWORDS
    # Provenance COMPLÈTE : les scores < 0,3 (shield W1 0,21 ; reagent W3 0,11) sont conservés.
    # Le seuil ≥ 0,3 est une décision d'agrégation du mart par author_id (lot 2), pas du curated.
    assert sum(1 for _w, _k, s in keywords1 if s < 0.3) == 2

    # Déterminisme : un 2ᵉ run produit le même contenu canonique (ADR 0057).
    r2 = _dbt_build(minio, curated_run="smoke_lex2")
    assert r2.returncode == 0, f"dbt build (run 2) a échoué :\n{r2.stdout}\n{r2.stderr}"
    assert _read_work_topics(con, minio.bucket, "smoke_lex2") == topics1
    assert _read_work_keywords(con, minio.bucket, "smoke_lex2") == keywords1


def test_dbt_build_marts_collab_pairs_golden(minio):
    """dbt build réel → marts_collab_pairs : les 3 paires de co-autorat golden (GOLDEN.md)."""
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
    # Trois paires : (Alice,Bob)=3, (Alice,Carol)=2, (Bob,Carol)=1 (GOLDEN.md).
    assert len(pairs) == 3, f"attendu 3 paires golden, obtenu {len(pairs)} : {pairs}"
    got = {(a, b): n for a, b, n in pairs}
    assert got == _GOLDEN_PAIRS
    # Toutes les paires sont canoniques (author_a < author_b) et co_publications >= 1.
    for author_a, author_b, co_pub in pairs:
        assert author_a < author_b
        assert co_pub >= 1


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
# - shield (0,2103 / 0,3000 >= 0,2) est PRÉSENT ;
# - tous les topics (0,88–0,999) passent >= 0,5.
# Les solo antérieures W6..W10 (baseline d'uplift) DENSIFIENT les poids/freq : T20001 et
# plasma freq 3 chez Alice (W1,W2,W6) et Bob (W1,W2,W8) ; T20002/shield freq 2 chez Alice
# (W1,W7) ; T20005/fusion freq 2 chez Bob (W4,W9) ; T20003/chemistry freq 2 chez Carol
# (W3,W10). Le nombre de LIGNES reste 19 (les solo réutilisent des labels déjà présents).
_K = "https://openalex.org/keywords/"
_GOLDEN_RESEARCHERS = {
    # (author_id, kind, label_id): (weight, freq)
    # ── Alice : signe W1,W2,W3,W4,W5 + solo W6,W7 ──
    (_ALICE, "topic", "https://openalex.org/T20001"): (2.8967, 3),  # W1+W2+W6
    (_ALICE, "topic", "https://openalex.org/T20002"): (1.9182, 2),  # W1+W7
    (_ALICE, "topic", "https://openalex.org/T20003"): (0.9678, 1),
    (_ALICE, "topic", "https://openalex.org/T20004"): (0.9510, 1),
    (_ALICE, "topic", "https://openalex.org/T20005"): (0.9500, 1),
    (_ALICE, "keyword", _K + "plasma"): (1.6069, 3),  # W1+W2+W6
    (_ALICE, "keyword", _K + "shield"): (0.5103, 2),  # W1+W7
    (_ALICE, "keyword", _K + "chemistry"): (1.5041, 2),  # W3+W5
    (_ALICE, "keyword", _K + "fusion"): (0.8000, 1),
    # ── Bob : signe W1,W2,W4 + solo W8,W9 ──
    (_BOB, "topic", "https://openalex.org/T20001"): (2.8667, 3),  # W1+W2+W8
    (_BOB, "topic", "https://openalex.org/T20002"): (0.9982, 1),
    (_BOB, "topic", "https://openalex.org/T20005"): (1.8600, 2),  # W4+W9
    (_BOB, "keyword", _K + "plasma"): (1.5569, 3),  # W1+W2+W8
    (_BOB, "keyword", _K + "shield"): (0.2103, 1),
    (_BOB, "keyword", _K + "fusion"): (1.5000, 2),  # W4+W9
    # ── Carol : signe W3,W4 + solo W10 ──
    (_CAROL, "topic", "https://openalex.org/T20003"): (1.8978, 2),  # W3+W10
    (_CAROL, "topic", "https://openalex.org/T20005"): (0.9500, 1),
    (_CAROL, "keyword", _K + "chemistry"): (1.6414, 2),  # W3+W10
    (_CAROL, "keyword", _K + "fusion"): (0.8000, 1),
}


def test_dbt_build_marts_researchers_golden_and_deterministic(minio):
    """dbt build réel → marts_researchers : agrégat lexical par author_id golden
    (19 lignes, seuils différenciés topic>=0,5 / keyword>=0,2, reagent coupé) +
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
    assert len(rows1) == 19, f"attendu 19 lignes golden, obtenu {len(rows1)} : {rows1}"
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

    # ── Cas 1 — opposition (Alice, W4) : anti-sur-effacement CO-AUTEUR ────────────
    # W4 est le TRIO Alice+Bob+Carol. Alice s'oppose à SA participation à W4. T20005 et
    # fusion viennent de W4 SEUL pour elle → elle les perd ; Bob ET Carol les gardent.
    r = _dbt_build(
        minio,
        curated_run="opp_w4",
        opposition_pairs=json.dumps([{"author_id": _ALICE, "work_id": _W + "4"}]),
    )
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"
    m = rows_as_dict("opp_w4")
    t5 = "https://openalex.org/T20005"
    fusion = _K + "fusion"
    # Alice PERD ce que W4 lui apportait en propre (T20005, fusion) : ses 9 lignes → 7.
    assert (_ALICE, "topic", t5) not in m
    assert (_ALICE, "keyword", fusion) not in m
    # Bob CONSERVE T20005/fusion — portés par W4 (opposé côté Alice seule) ET son solo W9 :
    # ils SURVIVENT chez Bob à freq 2 (W4+W9). Carol les garde via W4 seul (freq 1).
    # PREUVE anti-sur-effacement : l'opposition d'Alice ne touche PAS ses co-auteurs.
    assert m[(_BOB, "topic", t5)] == (1.8600, 2)
    assert m[(_BOB, "keyword", fusion)] == (1.5000, 2)
    assert m[(_CAROL, "topic", t5)] == (0.9500, 1)
    assert m[(_CAROL, "keyword", fusion)] == (0.8000, 1)
    # Le reste d'Alice (hors W4) intact ; Bob et Carol intacts.
    assert m[(_ALICE, "topic", "https://openalex.org/T20001")] == (2.8967, 3)
    assert m[(_BOB, "keyword", _K + "plasma")] == (1.5569, 3)

    # ── Cas 2 — opposition (Alice, W1) : labels PARTAGÉS survivent via W2/W6/W7 ────
    r = _dbt_build(
        minio,
        curated_run="opp_w1",
        opposition_pairs=json.dumps([{"author_id": _ALICE, "work_id": _W + "1"}]),
    )
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"
    m = rows_as_dict("opp_w1")
    # T20001 est sur W1, W2 ET W6 (solo) : SURVIT via W2+W6 (poids/freq re-dérivés).
    assert m[(_ALICE, "topic", "https://openalex.org/T20001")] == (1.8976, 2)
    # plasma idem : reste W2 0,4471 + W6 0,6000 = 1,0471 (freq 2).
    assert m[(_ALICE, "keyword", _K + "plasma")] == (1.0471, 2)
    # T20002 et shield : W1 opposé, mais SURVIVENT via le solo W7 (freq 1) — la baseline
    # d'uplift a densifié la provenance, donc l'opposition d'un work ne les efface plus.
    assert m[(_ALICE, "topic", "https://openalex.org/T20002")] == (0.9200, 1)
    assert m[(_ALICE, "keyword", _K + "shield")] == (0.3000, 1)
    # Bob totalement intact (sa participation à W1 n'est pas opposée).
    assert m[(_BOB, "topic", "https://openalex.org/T20001")] == (2.8667, 3)
    assert m[(_BOB, "keyword", _K + "shield")] == (0.2103, 1)

    # ── Cas 3 — NON-RÉGRESSION : opposition vide == golden 19 lignes ─────────────
    r = _dbt_build(minio, curated_run="opp_empty", opposition_pairs="[]")
    assert r.returncode == 0
    assert len(_read_researchers(con, minio.bucket, "opp_empty")) == 19


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
    assert res.metadata["row_count"].value == 3  # 3 paires golden de co-autorat
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
    assert man["row_count"] == 3
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
    """Asset checks Great Expectations (3.5a) verts sur les marts servis réels.

    La fixture est désormais le MART EUNICoast (ADR 0105), plus le brut `raw/` : le
    contrat `check_raw` (couche `raw/works`) est prouvé en amont (raw_snapshot/mart_eunicoast),
    hors de ce smoke dbt. Le volet `check_curated_edges` a été retiré (plus de citations)."""
    from citation_dagster.assets import quality as q

    load_raw_fixtures(minio)
    _set_minio_env(monkeypatch, minio)
    run_id = "gesmoke"
    r = _dbt_build(minio, curated_run=run_id, curated_dt=CURATED_DT)
    assert r.returncode == 0, f"dbt build a échoué :\n{r.stdout}\n{r.stderr}"

    # Les portes de qualité passent sur les marts servis par dbt.
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
    assert res.metadata["row_count"].value == 19  # 19 lignes golden (3 auteurs, lot 2)
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
    assert man["row_count"] == 19
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
