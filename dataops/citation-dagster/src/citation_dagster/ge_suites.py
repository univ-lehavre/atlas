"""Suites Great Expectations du pipeline + validation in-process (étape 3.5a).

Module **pur** (aucun Dagster, aucune I/O réseau ni cluster) : il construit les
suites d'attentes par couche et valide un ``DataFrame`` pandas via un **contexte GE
éphémère** (en mémoire, hermétique — rien sous ``~/.great_expectations``, pas de
réseau, télémétrie coupée). Les *asset checks* Dagster (assets/quality.py) ne font
que charger la donnée puis appeler ``validate_df``.

Les suites sont **complémentaires** des tests dbt (qui couvrent déjà
not_null/unique/relationships et les invariants singuliers du mart) :
- couche **raw** : le plus de valeur — le brut JSONL.gz n'a AUCUN test dbt. On
  vérifie la présence des colonnes que le staging consomme, le format des ids et la
  non-vacuité.
- couche **curated** : format des ids + invariant « pas d'auto-citation » sur le
  Parquet servi (que dbt n'asserte pas), en défense en profondeur.
- couche **marts** : contrat de colonnes + bornes de sanité (garde anti-explosion de
  jointure). Les invariants somme/ordre canonique sont DÉJÀ bloqués par le test dbt
  singulier ``assert_collab_pairs_consistent`` ; on les redouble ici en **défense en
  profondeur sur le Parquet servi** (pas une couverture neuve).

NB : pas de ``from __future__ import annotations`` (cohérence dépôt, drift D9).
"""

import os

import great_expectations as gx
import great_expectations.expectations as gxe
from great_expectations.data_context.types.base import ProgressBarsConfig

# Coupe la télémétrie par précaution (le module analytics peut être absent selon le
# build ; la variable reste le commutateur documenté).
os.environ.setdefault("GX_ANALYTICS_ENABLED", "false")

# Format d'id OpenAlex (en prose la marque est tolérée ; ici c'est le format réel).
_WORK_ID_RE = r"^https://openalex\.org/W"

# Borne haute de sanité pour co_publications : un nombre absurde signalerait une
# explosion de jointure (pas une vraie collaboration). Large mais fini.
_CO_PUBLICATIONS_MAX = 1_000_000

# Colonnes du mart servi (contrat 3.4) : co-autorat par paire (ADR 0105).
_MARTS_COLS = ("author_a", "author_b", "co_publications")

# Colonnes du mart lexical researchers (lot 2) et borne haute de sanité du poids.
_RESEARCHERS_COLS = ("author_id", "kind", "label_id", "label", "weight", "freq")
_WEIGHT_MAX = 1_000_000.0


# Les *builders* renvoient une LISTE d'attentes (objets gxe), sans contexte ni I/O —
# purs et unit-testables. GE 1.18 exige un contexte actif pour ATTACHER une attente à
# une suite ; on assemble donc la suite dans validate_df, après get_context().


def raw_works_expectations() -> list:
    """Contrat structurel du brut works Parquet (colonnes consommées en aval + format id).

    Le brut est désormais le **Parquet** OpenAlex (ADR 0105) : on valide les colonnes que
    le mart EUNICoast projette (id, publication_year, title, authorships, topics) — plus de
    `referenced_works` (hors périmètre) ni d'entité `authors` (le work est auto-suffisant)."""
    return [
        gxe.ExpectColumnToExist(column="id"),
        gxe.ExpectColumnToExist(column="publication_year"),
        gxe.ExpectColumnToExist(column="title"),
        gxe.ExpectColumnToExist(column="authorships"),
        gxe.ExpectColumnToExist(column="topics"),
        gxe.ExpectColumnValuesToNotBeNull(column="id"),
        gxe.ExpectColumnValuesToMatchRegex(column="id", regex=_WORK_ID_RE),
        gxe.ExpectTableRowCountToBeBetween(min_value=1),
    ]


