"""Asset de PRÉVISION du volume d'articles par université (ADR 0081).

En aval du mart `university_timeline` (série temporelle journalière par université), cet
asset entraîne/sert un modèle GLOBAL de prévision (``forecast_model``, cœur pur) et écrit
un mart **servi** ``marts/university_timeline_forecast/`` (Parquet + manifest, contrat
ADR 0029). Calqué sur ``citation`` ``assets/uplift.py`` : lecture DuckDB↔S3 → décision (la
PORTE prédictif/descriptif est dans le module pur) → écriture COPY → MLflow → lineage.

L'asset porte l'I/O ; toute la décision ML vit dans ``forecast_model`` (testable sans S3).
``served_mode`` ∈ {predictive, descriptive} est porté sur chaque ligne servie (le drift le
lit). Hermétique : sans accès S3 / sans ``MLFLOW_TRACKING_URI``, dégrade proprement.

NB : pas de ``from __future__ import annotations`` (Dagster introspecte, drift D9).
"""

import datetime as dt
import tempfile
from pathlib import Path

from dagster import (
    AssetExecutionContext,
    AssetKey,
    Failure,
    MaterializeResult,
    MetadataValue,
    asset,
)
from openlineage.client.event_v2 import RunState

from mediawatch_dagster import forecast_model, lakehouse, last_run, lineage, tracking
from mediawatch_dagster.assets.manifest import _run_rclone, parse_lsjson_entries
from mediawatch_dagster.assets.raw_gkg import gkg_daily_partitions
from mediawatch_dagster.resources import ceph_target_from_env, render_rclone_config

_TIMELINE_SUBDIR = "marts/university_timeline"
_FORECAST_SUBDIR = "marts/university_timeline_forecast"


def _read_timeline(con, bucket: str, config_path: Path) -> list[tuple[str, dt.date, int]]:
    """Lit TOUT le mart timeline (toutes partitions) en gardant le DERNIER run par jour.

    Le mart accumule une partition ``dt=`` par mois d'événements, chaque re-matérialisation
    écrivant un nouveau ``run=`` (immutabilité, ADR 0064). Le **dernier run par jour** est
    celui au ``ModTime`` S3 le plus récent — PAS l'ordre lexical du ``run=`` (uuid4
    aléatoire, ADR 0101). Le ``ModTime`` n'étant pas une colonne DuckDB, on liste d'abord
    le mart (``rclone lsjson``), on retient ``{dt: run}`` via
    :func:`last_run.latest_run_by_day`, puis on **restreint** la lecture à ces couples.
    Filtre la ligne fantôme NULL (placeholder dbt).
    """
    root = f"ceph:{bucket}/{_TIMELINE_SUBDIR}"
    proc = _run_rclone(["lsjson", "-R", "--include", "*.parquet", root], config_path)
    if proc.returncode != 0:
        raise Failure(
            description="rclone lsjson a échoué sur le mart timeline",
            metadata={"stderr": MetadataValue.text(proc.stderr[-2000:])},
        )
    keep = last_run.latest_run_by_day(parse_lsjson_entries(proc.stdout))  # {dt: run}
    if not keep:
        return []
    values = ", ".join(f"('{d}', '{r}')" for d, r in sorted(keep.items()))
    glob = f"s3://{bucket}/{_TIMELINE_SUBDIR}/dt=*/run=*/*.parquet"
    rows = con.sql(
        f"""
        SELECT university_id, event_date, n_articles
        FROM read_parquet('{glob}', hive_partitioning=true)
        WHERE university_id IS NOT NULL
          AND (dt, run) IN (VALUES {values})
        """
    ).fetchall()
    out: list[tuple[str, dt.date, int]] = []
    for uid, event_date, n in rows:
        d = (
            event_date
            if isinstance(event_date, dt.date)
            else dt.date.fromisoformat(str(event_date))
        )
        out.append((str(uid), d, int(n)))
    return out


