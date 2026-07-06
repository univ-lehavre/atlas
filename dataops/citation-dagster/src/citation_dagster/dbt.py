"""Intégration dbt ↔ Dagster du pipeline de citations (étape 3.2).

Expose les modèles dbt (`staging` → `curated`) comme assets Dagster via
``dagster-dbt`` (``@dbt_assets``). Le point délicat est le **manifest** : le
décorateur ``@dbt_assets(manifest=…)`` le lit **à l'import** du module, or
``target/`` est git-ignoré (le manifest n'est pas commité). On le garantit à
trois niveaux :

1. **Image (prod, gRPC)** : ``dbt parse`` au build Docker → manifest packagé
   (source de vérité, démarrage rapide, hermétique : pas de réseau).
2. **Dev (``dagster dev``)** : ``DbtProject.prepare_if_dev()`` régénère le
   manifest au lancement.
3. **Import sans manifest (lint, checkout neuf, collecte pytest)** :
   ``ensure_manifest()`` lance un ``dbt parse`` paresseux si le manifest manque.

NB : pas de ``from __future__ import annotations`` — ce module construit des
assets que Dagster introspecte (leçon drift D9).
"""

import json
import os
from pathlib import Path

from dagster import AssetExecutionContext
from dagster_dbt import DbtCliResource, DbtProject, dbt_assets
from openlineage.client.event_v2 import RunState

from citation_dagster import lineage
from citation_dagster.resources import ceph_target_from_env

# Racine du projet dbt. En dépôt : frère de ``citation-dagster`` sous ``dataops/``
# (depuis src/citation_dagster/dbt.py → parents[3] == dataops/). Dans l'image, le
# projet est copié ailleurs : on autorise une surcharge par variable d'environnement
# (posée par le Dockerfile) pour découpler le chemin runtime du layout du dépôt.
_DEFAULT_PROJECT_DIR = Path(__file__).resolve().parents[3] / "citation-dbt"
DBT_PROJECT_DIR = Path(os.environ.get("CITATION_DBT_PROJECT_DIR", _DEFAULT_PROJECT_DIR))

dbt_project = DbtProject(project_dir=os.fspath(DBT_PROJECT_DIR))
# No-op hors ``dagster dev`` ; régénère le manifest pendant le dev local.
dbt_project.prepare_if_dev()

# Valeurs FACTICES injectées (uniquement si absentes) pour rendre ``dbt parse``
# hermétique : profiles.yml résout son secret S3 via ``env_var('AWS_…')`` au PARSE,
# alors que le parse ne fait AUCUNE I/O S3. En CI / checkout neuf ces variables sont
# absentes → le parse échouerait (« Env var required »). On ne pose les factices que
# si elles manquent : en prod (image) et au run réel, les vraies clés (Secret
# citation-s3-access) priment et ne sont jamais écrasées. Même principe que le
# Dockerfile (drift D14 : parse non hermétique sans ces variables).
_DUMMY_PARSE_ENV = {
    "AWS_ACCESS_KEY_ID": "x",
    "AWS_SECRET_ACCESS_KEY": "x",
    "BUCKET_HOST": "x",
    "BUCKET_PORT": "0",
}

# Période (YYYY-MM) de la partition curated/mart. SOURCE UNIQUE partagée entre le
# run dbt (ci-dessous) et l'asset de manifest (collab_manifest) : les deux doivent
# viser EXACTEMENT le même préfixe dt=…/run=…/ ; deux littéraux indépendants
# divergeraient. (Provisoire : dérivé d'un schedule/partition Dagster ultérieurement.)
CURATED_DT = "0000-00"


