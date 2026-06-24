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

from dagster import AssetExecutionContext, AssetKey, MaterializeResult, MetadataValue, asset

from citation_dagster import lakehouse, tracking, uplift_model
from citation_dagster.dbt import CURATED_DT
from citation_dagster.resources import ceph_target_from_env

_PROFILES_SUBDIR = "marts/author_profiles"
_LABELS_SUBDIR = "curated/curated_pair_uplift_labels"
_PREDICTIONS_SUBDIR = "marts/pair_uplift_predictions"
_RECOMMENDATIONS_SUBDIR = "marts/author_recommendations"
_TOP_N = 10


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


def _predict_all_pairs(model, vecs: dict):
    """Prédit l'uplift de TOUTES les paires d'auteurs profilés (y compris inédites).

    C'est l'intérêt du prédictif (ADR 0067) : recommander de NOUVEAUX partenaires. On
    énumère les paires (a < b) d'auteurs ayant un profil, on les passe au modèle.
    """
    authors = sorted(vecs)
    preds = []
    for i, a in enumerate(authors):
        for b in authors[i + 1 :]:
            feat = uplift_model.pair_features(vecs[a], vecs[b]).reshape(1, -1)
            preds.append((a, b, float(model.predict(feat)[0])))
    return preds


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
    deps=[AssetKey(["marts_author_profiles"]), AssetKey(["curated_pair_uplift_labels"])],
)
def pair_uplift_model(context: AssetExecutionContext) -> MaterializeResult:
    """Entraîne, valide honnêtement et sert le modèle d'uplift FWCI (ADR 0067)."""
    target = ceph_target_from_env()
    run_id = context.run_id
    con = lakehouse.connect()

    profiles, subfields = _read_profiles(con, target.bucket, run_id)
    labels = _read_labels(con, target.bucket, run_id)
    vecs = uplift_model.author_vectors(profiles, subfields)
    ds = uplift_model.build_dataset(labels, vecs)

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
        predicted = _predict_all_pairs(model, vecs)
    else:
        predicted = list(labels)  # uplift observé, paires connues uniquement

    rows = _candidate_pairs(vecs, predicted, served_mode)
    recos = uplift_model.top_recommendations(predicted, _TOP_N)
    _write_predictions(rows, target.bucket, run_id)
    _write_recommendations(recos, target.bucket, run_id)

    # Logging MLflow (best-effort, no-op si MLFLOW_TRACKING_URI absent).
    metrics = {
        "n_pairs_labeled": float(len(labels)),
        "n_pairs_served": float(len(rows)),
        "predictive": 1.0 if served_mode == "predictive" else 0.0,
    }
    if evaluation is not None:
        metrics.update(
            {"r2": evaluation.r2, "mae": evaluation.mae, "baseline_mae": evaluation.baseline_mae}
        )
    tracking.log_embeddings_run(  # réutilise le canal MLflow du socle
        f"uplift:{run_id}", CURATED_DT, metrics, tracking.mlflow_config_from_env()
    )

    return MaterializeResult(
        metadata={
            "served_mode": MetadataValue.text(served_mode),
            "r2_honest": MetadataValue.float(evaluation.r2 if evaluation else float("nan")),
            "mae": MetadataValue.float(evaluation.mae if evaluation else float("nan")),
            "pairs_labeled": MetadataValue.int(len(labels)),
            "pairs_served": MetadataValue.int(len(rows)),
            "recommendations": MetadataValue.int(len(recos)),
            "decision": MetadataValue.text(
                "prédictif (pouvoir confirmé)"
                if served_mode == "predictive"
                else "repli descriptif (pouvoir insuffisant ou trop peu de données)"
            ),
        }
    )