def marts_collab_expectations() -> list:
    """Contrat de colonnes + bornes de sanité du mart de co-autorat servi (ADR 0105).

    Le mart `marts_collab_pairs` porte désormais le CO-AUTORAT (author_a, author_b,
    co_publications) — plus les citations croisées. Défense en profondeur sur le Parquet
    servi : not_null sur les clés + co_publications borné (>= 1, borne haute de sanité).
    La paire canonique (author_a < author_b) est déjà bloquée par le test dbt singulier.
    """
    exps = [gxe.ExpectColumnValuesToNotBeNull(column=c) for c in _MARTS_COLS]
    exps += [
        gxe.ExpectColumnValuesToBeBetween(
            column="co_publications", min_value=1, max_value=_CO_PUBLICATIONS_MAX
        ),
    ]
    return exps


def marts_researchers_expectations() -> list:
    """Contrat de colonnes + bornes de sanité du mart lexical researchers (lot 2).

    Défense en profondeur sur le Parquet servi : les not_null/unicité/accepted_values
    sont déjà bloqués par les tests dbt ; on redouble ici les not_null, le domaine de
    ``kind`` et les bornes ``weight > 0`` / ``freq >= 1`` au niveau du stockage servi.
    """
    exps = [gxe.ExpectColumnValuesToNotBeNull(column=c) for c in _RESEARCHERS_COLS]
    exps += [
        gxe.ExpectColumnValuesToBeInSet(column="kind", value_set=["topic", "keyword"]),
        # weight > 0 strict : porté par la colonne dérivée booléenne _weight_ok (calculée
        # par le loader), GE 1.18 n'acceptant pas strict_min_value sur ExpectBetween.
        gxe.ExpectColumnValuesToBeInSet(column="_weight_ok", value_set=[True]),
        gxe.ExpectColumnValuesToBeBetween(column="weight", max_value=_WEIGHT_MAX),
        gxe.ExpectColumnValuesToBeBetween(column="freq", min_value=1),
    ]
    return exps


def marts_researcher_vectors_expectations() -> list:
    """Contrat de l'agrégat vecteur par author_id (lot 3).

    Le DataFrame doit porter deux colonnes dérivées (calculées par le loader) :
    ``_dim_ok`` (len(vector) == EMBEDDING_DIM) et ``_norm_ok`` (norme L2 ∈ {0, ≈1}).
    La tolérance {0, 1} accepte le vecteur NUL légitime d'un author_id sans publication
    vectorisable (``embedding.aggregate_author`` renvoie un vecteur nul) — une assertion
    stricte ``≈1`` rejetterait cette donnée valide.
    """
    return [
        gxe.ExpectColumnValuesToNotBeNull(column="author_id"),
        gxe.ExpectColumnValuesToNotBeNull(column="vector"),
        gxe.ExpectColumnValuesToBeInSet(column="_dim_ok", value_set=[True]),
        gxe.ExpectColumnValuesToBeInSet(column="_norm_ok", value_set=[True]),
    ]


def pair_uplift_predictions_expectations() -> list:
    """Contrat des prédictions d'uplift servies (ADR 0067, marts servi).

    Les clés de paire sont non nulles, la paire est canonique (author_a < author_b, via
    la colonne dérivée ``_canonical`` calculée par le loader), et ``served_mode`` est dans
    le domaine attendu {predictive, descriptive}.
    """
    return [
        gxe.ExpectColumnValuesToNotBeNull(column="author_a"),
        gxe.ExpectColumnValuesToNotBeNull(column="author_b"),
        gxe.ExpectColumnValuesToNotBeNull(column="uplift"),
        gxe.ExpectColumnValuesToBeInSet(column="_canonical", value_set=[True]),
        gxe.ExpectColumnValuesToBeInSet(
            column="served_mode", value_set=["predictive", "descriptive"]
        ),
    ]


def author_recommendations_expectations() -> list:
    """Contrat des recommandations par auteur servies (ADR 0067, marts servi).

    Un auteur ne se recommande pas lui-même (colonne dérivée ``_not_self`` =
    author_id <> partner_id), le rang est >= 1, et les clés sont non nulles.
    """
    return [
        gxe.ExpectColumnValuesToNotBeNull(column="author_id"),
        gxe.ExpectColumnValuesToNotBeNull(column="partner_id"),
        gxe.ExpectColumnValuesToBeInSet(column="_not_self", value_set=[True]),
        gxe.ExpectColumnValuesToBeBetween(column="rank", min_value=1),
    ]


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
        ctx.data_sources.add_pandas(name="citation_quality")
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
