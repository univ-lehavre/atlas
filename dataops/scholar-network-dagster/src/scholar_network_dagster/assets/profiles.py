"""Profils de chercheurs par embedding sémantique — asset ``scholar_profiles`` (lot 5, §2).

Pour chaque chercheur identifié (author_id de la table ``researchers``), un **vecteur de
profil** (384) : la moyenne NON pondérée des embeddings de SES articles du périmètre final
(``scholar_works``), puis une normalisation L2 — **parité stricte** avec citation
(``embedding.aggregate_author``, copié). L'embedding d'un article = ``embed_text`` sur le
texte thématique (labels topics de score ≥ 0,3 + keywords, ``work_to_text``).

Le calcul est en Python natif (onnxruntime 1 thread, déterministe ADR 0057), pas en SQL :
DuckDB extrait les couples (author_id, work) du périmètre, Python embarque chaque work une
fois (cache par work_id) et agrège par auteur. L'écriture pgvector est déléguée à
``index_load`` (lot 5c).

NB : pas de ``from __future__ import annotations`` (Dagster introspecte à l'exécution).
"""

from dagster import AssetKey, MaterializeResult, MetadataValue, asset
from openlineage.client.event_v2 import RunState
from openlineage.client.uuid import generate_new_uuid

from scholar_network_dagster import embedding, lakehouse, lineage
from scholar_network_dagster.assets.passes import SCHOLAR_WORKS_SUBDIR, researchers_glob
from scholar_network_dagster.resources import ceph_target_from_env

PROFILES_SUBDIR = "profiles/scholar_profiles"

# Seuil de score des topics pour entrer dans le TEXTE de l'embedding (parité citation
# TEXT_TOPIC_SCORE_MIN) — les keywords ne sont jamais filtrés.
_TOPIC_SCORE_MIN = embedding.TEXT_TOPIC_SCORE_MIN


def _labels(topics, keywords):
    """Extrait (labels topics score ≥ seuil, labels keywords) d'un work (PURE, parité citation).

    ``topics``/``keywords`` : listes de structs OpenAlex. Un topic entre SSI ``score`` ≥ seuil
    (les topics OpenAlex portent un score ; les keywords non → tous gardés). Robuste aux
    formes partielles (champs absents → ignorés)."""
    topic_labels = []
    for t in topics or []:
        score = t.get("score") if isinstance(t, dict) else None
        name = t.get("display_name") if isinstance(t, dict) else None
        if name and (score is None or score >= _TOPIC_SCORE_MIN):
            topic_labels.append(name)
    keyword_labels = [
        k.get("display_name")
        for k in (keywords or [])
        if isinstance(k, dict) and k.get("display_name")
    ]
    return topic_labels, keyword_labels


def build_profiles(rows, researcher_ids, embedder=None):
    """Agrège les works en vecteurs de profil par chercheur (PURE hors modèle ONNX ; §2).

    ``rows`` : itérable de dicts ``{work_id, author_ids: [...], topics, keywords}`` (le
    périmètre final, un par work). ``researcher_ids`` : set des chercheurs identifiés (on ne
    profile QUE ceux-là). ``embedder`` : un ``embedding.Embedder`` (injecté pour les tests).

    Chaque work est embarqué UNE fois (``work_to_text`` → ``embed_text``) ; son vecteur est
    ajouté à chaque co-auteur du work qui est un chercheur identifié. Puis, par chercheur :
    ``aggregate_author`` (moyenne non pondérée + L2). Renvoie ``{author_id: vecteur(384)}``,
    trié par author_id (déterminisme ADR 0057)."""
    embedder = embedder or embedding.Embedder()
    per_author = {}  # author_id -> list[vecteur par work]
    for row in rows:
        topic_labels, keyword_labels = _labels(row.get("topics"), row.get("keywords"))
        text = embedding.work_to_text(topic_labels, keyword_labels)
        vec = embedder.embed_text(text)
        for author_id in row.get("author_ids", []):
            if author_id in researcher_ids:
                per_author.setdefault(author_id, []).append(vec)
    return {
        author_id: embedding.aggregate_author(vectors)
        for author_id, vectors in sorted(per_author.items())
    }


def _read_scholar_works(con, bucket):
    """Lit le périmètre final → lignes ``{work_id, author_ids, topics, keywords}`` (déterministe).

    Déroule ``authorships`` en liste d'author_id par work (via ``list_transform``), garde
    ``topics``/``keywords`` bruts (Python applique le seuil de score). Ordre stable par id.
    """
    glob = f"s3://{bucket}/{SCHOLAR_WORKS_SUBDIR}/run=*/*.parquet"
    rel = con.execute(
        f"""
        SELECT id AS work_id,
               list_transform(authorships, a -> a.author.id) AS author_ids,
               topics,
               keywords
        FROM read_parquet('{glob}')
        ORDER BY id
        """
    )
    cols = [d[0] for d in rel.description]
    return [dict(zip(cols, r, strict=True)) for r in rel.fetchall()]


def _read_researcher_ids(con, bucket):
    """Set des author_id de la table des chercheurs (passe 1)."""
    rows = con.execute(
        f"SELECT author_id FROM read_parquet('{researchers_glob(bucket)}')"
    ).fetchall()
    return {r[0] for r in rows}


@asset(
    name="scholar_profiles",
    group_name="profiling",
    deps=[AssetKey("scholar_works"), AssetKey("researchers")],
    description="Profil sémantique (vecteur 384) par chercheur : moyenne des embeddings de "
    "ses articles + L2 (ADR 0103 §2).",
)
def scholar_profiles() -> MaterializeResult:
    """Écrit un Parquet ``(author_id, embedding[384])`` — un profil par chercheur identifié.

    Lit le périmètre final + la table des chercheurs, embarque chaque article une fois,
    agrège par chercheur (moyenne + L2). L'écriture pgvector est faite par ``index_load``.
    """
    target = ceph_target_from_env()
    run_id = str(generate_new_uuid())

    inputs = [lineage.pass_dataset("scholar_works"), lineage.pass_dataset("researchers")]
    outputs = [lineage.index_dataset("profiles")]
    lineage.emit(RunState.START, run_id, "scholar_profiles", inputs, outputs)

    con = lakehouse.connect()
    researcher_ids = _read_researcher_ids(con, target.bucket)
    rows = _read_scholar_works(con, target.bucket)
    profiles = build_profiles(rows, researcher_ids)

    # Matérialise (author_id, embedding[384]) via DuckDB pour un Parquet homogène — le
    # vecteur est une liste de floats (index_load la convertit en ::vector côté Postgres).
    dest = f"s3://{target.bucket}/{PROFILES_SUBDIR}/run={run_id}/part-00000.parquet"
    if profiles:
        values = ", ".join(
            "('"
            + author_id.replace("'", "''")
            + "', "
            + "["
            + ", ".join(repr(float(x)) for x in vec)
            + "])"
            for author_id, vec in profiles.items()
        )
        con.execute(
            f"COPY (SELECT * FROM (VALUES {values}) AS t(author_id, embedding)) "
            f"TO '{dest}' (FORMAT PARQUET)"
        )

    lineage.emit(RunState.COMPLETE, run_id, "scholar_profiles", inputs, outputs)
    return MaterializeResult(
        metadata={
            "profiles": MetadataValue.int(len(profiles)),
            "embedding_dim": MetadataValue.int(embedding.EMBEDDING_DIM),
            "destination": MetadataValue.text(dest if profiles else "(aucun chercheur)"),
        }
    )
