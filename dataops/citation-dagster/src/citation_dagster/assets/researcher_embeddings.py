"""Asset d'embedding sémantique par chercheur (étape 4, lot 3).

Calcule, en Python natif (`onnxruntime` + `tokenizers`, modèle téléchargé hors git
puis figé dans l'image — `scripts/fetch_model.py`), un vecteur(384) par
publication puis l'agrège par `author_id`. Deux artefacts
Parquet external, alignés sur la même partition `dt=…/run=…` que les modèles dbt
(même `context.run_id`, donc immutabilité par rejeu — ADR 0054) :

  - **`curated_work_vectors`** (provenance, grain `work_id`) : un vecteur SANS L2,
    re-poolable — c'est la couche qui rend la purge chirurgicale possible
    (ADR 0059 : un mean-pool L2-normalisé n'est pas dé-poolable). Texte source =
    labels topics (score >= 0,3) + keywords (non filtrés), parité TS.
  - **`marts_researcher_vectors`** (servi, grain `author_id`) : mean-pool non
    pondéré des vecteurs des publications du chercheur PUIS un unique L2 — parité
    stricte de `embedding-profile.ts`.

Découplage assumé (décision projet) : le mart lexical `marts_researchers` (lot 2,
grain `(author_id, kind, label_id)`) reste intact ; le vecteur vit dans un
artefact SÉPARÉ au grain `author_id`. La fusion lexical+vecteur se fait à
l'ingestion `index_load` (Phase 4) / lot 5, pas au mart (plan:79).

Le manifest et la qualité GE de ces artefacts relèvent du LOT 4 (cet asset n'écrit
aucun manifest). Le lineage OpenLineage→Marquez est émis MANUELLEMENT ici (l'émission
est explicite dans tout le dépôt, via le module ``lineage`` — Dagster ne l'émet PAS
automatiquement) : l'asset trace ses entrées (provenance lexicale curated) et ses
sorties (les deux artefacts vecteur). No-op si ``OPENLINEAGE_URL`` est absent.

NB : pas de ``from __future__ import annotations`` (drift D9 : Dagster introspecte
les annotations à l'exécution).
"""

import json
import os

from dagster import (
    AssetExecutionContext,
    AssetKey,
    MaterializeResult,
    MetadataValue,
    asset,
)
from openlineage.client.event_v2 import RunState

from citation_dagster import embedding, lakehouse, lineage
from citation_dagster.dbt import CURATED_DT

# Sous-dossiers des deux artefacts (mêmes conventions que curated_*/marts_* dbt).
_WORK_VECTORS_SUBDIR = "curated/curated_work_vectors"
_AUTHOR_VECTORS_SUBDIR = "marts/researcher_vectors"


def load_opposition_set():
    """Couples (author_id, work_id) opposés (RGPD, lot 5), depuis l'env OPPOSITION_PAIRS.

    SOURCE UNIQUE partagée avec le mart lexical dbt (relayée par build_dbt_vars) : le
    MÊME env pilote le filtrage lexical ET vecteur → cohérence garantie. Format JSON
    `[{"author_id": "...", "work_id": "..."}]`, défaut `[]`. Le code PERMET la purge ;
    la liste vient du déployeur (ADR 0059). Renvoie un set de tuples (author_id, work_id).
    """
    raw = os.environ.get("OPPOSITION_PAIRS", "[]")
    return {(p["author_id"], p["work_id"]) for p in json.loads(raw)}


def _partition_glob(bucket, subdir, run_id):
    """Glob S3 d'une partition : ``s3://<bucket>/<subdir>/dt=…/run=…/*.parquet``."""
    return f"s3://{bucket}/{subdir}/dt={CURATED_DT}/run={run_id}/*.parquet"


def _partition_part(bucket, subdir, run_id):
    """Fichier Parquet de sortie d'une partition : ``…/dt=…/run=…/part.parquet``.

    On nomme explicitement le FICHIER (pas le dossier) : un ``COPY TO`` vers un
    chemin sans extension écrirait un objet dont la clé ne se termine pas par
    ``.parquet``, qu'un glob ``*.parquet`` ne retrouverait pas (drift D13, cf.
    macro ``curated_location``). Même convention que les modèles dbt external.
    """
    return f"s3://{bucket}/{subdir}/dt={CURATED_DT}/run={run_id}/part.parquet"


def _read_work_labels(con, bucket, run_id):
    """Texte source par work_id : topics (score >= 0,3, ordre provenance) puis
    keywords (tous), joints — parité `embedding-profile.ts`/`topic-extractor.ts`.

    Renvoie une liste ``[(work_id, text), …]`` triée par work_id (déterminisme).
    Lit la provenance lot 1 (curated_work_topics/keywords) du MÊME run.
    """
    topics_glob = _partition_glob(bucket, "curated/curated_work_topics", run_id)
    keywords_glob = _partition_glob(bucket, "curated/curated_work_keywords", run_id)
    # Les labels sont agrégés en liste ordonnée par (score desc, id) pour un texte
    # stable ; le filtre topics >= seuil reproduit topic-extractor.ts.
    rows = con.execute(
        f"""
        with topics as (
            select work_id, topic_display_name as label, score, topic_id as label_id
            from read_parquet('{topics_glob}')
            where score >= {embedding.TEXT_TOPIC_SCORE_MIN}
        ),
        keywords as (
            select work_id, keyword_display_name as label, score, keyword_id as label_id
            from read_parquet('{keywords_glob}')
        ),
        ordered_topics as (
            select work_id, list(label order by score desc, label_id) as labels
            from topics group by work_id
        ),
        ordered_keywords as (
            select work_id, list(label order by score desc, label_id) as labels
            from keywords group by work_id
        ),
        all_works as (
            select work_id from ordered_topics
            union select work_id from ordered_keywords
        )
        select
            w.work_id,
            coalesce(t.labels, []) as topic_labels,
            coalesce(k.labels, []) as keyword_labels
        from all_works w
        left join ordered_topics t on t.work_id = w.work_id
        left join ordered_keywords k on k.work_id = w.work_id
        order by w.work_id
        """
    ).fetchall()
    return [
        (work_id, embedding.work_to_text(topic_labels, keyword_labels))
        for work_id, topic_labels, keyword_labels in rows
    ]


