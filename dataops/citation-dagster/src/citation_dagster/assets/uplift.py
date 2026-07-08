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

import time

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
# Taille de lot pour l'INSERT du repli descriptif dans `preds` (paires observées) : on n'insère
# que ce nombre de lignes à la fois (drift L90/L92). Le chemin PRÉDICTIF, lui, streame par bloc
# kNN (cf. _stream_knn_predictions) — sa taille de lot est celle du bloc du générateur.
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


def _create_preds_table(con) -> None:
    """Crée la table DuckDB ``preds`` (support de streaming des prédictions)."""
    con.execute("DROP TABLE IF EXISTS preds")
    con.execute(
        "CREATE TABLE preds(author_a VARCHAR, author_b VARCHAR, uplift DOUBLE, served_mode VARCHAR)"
    )


def _stream_knn_predictions(con, model, vecs: dict, emb_vecs: dict, emb_dim: int, log=None) -> dict:
    """STREAME les prédictions kNN dans la table DuckDB ``preds`` (drift L92, mémoire bornée).

    Recommander de NOUVEAUX partenaires reste l'intérêt du prédictif (ADR 0067) — mais scorer
    TOUTES les paires est O(N²) (drift L89 → kNN) et même la LISTE des ~N·k prédictions + son
    écriture en littéral SQL VALUES explosaient la RAM à l'échelle réelle (242k auteurs, ~12M
    paires ; drift L90 puis L92, OOM > 56Gi). On ne matérialise JAMAIS toutes les paires :

      - ``knn_candidate_pairs`` est un GÉNÉRATEUR : il yield les indices de paires PAR BLOC ;
      - pour chaque bloc, on construit les features EN BLOC (``pair_features_block`` vectorisé —
        drift L96 : la boucle Python par paire faisait des millions d'appels et un run de 3h+),
        on prédit, et on INSÈRE dans ``preds`` (``executemany``, borné au bloc) — puis on libère.

    Aucune structure ne grandit avec le nombre TOTAL de paires ; le pic RAM est le bloc courant
    (features ≤ block·k × ~1,3k floats). Le voisinage se calcule sur le vecteur THÉMATIQUE
    (subfields, ``vecs``) — socle universel (tout auteur profilé en a un) ; l'embedding enrichit
    les FEATURES via ``pair_features_block`` sans piloter le voisinage. La déduplication globale
    des paires (union symétrisée) se fait à la lecture (``SELECT DISTINCT`` aval).

    ``log`` (callable optionnel, p.ex. ``context.log.info``) : reçoit une ligne de PROGRESSION au
    moins toutes les 60 s (bloc courant / total estimé, paires cumulées, débit, ETA) — un run
    long DOIT être observable (drift L96). Absent en test → silencieux.
    """
    authors = sorted(vecs)  # tous les auteurs profilés (l'ordre trié fige a < b)
    if len(authors) < 2:
        return {"scoring_n_pairs": 0, "scoring_duration_s": 0.0, "scoring_pairs_per_s": 0.0}
    thematic = np.stack([vecs[a] for a in authors])  # (M, #subfields), lignes L2-normalisées
    # Matrices auteur pré-empilées (une fois) pour la construction VECTORISÉE des features par
    # bloc : indexation avancée par les indices du bloc, pas d'appel Python par paire.
    emb_present = np.array([a in emb_vecs for a in authors])  # (M,) l'auteur a-t-il un embedding
    emb_matrix = np.zeros((len(authors), emb_dim), dtype=np.float64)  # zéros = embedding neutre
    for row, a in enumerate(authors):
        if emb_present[row]:
            emb_matrix[row] = emb_vecs[a]

    total_blocks = -(-len(authors) // uplift_model.knn_block_size(len(authors)))  # ceil(M/block)
    start_t = last_log_t = time.monotonic()
    n_pairs = 0
    if log:
        log(f"pair_uplift scoring : M={len(authors)} auteurs, ~{total_blocks} blocs kNN à scorer.")

    for block_idx, block_pairs in enumerate(uplift_model.knn_candidate_pairs(thematic), start=1):
        ii = block_pairs[:, 0]
        jj = block_pairs[:, 1]
        feats = uplift_model.pair_features_block(
            thematic[ii],
            thematic[jj],
            emb_matrix[ii],
            emb_matrix[jj],
            emb_present[ii] & emb_present[jj],
            emb_dim,
        )
        scores = model.predict(feats)
        con.executemany(
            "INSERT INTO preds VALUES (?, ?, ?, 'predictive')",
            [
                (authors[int(i)], authors[int(j)], float(s))
                for i, j, s in zip(ii, jj, scores, strict=True)
            ],
        )
        n_pairs += len(scores)
        del feats, scores
        # Log de progression throttlé à ≥ 1×/min (drift L96) : ETA = temps écoulé / blocs faits ×
        # blocs restants (blocs quasi-homogènes en taille). time.monotonic → insensible à l'heure.
        now = time.monotonic()
        if log and (now - last_log_t >= 60.0):
            elapsed = now - start_t
            rate = n_pairs / elapsed if elapsed > 0 else 0.0
            eta = (elapsed / block_idx) * (total_blocks - block_idx) if block_idx else 0.0
            log(
                f"pair_uplift scoring : bloc {block_idx}/~{total_blocks} · {n_pairs:,} paires · "
                f"{rate:,.0f} paires/s · ETA ~{eta / 60:.0f} min"
            )
            last_log_t = now

    duration_s = time.monotonic() - start_t
    if log:
        mins = duration_s / 60
        log(f"pair_uplift scoring TERMINÉ : {n_pairs:,} paires scorées en {mins:.1f} min.")
    # Métriques renvoyées pour l'HISTORIQUE run-à-run (métadonnées Dagster + MLflow, pas Prometheus
    # — batch éphémère) : comparer débit/durée d'un run à l'autre, repérer une régression.
    return {
        "scoring_n_pairs": n_pairs,
        "scoring_duration_s": round(duration_s, 1),
        "scoring_pairs_per_s": round(n_pairs / duration_s, 1) if duration_s > 0 else 0.0,
    }


def _insert_observed_predictions(con, labels) -> None:
    """Repli descriptif : insère l'uplift OBSERVÉ des paires connues dans ``preds`` (par lots)."""
    for start in range(0, len(labels), _PREDICT_BATCH):
        con.executemany(
            "INSERT INTO preds VALUES (?, ?, ?, 'descriptive')",
            [(a, b, float(u)) for a, b, u in labels[start : start + _PREDICT_BATCH]],
        )


def _write_predictions(con, bucket: str, run_id: str) -> int:
    """Écrit ``preds`` (dédupliquée) en Parquet servi via COPY. Renvoie le nombre de lignes."""
    dest = f"s3://{bucket}/{_PREDICTIONS_SUBDIR}/dt={CURATED_DT}/run={run_id}/part.parquet"
    # DISTINCT : union symétrisée des voisinages (une paire non orientée peut venir des 2 sens).
    con.execute(
        f"COPY (SELECT DISTINCT author_a, author_b, uplift, served_mode FROM preds "
        f"ORDER BY author_a, author_b) TO '{dest}' (FORMAT PARQUET)"
    )
    return con.execute("SELECT count(DISTINCT (author_a, author_b)) FROM preds").fetchone()[0]


def _write_recommendations(con, bucket: str, run_id: str, top_n: int) -> int:
    """Top-N partenaires par auteur, calculé EN DuckDB (fenêtre), sans dict Python (drift L92).

    Chaque paire non orientée crédite les DEUX auteurs (union des deux sens), puis
    ``row_number()`` classe par uplift décroissant (tie-break partner_id, déterministe, ADR
    0057) et garde le top-N. Tout se fait en SQL sur la table ``preds`` — aucune structure
    Python proportionnelle au nombre de paires. Renvoie le nombre de recommandations écrites.
    """
    dest = f"s3://{bucket}/{_RECOMMENDATIONS_SUBDIR}/dt={CURATED_DT}/run={run_id}/part.parquet"
    query = f"""
        WITH both_directions AS (
            SELECT author_a AS author_id, author_b AS partner_id, uplift FROM preds
            UNION ALL
            SELECT author_b AS author_id, author_a AS partner_id, uplift FROM preds
        ),
        ranked AS (
            SELECT author_id, partner_id, uplift,
                   row_number() OVER (
                       PARTITION BY author_id ORDER BY uplift DESC, partner_id
                   ) AS rank
            FROM both_directions
        )
        SELECT author_id, partner_id, uplift, rank FROM ranked WHERE rank <= {int(top_n)}
    """
    con.execute(f"COPY ({query} ORDER BY author_id, rank) TO '{dest}' (FORMAT PARQUET)")
    return con.execute(f"SELECT count(*) FROM ({query})").fetchone()[0]


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

    # Porte de décision : prédictif (modèle entraîné) ou repli descriptif (uplift observé).
    # Les prédictions sont STREAMÉES dans la table DuckDB `preds` (jamais toutes en RAM, drift
    # L92) : le prédictif yield ses paires kNN par bloc + INSERT ; le descriptif insère les
    # paires observées par lots. Predictions et recommandations sont ensuite écrites depuis
    # `preds` (COPY + fenêtre SQL), sans structure Python proportionnelle au nombre de paires.
    _create_preds_table(con)
    scoring_metrics = {"scoring_n_pairs": 0, "scoring_duration_s": 0.0, "scoring_pairs_per_s": 0.0}
    if served_mode == "predictive":
        model = uplift_model.train_final(ds)
        scoring_metrics = _stream_knn_predictions(
            con, model, vecs, emb_vecs, embedding.EMBEDDING_DIM, log=context.log.info
        )
    else:
        _insert_observed_predictions(con, labels)  # uplift observé, paires connues uniquement

    n_served = _write_predictions(con, target.bucket, run_id)
    n_recos = _write_recommendations(con, target.bucket, run_id, _TOP_N)

    lineage.emit(RunState.COMPLETE, run_id, "pair_uplift_model", lin_inputs, lin_outputs)

    # Logging MLflow (best-effort, no-op si MLFLOW_TRACKING_URI absent). Run DÉDIÉ à
    # l'uplift (expérience et nom propres), pas mêlé à l'expérience des embeddings.
    # Couverture embedding : part des auteurs profilés disposant aussi d'un embedding
    # utilisable (mesure honnête de l'apport réel de la 2ᵉ famille de features).
    emb_coverage = (len(set(emb_vecs) & set(vecs)) / len(vecs)) if vecs else 0.0
    metrics = {
        "n_pairs_labeled": float(len(labels)),
        "n_pairs_served": float(n_served),
        "predictive": 1.0 if served_mode == "predictive" else 0.0,
        "embedding_coverage": emb_coverage,
        # Débit/durée du scoring → historique run-à-run dans MLflow (repérer une régression).
        "scoring_duration_s": float(scoring_metrics["scoring_duration_s"]),
        "scoring_pairs_per_s": float(scoring_metrics["scoring_pairs_per_s"]),
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
            "pairs_served": MetadataValue.int(n_served),
            "recommendations": MetadataValue.int(n_recos),
            "embedding_coverage": MetadataValue.float(emb_coverage),
            # Historique run-à-run (métadonnées Dagster) : durée + débit du scoring kNN.
            "scoring_duration_s": MetadataValue.float(scoring_metrics["scoring_duration_s"]),
            "scoring_pairs_per_s": MetadataValue.float(scoring_metrics["scoring_pairs_per_s"]),
            "decision": MetadataValue.text(
                "prédictif (pouvoir confirmé)"
                if served_mode == "predictive"
                else "repli descriptif (pouvoir insuffisant ou trop peu de données)"
            ),
        }
    )