def _write_forecast(rows: list[dict], bucket: str, run_day: str, run_id: str) -> None:
    """Écrit les prévisions servies en Parquet immuable (``dt=<run_day>/run=<run_id>/``).

    ``dt`` = jour d'EXÉCUTION (la prévision est la photo au jour J), pas une partition
    d'événements. ORDER BY déterministe (ADR 0057). Gère le cas vide (schéma seul)."""
    con = lakehouse.connect()
    dest = f"s3://{bucket}/{_FORECAST_SUBDIR}/dt={run_day}/run={run_id}/part.parquet"
    con.sql(
        "CREATE OR REPLACE TABLE preds (university_id VARCHAR, university_name VARCHAR, "
        "horizon_label VARCHAR, window_start DATE, window_end DATE, "
        "n_articles_pred DOUBLE, served_mode VARCHAR)"
    )
    if rows:
        con.executemany(
            "INSERT INTO preds VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                (
                    r["university_id"],
                    r.get("university_name", ""),
                    r["horizon_label"],
                    r["window_start"],
                    r["window_end"],
                    float(r["n_articles_pred"]),
                    r["served_mode"],
                )
                for r in rows
            ],
        )
    con.sql(
        "COPY (SELECT * FROM preds ORDER BY university_id, horizon_label, window_start) "
        f"TO '{dest}' (FORMAT PARQUET)"
    )


@asset(
    name="forecast_university_timeline",
    group_name="transform",
    deps=[AssetKey(["marts_university_timeline"])],
    partitions_def=gkg_daily_partitions,
)
def forecast_university_timeline(context: AssetExecutionContext) -> MaterializeResult:
    """Entraîne, valide honnêtement et sert le modèle de prévision (ADR 0081).

    Lit toute la timeline → ``forecast_model.forecast`` (porte prédictif/descriptif) →
    écrit le mart servi → logge MLflow (best-effort) → émet le lineage. La clé de partition
    (jour d'exécution) sert de ``dt=`` du mart de prévisions."""
    target = ceph_target_from_env()
    run_id = context.run_id
    run_day = context.partition_key

    lineage.emit(
        RunState.START,
        run_id,
        "forecast_university_timeline",
        [lineage.mart_dataset(_TIMELINE_SUBDIR)],
        [lineage.mart_dataset(_FORECAST_SUBDIR)],
    )

    con = lakehouse.connect()
    with tempfile.TemporaryDirectory() as tmp:
        config_path = Path(tmp) / "rclone.conf"
        config_path.write_text(render_rclone_config(target))
        timeline = _read_timeline(con, target.bucket, config_path)
    served_rows, evaluation, served_mode = forecast_model.forecast(timeline)
    _write_forecast(served_rows, target.bucket, run_day, run_id)

    lineage.emit(
        RunState.COMPLETE,
        run_id,
        "forecast_university_timeline",
        [lineage.mart_dataset(_TIMELINE_SUBDIR)],
        [lineage.mart_dataset(_FORECAST_SUBDIR)],
    )

    r2 = float(evaluation.r2) if evaluation else float("nan")
    mae = float(evaluation.mae) if evaluation else float("nan")
    baseline_mae = float(evaluation.baseline_mae) if evaluation else float("nan")
    n_universities = len({r["university_id"] for r in served_rows})
    tracking.log_run(
        run_name=f"forecast:{run_id}",
        experiment=tracking.EXPERIMENT_FORECAST,
        dt=run_day,
        metrics={
            "predictive": 1.0 if served_mode == "predictive" else 0.0,
            "r2": r2,
            "mae": mae,
            "baseline_mae": baseline_mae,
            "n_universities": float(n_universities),
            "n_predictions": float(len(served_rows)),
        },
        params={"served_mode": served_mode, "dt": run_day, "run_id": run_id},
        config=tracking.mlflow_config_from_env(),
    )

    return MaterializeResult(
        metadata={
            "served_mode": MetadataValue.text(served_mode),
            "r2_honest": MetadataValue.float(r2),
            "mae": MetadataValue.float(mae),
            "baseline_mae": MetadataValue.float(baseline_mae),
            "n_universities": MetadataValue.int(n_universities),
            "n_predictions": MetadataValue.int(len(served_rows)),
            "decision": MetadataValue.text(
                "prédictif (pouvoir confirmé)"
                if served_mode == "predictive"
                else "repli descriptif (pouvoir insuffisant ou trop peu d'historique)"
            ),
        }
    )
