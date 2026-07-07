"""Asset Python : modèle d'uplift FWCI + prédictions servies (ADR 0067, lots 4/5).

Charge le profil thématique par auteur (``marts_author_profiles``) et les labels
d'uplift observé (``curated_pair_uplift_labels``), construit le jeu de données (features
THÉMATIQUES symétriques, jamais l'identité), **valide honnêtement** (croisée GROUPÉE par
auteur), applique la **porte de décision** (ADR 0067) puis écrit les prédictions du
modèle pour toutes les paires candidates sous ``marts/pair_uplift_predictions``.

Porte de décision : si le modèle a un pouvoir prédictif honnête (``has_predictive_power``),
on sert les prédictions du gradient boosting. Sinon, **repli descriptif** : on sert
l'uplift OBSERVÉ des paires connues (pas de prédiction de paires inédites). Le verdict
est loggé MLflow et porté en métadonnée de l'asset.

NB : pas de ``from __future__ import annotations`` — Dagster introspecte les annotations.
"""

import numpy as np
from dagster import AssetExecutionContext, AssetKey, MaterializeResult, MetadataValue, asset
from openlineage.client.event_v2 import RunState

from citation_dagster import embedding, lakehouse, lineage, tracking, uplift_model
from citation_dagster.dbt import CURATED_DT
from citation_dagster.resources import ceph_target_from_env

_PROFILES_SUBDIR = "marts/author_profiles"
_LABELS_SUBDIR = "curated/curated_pair_uplift_labels"
_EMBEDDINGS_SUBDIR = "marts/researcher_vectors"
_PREDICTIONS_SUBDIR = "marts/pair_uplift_predictions"
_RECOMMENDATIONS_SUBDIR = "marts/author_recommendations"
_TOP_N = 10
# Taille de lot pour le scoring des paires candidates (drift L90) : on ne matérialise les
# features (~1,3k floats/paire) que pour ce nombre de paires à la fois, jamais toutes d'un
# coup (des millions de paires → matrice de dizaines de Go → OOM). 200k paires ≈ ~2 Go de
# features transitoires, largement sous la limite du pod. Sans effet sur le résultat (predict
# sans état) ni au petit N (un seul lot).
_PREDICT_BATCH = 200_000


def _lineage_io() -> tuple[list, list]:
    """Datasets d'entrée/sortie du modèle d'uplift (connecte le graphe Marquez).

    Entrées : le mart de profils (asset Python) + les labels d'uplift (modèle dbt).
    Sorties : les deux marts servis (entrées de leurs manifests). Noms techniques, pas
    de PII (invariant lineage). Réutilisé pour START et COMPLETE (mêmes I/O).
    """
    inputs = [
        lineage.mart_dataset(_PROFILES_SUBDIR),
        lineage.curated_dataset("curated_pair_uplift_labels"),
        # 2ᵉ famille de features : l'embedding 384 par auteur.
        lineage.mart_dataset(_EMBEDDINGS_SUBDIR),
    ]
    outputs = [
        lineage.mart_dataset(_PREDICTIONS_SUBDIR),
        lineage.mart_dataset(_RECOMMENDATIONS_SUBDIR),
    ]
    return inputs, outputs


def _read_profiles(con, bucket: str, run_id: str):
    """Lit le mart profils → (lignes (author_id, subfield_id, weight), axe subfields)."""
    glob = f"s3://{bucket}/{_PROFILES_SUBDIR}/dt={CURATED_DT}/run={run_id}/*.parquet"
    rows = con.sql(
        f"SELECT author_id, subfield_id, weight FROM read_parquet('{glob}') "
        "WHERE author_id IS NOT NULL"
    ).fetchall()
    subfields = sorted({r[1] for r in rows})
    return [(r[0], r[1], float(r[2])) for r in rows], subfields


