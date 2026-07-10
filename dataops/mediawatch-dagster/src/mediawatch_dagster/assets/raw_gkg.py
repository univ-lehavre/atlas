"""Asset de PROJECTION : dérive la couche projetée (6 champs) de la native, en Parquet.

Couche « silver » de la veille médiatique (ADR 0100). À la différence de l'ancienne
implémentation (qui téléchargeait GDELT et écrivait du JSONL.gz), ``raw_gkg`` **ne
frappe plus la source** : il LIT le Parquet natif 27 champs écrit par
``raw_native_gkg`` (couche bronze) pour la **même partition et le même run**, le
**projette** aux 6 champs utiles au chronogramme (identifiant de document, date,
organisations éclatées, source, URL, info de traduction) et écrit le résultat en
**Parquet** sous ``raw/gkg/dt=YYYY-MM-DD/run=<run_id>/``.

**Un seul téléchargement de la source (ADR 0100).** La native télécharge ; la
projetée dérive de S3. On protège ainsi l'API rate-limitée (plus de double pull) et
le brut projeté reste RECALCULABLE depuis la native sans re-frapper GDELT.

**Pilotage par partition temporelle (ADR 0064).** La partition journalière est le
curseur (définie ici, importée par tout le pipeline). ``raw_gkg`` dépend de
``raw_native_gkg`` : dans un run d'ingestion, la native est matérialisée d'abord,
puis la projetée la dérive (même ``run_id`` → même préfixe ``dt=…/run=…``).

La lecture native et l'écriture Parquet passent par DuckDB (httpfs path-style,
``lakehouse``) ; l'éclatement des organisations réutilise la logique PURE de ``gkg``
(source unique de vérité, testée hermétiquement).

NB : pas de ``from __future__ import annotations`` ici — Dagster introspecte les
annotations à l'exécution.
"""

import os
from dataclasses import asdict

import pyarrow as pa
from dagster import (
    AssetKey,
    Config,
    DailyPartitionsDefinition,
    Failure,
    MaterializeResult,
    MetadataValue,
    asset,
)
from openlineage.client.event_v2 import RunState

from mediawatch_dagster import gkg, lakehouse, lineage
from mediawatch_dagster.gkg import OrgMention
from mediawatch_dagster.resources import ceph_target_from_env

# Date de départ des partitions journalières. GKG 2.1 (Translingual) démarre au
# 2015-02-19 ; surchargeable par env pour borner un banc (pas de backfill géant en
# test). Le schedule et le backfill s'appuient sur cette définition de partition.
# DÉFINIE ICI (et non dans raw_native_gkg) car tout le pipeline l'importe de ce module
# historiquement — on préserve ce point d'import unique.
_PARTITION_START = os.environ.get("MEDIAWATCH_GKG_START_DATE", "2015-02-19")
gkg_daily_partitions = DailyPartitionsDefinition(start_date=_PARTITION_START)

# Préfixe de la couche native lue en amont (miroir de raw_native_gkg._NATIVE_PREFIX).
_NATIVE_PREFIX = "raw_native/gkg"
# Préfixe de la couche projetée écrite par cet asset.
_PROJECTED_PREFIX = "raw/gkg"


class RawGkgConfig(Config):
    """Paramètres de la projection (couche silver dérivée de la native)."""

    # Plus de max_files / include_translation / anti-rate-limit ici : le pull (et donc
    # ces réglages) vit dans raw_native_gkg. La projection lit ce que la native a écrit.


def _project_native(rows: list[dict]) -> list[OrgMention]:
    """Projette les lignes natives (dicts 27 champs) en mentions d'organisation.

    Délègue à ``gkg.project_native_dict`` (logique pure, testée) : une ligne native →
    N mentions (une par organisation distincte). Concatène toutes les mentions du jour.
    """
    mentions: list[OrgMention] = []
    for row in rows:
        mentions.extend(gkg.project_native_dict(row))
    return mentions


