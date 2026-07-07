"""Suites Great Expectations de la code-location « pageviews » + validation.

Module **pur** (aucun Dagster, aucune I/O réseau ni cluster) : il construit les
suites d'attentes par couche et valide un ``DataFrame`` pandas via un **contexte GE
éphémère** (en mémoire, hermétique — rien sous ``~/.great_expectations``, pas de
réseau, télémétrie coupée). L'*asset check* Dagster (assets/quality.py) ne fait que
charger la donnée puis appeler ``validate_df``.

Les suites sont **complémentaires** des tests dbt (qui couvrent déjà
not_null/unique/accepted_values sur le mart) :
- couche **raw** : le plus de valeur — le brut des vues mensuelles n'a AUCUN test
  dbt. On vérifie la présence des colonnes que le staging consomme, le format du
  ``month`` (AAAAMM), la non-nullité de ``university_id`` et la borne ``views >= 0``.
- couche **marts** : contrat de colonnes + domaine des labels + bornes de sanité, en
  défense en profondeur sur le Parquet servi. L'unicité du grain
  ``(university_id, horizon_label)`` est déjà bloquée par le test dbt ; on la redouble
  ici via une colonne dérivée booléenne calculée par le loader.

NB : pas de ``from __future__ import annotations`` (cohérence dépôt, drift D9).
"""

import os

import great_expectations as gx
import great_expectations.expectations as gxe
from great_expectations.data_context.types.base import ProgressBarsConfig

# Coupe la télémétrie par précaution (le module analytics peut être absent selon le
# build ; la variable reste le commutateur documenté).
os.environ.setdefault("GX_ANALYTICS_ENABLED", "false")

# Format du mois porté par la colonne ``month`` : AAAAMM (série mensuelle, ADR grain).
_MONTH_RE = r"^\d{6}$"

# Domaine des horizons métier servis (équivalents mensuels de 1 sem. / 1 mois / 1 an).
_HORIZON_LABELS = ["month_1", "month_3", "year_1"]

# Domaine du mode de service : prédictif (modèle avec pouvoir prédictif) ou descriptif
# (repli sans pouvoir prédictif). Cohérent avec forecast_model.served_mode.
_SERVED_MODES = ["predictive", "descriptive"]

# Colonnes du brut des vues mensuelles projeté (contrat consommé par le staging dbt).
_RAW_PAGEVIEWS_COLS = ("university_id", "month", "views")

# Colonnes du mart de prévision servi (contrat lu par l'application).
_MARTS_FORECAST_COLS = (
    "university_id",
    "horizon_label",
    "views_pred",
    "served_mode",
)


# Les *builders* renvoient une LISTE d'attentes (objets gxe), sans contexte ni I/O —
# purs et unit-testables. GE 1.18 exige un contexte actif pour ATTACHER une attente à
# une suite ; on assemble donc la suite dans validate_df, après get_context().


def raw_pageviews_expectations() -> list:
    """Contrat structurel du brut des vues mensuelles (colonnes + format mois + bornes).

    Le brut est la série mensuelle ``(university_id, month, views)`` sans aucun test
    dbt. On vérifie la présence des colonnes consommées en aval, la non-nullité de
    ``university_id``, le format ``AAAAMM`` du mois et la borne ``views >= 0`` (un
    compteur de vues ne peut pas être négatif). Table non vide.
    """
    exps = [gxe.ExpectColumnToExist(column=c) for c in _RAW_PAGEVIEWS_COLS]
    exps += [
        gxe.ExpectColumnValuesToNotBeNull(column="university_id"),
        gxe.ExpectColumnValuesToNotBeNull(column="month"),
        gxe.ExpectColumnValuesToMatchRegex(column="month", regex=_MONTH_RE),
        gxe.ExpectColumnValuesToBeBetween(column="views", min_value=0),
        gxe.ExpectTableRowCountToBeBetween(min_value=1),
    ]
    return exps


def marts_views_forecast_expectations() -> list:
    """Contrat de colonnes + domaines + bornes du mart de prévision servi.

    Défense en profondeur sur le Parquet servi à l'application : les not_null/unicité/
    accepted_values sont déjà bloqués par les tests dbt ; on redouble ici la présence
    des colonnes, la non-nullité des clés, la borne ``views_pred >= 0`` (une prévision
    de vues ne peut pas être négative), le domaine de ``horizon_label`` et de
    ``served_mode``, et l'unicité du grain ``(university_id, horizon_label)`` via la
    colonne dérivée booléenne ``_unique_grain`` calculée par le loader (GE 1.18 n'ayant
    pas d'attente d'unicité composite native).
    """
    exps = [gxe.ExpectColumnToExist(column=c) for c in _MARTS_FORECAST_COLS]
    exps += [
        gxe.ExpectColumnValuesToNotBeNull(column="university_id"),
        gxe.ExpectColumnValuesToNotBeNull(column="horizon_label"),
        gxe.ExpectColumnValuesToBeBetween(column="views_pred", min_value=0),
        gxe.ExpectColumnValuesToBeInSet(column="horizon_label", value_set=_HORIZON_LABELS),
        gxe.ExpectColumnValuesToBeInSet(column="served_mode", value_set=_SERVED_MODES),
        # Unicité composite (university_id, horizon_label) : portée par la colonne
        # dérivée booléenne _unique_grain (calculée par le loader), GE 1.18 n'offrant
        # pas d'attente d'unicité multi-colonnes native.
        gxe.ExpectColumnValuesToBeInSet(column="_unique_grain", value_set=[True]),
        gxe.ExpectTableRowCountToBeBetween(min_value=1),
    ]
    return exps


def validate_df(df, suite_name: str, expectations: list) -> tuple[bool, dict]:
    """Valide ``df`` contre une suite via un contexte GE éphémère (hermétique).

    Retourne ``(passed, metadata)`` où ``metadata`` résume chaque attente (type +
    succès) pour l'``AssetCheckResult``. Aucune écriture disque, aucun réseau ; la
    barre de progression « Calculating Metrics » est coupée (sinon elle pollue les
    logs Dagster).
    """
    ctx = gx.get_context(mode="ephemeral")
    ctx.variables.progress_bars = ProgressBarsConfig(globally=False, metric_calculations=False)
    suite = gx.ExpectationSuite(name=suite_name)
    for expectation in expectations:
        suite.add_expectation(expectation)
    batch = (
        ctx.data_sources.add_pandas(name="pageviews_quality")
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