def _read_authorships(con, bucket, run_id):
    """Couples ``(author_id, work_id)`` depuis curated_authorships (même run),
    triés — pont pour l'agrégat par chercheur."""
    glob = _partition_glob(bucket, "curated/curated_authorships", run_id)
    return con.execute(
        f"select author_id, work_id from read_parquet('{glob}') order by author_id, work_id"
    ).fetchall()


def _vector_rows_to_relation(con, rows, id_col):
    """Matérialise ``[(id, vector_np), …]`` en table DuckDB (id varchar, vector
    FLOAT[384]) pour écriture Parquet déterministe (ORDER BY id)."""
    ids = [r[0] for r in rows]
    vectors = [r[1].tolist() for r in rows]
    con.execute("DROP TABLE IF EXISTS _vec_tmp")
    con.execute(
        f"CREATE TABLE _vec_tmp ({id_col} VARCHAR, vector FLOAT[{embedding.EMBEDDING_DIM}])"
    )
    con.executemany(
        f"INSERT INTO _vec_tmp ({id_col}, vector) VALUES (?, ?)",
        list(zip(ids, vectors, strict=True)),
    )


@asset(
    name="researcher_embeddings",
    group_name="transform",
    deps=[
        AssetKey(["curated_work_topics"]),
        AssetKey(["curated_work_keywords"]),
        AssetKey(["curated_authorships"]),
    ],
)
def researcher_embeddings(context: AssetExecutionContext) -> MaterializeResult:
    """Calcule curated_work_vectors (par publication, sans L2) puis
    marts_researcher_vectors (par author_id, mean-pool + L2)."""
    run_id = context.run_id  # même run que les assets dbt → même préfixe dt=…/run=…
    con = lakehouse.connect()
    cfg = lakehouse.duckdb_s3_config_from_env()
    bucket = cfg.bucket

    # Lineage : provenance lexicale (entrées) → deux artefacts vecteur (sorties).
    # Émission manuelle (no-op sans OPENLINEAGE_URL) ; noms techniques, jamais de PII.
    lineage_inputs = [
        lineage.curated_dataset("curated_work_topics"),
        lineage.curated_dataset("curated_work_keywords"),
        lineage.curated_dataset("curated_authorships"),
    ]
    lineage_outputs = [
        lineage.curated_dataset("curated_work_vectors"),
        lineage.mart_dataset("marts/researcher_vectors"),
    ]
    lineage.emit(RunState.START, run_id, "researcher_embeddings", lineage_inputs, lineage_outputs)

    # 1) Vecteur PAR PUBLICATION (provenance, sans L2). NON filtré par l'opposition :
    #    la provenance grain-publication reste COMPLÈTE et re-poolable (ADR 0059) — c'est
    #    elle qui rend la purge chirurgicale possible. Seul l'agrégat servi (étape 2) exclut.
    work_texts = _read_work_labels(con, bucket, run_id)
    embedder = embedding.Embedder()
    work_vectors = [(work_id, embedder.embed_text(text)) for work_id, text in work_texts]
    _vector_rows_to_relation(con, work_vectors, "work_id")
    lakehouse.copy_to_parquet(
        con,
        "SELECT work_id, vector FROM _vec_tmp ORDER BY work_id",
        _partition_part(bucket, _WORK_VECTORS_SUBDIR, run_id),
    )

    # 2) Agrégat PAR author_id (mean-pool non pondéré + L2), re-dérivé sur les couples
    #    NON opposés. Une publication contribue une fois à chacun de ses auteurs, SAUF
    #    si le couple (author_id, work_id) est opposé (purge chirurgicale RGPD, lot 5).
    #    Un author_id dont TOUS les couples sont opposés disparaît de l'agrégat servi
    #    (aucun vecteur écrit) — cohérent : plus aucune donnée revendiquée.
    opposition_set = load_opposition_set()
    work_vec_map = dict(work_vectors)
    author_works: dict[str, list] = {}
    for author_id, work_id in _read_authorships(con, bucket, run_id):
        if (author_id, work_id) in opposition_set:
            continue
        vec = work_vec_map.get(work_id)
        if vec is not None:
            author_works.setdefault(author_id, []).append(vec)
    author_vectors = [
        (author_id, embedding.aggregate_author(vecs))
        for author_id, vecs in sorted(author_works.items())
    ]
    _vector_rows_to_relation(con, author_vectors, "author_id")
    lakehouse.copy_to_parquet(
        con,
        "SELECT author_id, vector FROM _vec_tmp ORDER BY author_id",
        _partition_part(bucket, _AUTHOR_VECTORS_SUBDIR, run_id),
    )

    lineage.emit(
        RunState.COMPLETE, run_id, "researcher_embeddings", lineage_inputs, lineage_outputs
    )

    return MaterializeResult(
        metadata={
            "work_vectors": MetadataValue.int(len(work_vectors)),
            "author_vectors": MetadataValue.int(len(author_vectors)),
            "partition": MetadataValue.text(f"dt={CURATED_DT}/run={run_id}"),
        }
    )