def _read_labels(con, bucket: str, run_id: str):
    """Lit les labels d'uplift observé → (author_a, author_b, uplift)."""
    glob = f"s3://{bucket}/{_LABELS_SUBDIR}/dt={CURATED_DT}/run={run_id}/*.parquet"
    rows = con.sql(
        f"SELECT author_a, author_b, uplift FROM read_parquet('{glob}') "
        "WHERE NOT (COLUMNS(*) IS NULL)"
    ).fetchall()
    return [(r[0], r[1], float(r[2])) for r in rows]


def _read_embeddings(con, bucket: str, run_id: str):
    """Lit le mart researcher_vectors → (author_id, vector) (embedding 384 par auteur).

    Best-effort : si le mart n'existe pas encore pour ce run (chaîne embeddings non
    exécutée), on renvoie une liste vide → le modèle reste sur les seules features
    thématiques. Le vecteur est une LIST DuckDB convertie en liste Python par fetchall.
    """
    glob = f"s3://{bucket}/{_EMBEDDINGS_SUBDIR}/dt={CURATED_DT}/run={run_id}/*.parquet"
    try:
        rows = con.sql(
            f"SELECT author_id, vector FROM read_parquet('{glob}') WHERE author_id IS NOT NULL"
        ).fetchall()
    except Exception:  # noqa: BLE001 — mart absent (chaîne embeddings non jouée) : dégradation propre
        return []
    return [(r[0], r[1]) for r in rows]


def _candidate_pairs(vecs: dict, predicted, served_mode: str):
    """Paires servies : prédictions du modèle, ou uplift observé en repli descriptif.

    En mode prédictif, ``predicted`` est la liste ``(a, b, uplift_prédit)`` pour toutes
    les paires d'auteurs profilés (y compris inédites). En repli descriptif, ce sont les
    paires OBSERVÉES uniquement (passées telles quelles).
    """
    return [
        {"author_a": a, "author_b": b, "uplift": u, "served_mode": served_mode}
        for a, b, u in predicted
    ]


def _predict_knn_pairs(model, vecs: dict, emb_vecs: dict, emb_dim: int):
    """Prédit l'uplift des paires candidates par PLUS-PROCHES-VOISINS thématiques (ADR 0067).

    Recommander de NOUVEAUX partenaires reste l'intérêt du prédictif — mais scorer TOUTES
    les paires (a < b) est O(N²) : à l'échelle réelle (~90k auteurs profilés) ce sont ~4
    milliards de paires, intractables en RAM/temps (drift L89, OOM prod). On restreint aux
    candidats PERTINENTS : les k plus proches voisins de chaque auteur, l'union symétrisée —
    ~N×k paires. Features (thématique + embedding) et modèle IDENTIQUES à l'entraînement ;
    seul le PÉRIMÈTRE des candidats change.

    Le voisinage se calcule sur le vecteur THÉMATIQUE (subfields, ``vecs``) : c'est le socle
    universel (tout auteur profilé en a un, ADR 0067 « la paire entre par la combinaison de
    ses profils thématiques »), donc AUCUN auteur profilé n'est exclu du candidat-generation
    — contrairement à l'embedding, absent pour une partie des auteurs. L'embedding, lui,
    ENRICHIT les FEATURES de chaque paire candidate (``pair_features_combined``), sans piloter
    le voisinage. Vecteurs subfields déjà L2-normalisés → cosinus = produit scalaire.

    ``model.predict`` est appelé PAR LOTS de paires candidates : les features ne sont
    matérialisées QUE pour le lot courant, jamais la matrice complète. À l'échelle réelle
    (~N·k ≈ plusieurs millions de paires × ~1,3k floats de features), un unique
    ``np.stack`` de TOUTES les features pèserait des dizaines de Go → OOM (drift L90, même
    si le kNN a déjà borné le NOMBRE de paires, L89). Le lotissement borne la RAM à
    ``_PREDICT_BATCH`` paires ; résultat numérique identique (predict est sans état).
    """
    authors = sorted(vecs)  # tous les auteurs profilés (l'ordre trié fige a < b)
    if len(authors) < 2:
        return []
    thematic = np.stack([vecs[a] for a in authors])  # (M, #subfields), lignes L2-normalisées
    index_pairs = uplift_model.knn_candidate_pairs(thematic)
    if not index_pairs:
        return []
    predicted = []
    for start in range(0, len(index_pairs), _PREDICT_BATCH):
        chunk = index_pairs[start : start + _PREDICT_BATCH]
        feats = np.stack(
            [
                uplift_model.pair_features_combined(
                    vecs[authors[i]],
                    vecs[authors[j]],
                    emb_vecs.get(authors[i]),
                    emb_vecs.get(authors[j]),
                    emb_dim,
                )
                for i, j in chunk
            ]
        )
        scores = model.predict(feats)  # batché SUR LE LOT
        predicted.extend(
            (authors[i], authors[j], float(score))
            for (i, j), score in zip(chunk, scores, strict=True)
        )
    return predicted


