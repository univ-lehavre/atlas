"""Suites Great Expectations de la code-location « mediawatch » + validation.

Module **pur** (aucun Dagster, aucune I/O réseau ni cluster) : il construit les
suites d'attentes par couche et valide un ``DataFrame`` pandas via un **contexte GE
éphémère** (en mémoire, hermétique). L'*asset check* Dagster (assets/quality.py) ne
fait que charger la donnée puis appeler ``validate_df``.

Couche **raw** (la plus exposée — le brut JSONL.gz projeté n'a aucun test dbt) : on
vérifie la présence et la non-vacuité des colonnes que le staging consomme, le format
du timestamp (14 chiffres) et la non-vacuité du nom d'organisation.

NB : pas de ``from __future__ import annotations`` (cohérence dépôt, drift D9).
"""

import os

import great_expectations as gx
import great_expectations.expectations as gxe
from great_expectations.data_context.types.base import ProgressBarsConfig

# Coupe la télémétrie par précaution (commutateur documenté).
os.environ.setdefault("GX_ANALYTICS_ENABLED", "false")

# Format du timestamp GKG (YYYYMMDDHHMMSS) porté par la colonne ``date``.
_GKG_DATE_RE = r"^\d{14}$"

# Colonnes du brut GKG projeté (contrat consommé par le staging dbt).
_RAW_GKG_COLS = (
    "record_id",
    "date",
    "organization",
    "source_common_name",
    "document_identifier",
    "translated",
)


def raw_gkg_expectations() -> list:
    """Contrat structurel du brut GKG projeté (colonnes + format date + non-vacuité)."""
    exps = [gxe.ExpectColumnToExist(column=c) for c in _RAW_GKG_COLS]
    exps += [
        gxe.ExpectColumnValuesToNotBeNull(column="record_id"),
        gxe.ExpectColumnValuesToNotBeNull(column="date"),
        gxe.ExpectColumnValuesToNotBeNull(column="organization"),
        gxe.ExpectColumnValuesToMatchRegex(column="date", regex=_GKG_DATE_RE),
        gxe.ExpectColumnValueLengthsToBeBetween(column="organization", min_value=1),
        gxe.ExpectTableRowCountToBeBetween(min_value=1),
    ]
    return exps


# Colonnes du curated des mentions qualifiées « université » (contrat servi au mart).
_CURATED_UNIV_COLS = ("record_id", "event_date", "university_id", "university_name")


def curated_university_mentions_expectations() -> list:
    """Contrat des mentions qualifiées « université » (appariées au référentiel).

    Défense en profondeur sur le Parquet servi : les not_null sont déjà bloqués par
    les tests dbt ; on redouble ici la présence des colonnes du contrat et la
    non-vacuité des clés (université + date) au niveau du stockage curated.
    """
    exps = [gxe.ExpectColumnToExist(column=c) for c in _CURATED_UNIV_COLS]
    exps += [
        gxe.ExpectColumnValuesToNotBeNull(column="record_id"),
        gxe.ExpectColumnValuesToNotBeNull(column="university_id"),
        gxe.ExpectColumnValuesToNotBeNull(column="event_date"),
        gxe.ExpectTableRowCountToBeBetween(min_value=1),
    ]
    return exps


def validate_df(df, suite_name: str, expectations: list) -> tuple[bool, dict]:
    """Valide ``df`` contre une suite via un contexte GE éphémère (hermétique).

    Retourne ``(passed, metadata)`` où ``metadata`` résume chaque attente (type +
    succès) pour l'``AssetCheckResult``. Aucune écriture disque, aucun réseau ; la
    barre de progression « Calculating Metrics » est coupée.
    """
    ctx = gx.get_context(mode="ephemeral")
    ctx.variables.progress_bars = ProgressBarsConfig(globally=False, metric_calculations=False)
    suite = gx.ExpectationSuite(name=suite_name)
    for expectation in expectations:
        suite.add_expectation(expectation)
    batch = (
        ctx.data_sources.add_pandas(name="mediawatch_quality")
        .add_dataframe_asset(name="layer")
        .add_batch_definition_whole_dataframe("batch")
        .get_batch(batch_parameters={"dataframe": df})
    )
    result = batch.validate(suite, result_format="BASIC")
    evaluated = [
        {"type": r.expectation_config.type, "success": bool(r.success)} for r in result.results
    ]
    metadata = {
        "suite": suite_name,
        "passed": bool(result.success),
        "evaluated": len(evaluated),
        "failed": [e["type"] for e in evaluated if not e["success"]],
    }
    return bool(result.success), metadata