def _write_projected(
    con, mentions: list[OrgMention], bucket: str, partition_date: str, run_id: str
) -> int:
    """Écrit les mentions projetées en Parquet sous ``raw/gkg/dt=<jour>/run=<run_id>/``.

    Schéma consommé par le staging dbt (contrat, ADR 0100) : ``record_id``, ``date``,
    ``organization``, ``source_common_name``, ``document_identifier`` (VARCHAR) +
    ``translated`` (BOOLEAN). Une ligne par mention (record_id × organisation). Écriture
    Parquet via DuckDB (``COPY``) ; immuable par ``run=`` (nouveau préfixe à chaque rejeu,
    ADR 0064). Renvoie le nombre de mentions écrites.
    """
    dest = f"s3://{bucket}/{_PROJECTED_PREFIX}/dt={partition_date}/run={run_id}"
    if not mentions:
        # Jour sans aucune mention : on n'écrit pas de part vide (le staging dbt tolère
        # une partition absente ; le manifest reflète l'état réel). Run idempotent.
        return 0
    # Table temporaire in-memory depuis les mentions (asdict → colonnes nommées), puis
    # COPY vers S3. On passe par register d'une table Arrow pour éviter tout littéral SQL
    # géant (et l'échappement manuel) ; DuckDB type `translated` en BOOLEAN nativement.
    records = [asdict(m) for m in mentions]
    table = pa.table(
        {
            "record_id": pa.array([r["record_id"] for r in records], pa.string()),
            "date": pa.array([r["date"] for r in records], pa.string()),
            "organization": pa.array([r["organization"] for r in records], pa.string()),
            "source_common_name": pa.array([r["source_common_name"] for r in records], pa.string()),
            "document_identifier": pa.array(
                [r["document_identifier"] for r in records], pa.string()
            ),
            "translated": pa.array([r["translated"] for r in records], pa.bool_()),
        }
    )
    con.register("projected_mentions", table)
    try:
        lakehouse.copy_to_parquet(con, "SELECT * FROM projected_mentions", dest)
    finally:
        con.unregister("projected_mentions")
    return len(mentions)


@asset(
    name="raw_gkg",
    group_name="ingestion",
    partitions_def=gkg_daily_partitions,
    deps=[AssetKey(["raw_native_gkg"])],
)
def raw_gkg(context, config: RawGkgConfig) -> MaterializeResult:
    """Dérive la couche projetée (6 champs, Parquet) de la native, sans re-télécharger."""
    target = ceph_target_from_env()
    run_id = context.run_id
    partition_date = context.partition_key  # YYYY-MM-DD

    con = lakehouse.connect()
    try:
        native_rows = lakehouse.read_native_rows(
            con, target.bucket, _NATIVE_PREFIX, partition_date, run_id
        )
    except Exception as exc:  # noqa: BLE001 — remonté en Failure explicite (contrat asset)
        raise Failure(
            description=(
                "Lecture de la couche native GKG échouée "
                f"(raw_native/gkg/dt={partition_date}/run={run_id}) — "
                "raw_native_gkg a-t-il matérialisé cette partition dans ce run ?"
            ),
            metadata={"error": MetadataValue.text(str(exc))},
        ) from exc

    lineage.emit(RunState.START, run_id, "raw_gkg", [lineage.raw_native_dataset()], [])

    mentions = _project_native(native_rows)
    total = _write_projected(con, mentions, target.bucket, partition_date, run_id)

    lineage.emit(
        RunState.COMPLETE,
        run_id,
        "raw_gkg",
        [lineage.raw_native_dataset()],
        [lineage.raw_dataset()],
    )

    return MaterializeResult(
        metadata={
            "partition": MetadataValue.text(partition_date),
            "native_rows_read": MetadataValue.int(len(native_rows)),
            "mentions_written": MetadataValue.int(total),
            "bucket": MetadataValue.text(
                f"{target.bucket}/{_PROJECTED_PREFIX}/dt={partition_date}"
            ),
        }
    )