def _write_predictions(rows: list[dict], bucket: str, run_id: str) -> None:
    """Écrit les prédictions en Parquet servi via DuckDB COPY (immuable dt=…/run=…)."""
    con = lakehouse.connect()
    if not rows:
        con.execute(
            "CREATE TABLE preds("
            "author_a VARCHAR, author_b VARCHAR, uplift DOUBLE, served_mode VARCHAR)"
        )
    else:
        con.execute(
            "CREATE TABLE preds AS SELECT * FROM (VALUES "
            + ", ".join(
                f"('{r['author_a']}', '{r['author_b']}', {r['uplift']}, '{r['served_mode']}')"
                for r in rows
            )
            + ") AS t(author_a, author_b, uplift, served_mode)"
        )
    dest = f"s3://{bucket}/{_PREDICTIONS_SUBDIR}/dt={CURATED_DT}/run={run_id}/part.parquet"
    con.execute(
        f"COPY (SELECT * FROM preds ORDER BY author_a, author_b) TO '{dest}' (FORMAT PARQUET)"
    )


def _write_recommendations(
    recos: list[tuple[str, str, float, int]], bucket: str, run_id: str
) -> None:
    """Écrit les recommandations par auteur (top-N partenaires) en Parquet servi."""
    con = lakehouse.connect()
    if not recos:
        con.execute(
            "CREATE TABLE recos(author_id VARCHAR, partner_id VARCHAR, uplift DOUBLE, rank INTEGER)"
        )
    else:
        con.execute(
            "CREATE TABLE recos AS SELECT * FROM (VALUES "
            + ", ".join(f"('{a}', '{p}', {u}, {r})" for a, p, u, r in recos)
            + ") AS t(author_id, partner_id, uplift, rank)"
        )
    dest = f"s3://{bucket}/{_RECOMMENDATIONS_SUBDIR}/dt={CURATED_DT}/run={run_id}/part.parquet"
    con.execute(f"COPY (SELECT * FROM recos ORDER BY author_id, rank) TO '{dest}' (FORMAT PARQUET)")