def build_dbt_vars(run_id: str, curated_dt: str) -> dict[str, str]:
    """Variables dbt injectées au run : racines S3 + période + id de run + opposition RGPD.

    ``raw_root`` / ``curated_root`` / ``marts_root`` sont **dérivées du bucket réel**
    (``BUCKET_NAME`` de l'OBC, via ``ceph_target_from_env``). Les défauts de
    ``dbt_project.yml`` (``s3://citation/…``) ne valent QUE pour le banc, où le bucket
    est fixé à ``citation`` ; en prod l'OBC nomme le bucket ``citation-datalake-<uuid>``
    → sans surcharge, dbt écrirait/lirait un bucket inexistant (404). On les injecte au
    run, comme le fait déjà l'harnais de test d'intégration (``test_dbt_models``).

    ``curated_run`` vient de ``context.run_id`` → un rejeu écrit un nouveau
    préfixe ``run=<id>/`` (immutabilité, jamais d'écriture en place).

    ``opposition_pairs`` (lot 5) relaie l'env ``OPPOSITION_PAIRS`` (JSON de couples
    {author_id, work_id} à purger ; défaut ``[]``) TELLE QUELLE vers dbt. C'est la
    SOURCE UNIQUE de la purge : le MÊME env est lu par l'asset vecteur Python, pour
    que le filtrage lexical (dbt) et vecteur (Python) restent cohérents. On relaie
    sans décider — la liste vient du déployeur (ADR 0059).

    ``eunicoast_min_year`` (fenêtre temporelle du périmètre EUNICoast) : FIGE la borne
    « moins de N ans » du mart2 au run, relayée de l'env ``CITATION_EUNICOAST_MIN_YEAR``
    (valeur d'instance, déployeur). Sans elle, ``curated_eunicoast_works`` retombe sur
    ``current_date − 10`` qui **glisse** d'un run à l'autre → corpus d'entraînement
    non reproductible (ADR 0057). On ne l'injecte QUE si l'env est posé (sinon on laisse
    le défaut glissant de la macro dbt), pour ne pas figer une valeur arbitraire.
    """
    bucket = ceph_target_from_env().bucket
    vars_: dict[str, str] = {
        "raw_root": f"s3://{bucket}/raw",
        # `mart_root` = source de la chaîne dbt (le mart EUNICoast Parquet, ADR 0094) : DOIT
        # être dérivée du bucket réel comme les autres racines, sinon dbt lit le défaut banc
        # `s3://citation/mart_eunicoast` inexistant en prod → 404 (constaté prod 2026-07-06 :
        # le transform échouait dès stg_citation_works/authorships/topics). Oublié au câblage
        # initial du refactoring (les tests d'intégration passent mart_root explicitement, donc
        # le banc ne le voyait pas).
        "mart_root": f"s3://{bucket}/mart_eunicoast",
        "curated_root": f"s3://{bucket}/curated",
        "marts_root": f"s3://{bucket}/marts",
        "curated_dt": curated_dt,
        "curated_run": run_id,
        "opposition_pairs": os.environ.get("OPPOSITION_PAIRS", "[]"),
    }
    min_year = os.environ.get("CITATION_EUNICOAST_MIN_YEAR")
    if min_year:
        vars_["eunicoast_min_year"] = min_year
    return vars_


def ensure_manifest() -> Path:
    """Garantit un ``manifest.json`` sur disque (``dbt parse`` paresseux si absent).

    En prod le manifest est packagé dans l'image (``dbt parse`` au build) : ce
    chemin n'est emprunté qu'en test/CI/checkout neuf. Le ``parse`` n'effectue
    aucune I/O S3 (résolution de graphe uniquement) ; on injecte des identifiants
    S3 factices (si absents) pour qu'il rende ``profiles.yml`` sans vraies clés.
    """
    manifest_path = dbt_project.manifest_path
    if not manifest_path.exists():
        # DbtCliResource.cli hérite de os.environ : on y pose les factices manquantes
        # AVANT le parse (jamais d'écrasement d'une vraie clé déjà présente).
        for key, value in _DUMMY_PARSE_ENV.items():
            os.environ.setdefault(key, value)
        DbtCliResource(project_dir=os.fspath(DBT_PROJECT_DIR)).cli(
            ["parse"], target_path=Path("target")
        ).wait()
    return manifest_path


def build_citation_dbt_assets():
    """Construit l'asset multi-modèles dbt (``staging`` + ``curated``).

    Isolé dans une fonction pour que l'import du module ne déclenche pas la
    lecture du manifest si dbt est indisponible (lint léger). Le corps du
    ``@dbt_assets`` est volontairement mince (construire les vars, streamer
    ``dbt build``) : aucune logique métier Python à couvrir par un run dbt réel.
    """
    manifest = ensure_manifest()

    @dbt_assets(manifest=manifest)
    def citation_dbt_models(context: AssetExecutionContext, dbt: DbtCliResource):
        dbt_vars = build_dbt_vars(context.run_id, curated_dt=CURATED_DT)  # pragma: no cover
        # Lineage OpenLineage → Marquez (3.5b) : connecte raw → curated/mart. No-op
        # sans OPENLINEAGE_URL. Émis autour du build pour encadrer le job dbt.
        dbt_inputs, dbt_outputs = lineage.dbt_lineage_io()  # pragma: no cover
        lineage.emit(  # pragma: no cover
            RunState.START, context.run_id, "citation_dbt_models", dbt_inputs, dbt_outputs
        )
        yield from dbt.cli(  # pragma: no cover
            ["build", "--vars", json.dumps(dbt_vars)], context=context
        ).stream()
        lineage.emit(  # pragma: no cover
            RunState.COMPLETE, context.run_id, "citation_dbt_models", dbt_inputs, dbt_outputs
        )

    return citation_dbt_models


def dbt_components():
    """Renvoie ``(assets, resources)`` dbt, ou ``([], {})`` si dbt indisponible.

    La dégradation propre (``[], {}``) garde la code-location chargeable pour le
    lint et la collecte pytest même sans manifest/dbt. En prod, le manifest est
    packagé : ce chemin nominal renvoie l'asset dbt et la ressource CLI.
    """
    try:
        assets = build_citation_dbt_assets()
    except Exception:
        return [], {}
    resources = {"dbt": DbtCliResource(project_dir=os.fspath(DBT_PROJECT_DIR))}
    return [assets], resources