@asset(
    name="pair_uplift_model",
    group_name="transform",
    deps=[
        AssetKey(["marts_author_profiles"]),
        AssetKey(["curated_pair_uplift_labels"]),
        # 2ᵉ famille de features : l'embedding 384 par auteur (best-effort, cf. _read_embeddings).
        AssetKey(["researcher_embeddings"]),
    ],
)
def pair_uplift_model(context: AssetExecutionContext) -> MaterializeResult:
    """Entraîne, valide honnêtement et sert le modèle d'uplift FWCI (ADR 0067)."""
    target = ceph_target_from_env()
    run_id = context.run_id
    con = lakehouse.connect()

    lin_inputs, lin_outputs = _lineage_io()
    lineage.emit(RunState.START, run_id, "pair_uplift_model", lin_inputs, lin_outputs)

    profiles, subfields = _read_profiles(con, target.bucket, run_id)
    labels = _read_labels(con, target.bucket, run_id)
    vecs = uplift_model.author_vectors(profiles, subfields)
    # 2ᵉ famille : embedding 384 par auteur (enrichit les features, ne remplace pas le
    # socle thématique). Absent/nul → features embedding neutres + drapeau (jamais l'identité).
    emb_vecs = uplift_model.embedding_vectors(
        _read_embeddings(con, target.bucket, run_id), embedding.EMBEDDING_DIM
    )
    ds = uplift_model.build_dataset(labels, vecs, emb_vecs, embedding.EMBEDDING_DIM)

    # Validation honnête (groupée par auteur). Peut échouer si trop peu de groupes —
    # dans ce cas, repli descriptif d'office (pas assez de signal pour un modèle).
    evaluation = None
    served_mode = "descriptive"
    try:
        evaluation = uplift_model.evaluate_grouped(ds)
        if evaluation.has_predictive_power:
            served_mode = "predictive"
    except ValueError:
        served_mode = "descriptive"

    # Porte de décision : prédictif (modèle entraîné sur toutes les paires) ou repli
    # descriptif (uplift observé des paires connues).
    if served_mode == "predictive":
        model = uplift_model.train_final(ds)
        predicted = _predict_knn_pairs(model, vecs, emb_vecs, embedding.EMBEDDING_DIM)
    else:
        predicted = list(labels)  # uplift observé, paires connues uniquement

    rows = _candidate_pairs(vecs, predicted, served_mode)
    recos = uplift_model.top_recommendations(predicted, _TOP_N)
    _write_predictions(rows, target.bucket, run_id)
    _write_recommendations(recos, target.bucket, run_id)

    lineage.emit(RunState.COMPLETE, run_id, "pair_uplift_model", lin_inputs, lin_outputs)

    # Logging MLflow (best-effort, no-op si MLFLOW_TRACKING_URI absent). Run DÉDIÉ à
    # l'uplift (expérience et nom propres), pas mêlé à l'expérience des embeddings.
    # Couverture embedding : part des auteurs profilés disposant aussi d'un embedding
    # utilisable (mesure honnête de l'apport réel de la 2ᵉ famille de features).
    emb_coverage = (len(set(emb_vecs) & set(vecs)) / len(vecs)) if vecs else 0.0
    metrics = {
        "n_pairs_labeled": float(len(labels)),
        "n_pairs_served": float(len(rows)),
        "predictive": 1.0 if served_mode == "predictive" else 0.0,
        "embedding_coverage": emb_coverage,
    }
    if evaluation is not None:
        metrics.update(
            {"r2": evaluation.r2, "mae": evaluation.mae, "baseline_mae": evaluation.baseline_mae}
        )
    tracking.log_run(
        run_name=f"uplift:{run_id}",
        experiment=tracking.EXPERIMENT_UPLIFT,
        dt=CURATED_DT,
        metrics=metrics,
        params={"served_mode": served_mode, "dt": CURATED_DT, "run_id": run_id},
        config=tracking.mlflow_config_from_env(),
    )

    return MaterializeResult(
        metadata={
            "served_mode": MetadataValue.text(served_mode),
            "r2_honest": MetadataValue.float(evaluation.r2 if evaluation else float("nan")),
            "mae": MetadataValue.float(evaluation.mae if evaluation else float("nan")),
            "pairs_labeled": MetadataValue.int(len(labels)),
            "pairs_served": MetadataValue.int(len(rows)),
            "recommendations": MetadataValue.int(len(recos)),
            "embedding_coverage": MetadataValue.float(emb_coverage),
            "decision": MetadataValue.text(
                "prédictif (pouvoir confirmé)"
                if served_mode == "predictive"
                else "repli descriptif (pouvoir insuffisant ou trop peu de données)"
            ),
        }
    )
