"""Intégration dbt ↔ Dagster de la prévision des vues Wikipédia (ADR 0055/0097).

Expose les modèles dbt (``staging`` → ``curated`` → ``marts``) comme assets Dagster
via ``dagster-dbt`` (``@dbt_assets``). Le point délicat est le **manifest** : le
décorateur ``@dbt_assets(manifest=…)`` le lit **à l'import** du module, or
``target/`` est git-ignoré (le manifest n'est pas commité). On le garantit à trois
niveaux :

1. **Image (prod, gRPC)** : ``dbt parse`` au build Docker → manifest packagé.
2. **Dev (``dagster dev``)** : ``DbtProject.prepare_if_dev()`` régénère le manifest.
3. **Import sans manifest (lint, checkout neuf, collecte pytest)** :
   ``ensure_manifest()`` lance un ``dbt parse`` paresseux si le manifest manque.

Si dbt (ou le projet dbt) est indisponible malgré tout, ``dbt_components()`` dégrade
proprement en ``([], {})`` : la code-location reste chargeable pour le lint et la
collecte pytest sans dbt (le projet ``pageviews-dbt`` peut être vide en checkout de
travail — les modèles arrivent dans une PR ultérieure).

Grain de la série (ADR 0097) : ``(university_id, month, views)`` — série MENSUELLE
(pas journalière), saisonnalité annuelle. Le curseur de la transformation est donc le
**mois** (``YYYY-MM``), pas un jour : partition mensuelle, période curated ``curated_dt``
mensuelle.

Namespace lineage ``pageviews`` (interne, lakehouse). La source Wikimedia (dumps
``pageview_complete``, API Pageviews, SPARQL Wikidata, API OpenAlex) n'apparaît qu'en
prose, jamais dans un identifiant interne (neutralité ADR 0035).

NB : pas de ``from __future__ import annotations`` — ce module construit des assets
que Dagster introspecte (leçon drift D9).
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dagster import AssetExecutionContext, MonthlyPartitionsDefinition
from dagster_dbt import DbtCliResource, DbtProject, dbt_assets
from openlineage.client import OpenLineageClient
from openlineage.client.event_v2 import Dataset, Job, Run, RunEvent, RunState

# Racine du projet dbt. En dépôt : frère de ``pageviews-dagster`` sous ``dataops/``
# (depuis src/pageviews_dagster/dbt.py → parents[3] == dataops/). Dans l'image, le
# projet est copié ailleurs : surcharge possible par variable d'environnement (posée
# par le Dockerfile) pour découpler le chemin runtime du layout du dépôt.
_DEFAULT_PROJECT_DIR = Path(__file__).resolve().parents[3] / "pageviews-dbt"
DBT_PROJECT_DIR = Path(os.environ.get("PAGEVIEWS_DBT_PROJECT_DIR", _DEFAULT_PROJECT_DIR))

dbt_project = DbtProject(project_dir=os.fspath(DBT_PROJECT_DIR))
# No-op hors ``dagster dev`` ; régénère le manifest pendant le dev local.
dbt_project.prepare_if_dev()

# Producer OpenLineage (URI du code-location, pas une I/O — juste une étiquette).
_PRODUCER = "https://github.com/univ-lehavre/atlas/dataops/pageviews-dagster"

# Namespace interne du lakehouse (convention neutre, ADR 0022/0035). La source
# Wikimedia reste en prose : jamais un identifiant interne.
LINEAGE_NAMESPACE = "pageviews"

# Valeurs FACTICES injectées (uniquement si absentes) pour rendre ``dbt parse``
# hermétique : profiles.yml résout son secret S3 via ``env_var('AWS_…')`` au PARSE,
# alors que le parse ne fait AUCUNE I/O S3. En CI / checkout neuf ces variables sont
# absentes → le parse échouerait. On ne pose les factices que si elles manquent : en
# prod (image) et au run réel, les vraies clés (Secret pageviews-s3-access) priment.
_DUMMY_PARSE_ENV = {
    "AWS_ACCESS_KEY_ID": "x",
    "AWS_SECRET_ACCESS_KEY": "x",
    "BUCKET_HOST": "x",
    "BUCKET_PORT": "0",
}

# Date de départ des partitions MENSUELLES. Surchargeable par env pour borner un banc
# (pas de backfill géant en test). Le schedule et le backfill s'appuient dessus.
_PARTITION_START = os.environ.get("PAGEVIEWS_START_MONTH", "2015-07-01")
pageviews_monthly_partitions = MonthlyPartitionsDefinition(start_date=_PARTITION_START)

# Valeur de partition par défaut hors run partitionné (dev/parse). En run réel, la
# transformation est partitionnée par mois : le mois (YYYY-MM) sert à la fois de
# période curated/mart (dt=) ET de borne de scan du brut.
DEFAULT_MONTH = "0000-00"


def build_dbt_vars(run_id: str, month: str) -> dict[str, str]:
    """Variables dbt injectées au run : mois de partition + id de run + source du réf.

    ``month`` (YYYY-MM) est LE curseur de la transformation incrémentale : il BORNE le
    scan du brut (``raw/pageviews/dt=<month>/``) et sert de période immuable
    (``curated_dt``) des artefacts curated/mart. Aligné sur la partition du run brut
    amont — full-scan évité. Le grain de la série étant mensuel (ADR 0097), le curseur
    est un mois, pas un jour.

    ``curated_run`` vient de ``context.run_id`` → un rejeu écrit un nouveau préfixe
    ``run=<id>/`` (immutabilité, jamais d'écriture en place ; ADR 0057).

    ``ref_source`` relaie l'env ``PAGEVIEWS_REF_SOURCE`` (défaut ``seed`` : exemple
    versionné, tests hermétiques). La prod pose ``ingested`` pour lire le référentiel
    d'établissements ingéré (résolution Wikidata/OpenAlex → identifiant d'université).
    """
    return {
        "month": month,
        "curated_dt": month,
        "curated_run": run_id,
        "ref_source": os.environ.get("PAGEVIEWS_REF_SOURCE", "seed"),
    }


def ensure_manifest() -> Path:
    """Garantit un ``manifest.json`` sur disque (``dbt parse`` paresseux si absent).

    En prod le manifest est packagé dans l'image (``dbt parse`` au build) : ce chemin
    n'est emprunté qu'en test/CI/checkout neuf. Le ``parse`` n'effectue aucune I/O S3
    (résolution de graphe uniquement) ; on injecte des identifiants S3 factices (si
    absents) pour qu'il rende ``profiles.yml`` sans vraies clés.
    """
    manifest_path = dbt_project.manifest_path
    if not manifest_path.exists():
        for key, value in _DUMMY_PARSE_ENV.items():
            os.environ.setdefault(key, value)
        DbtCliResource(project_dir=os.fspath(DBT_PROJECT_DIR)).cli(
            ["parse"], target_path=Path("target")
        ).wait()
    return manifest_path


def _dataset(name: str) -> Dataset:
    """Dataset lineage du lakehouse interne (namespace ``pageviews``).

    Convention de nommage partagée entre job amont (sortie) et job aval (entrée) pour
    connecter le graphe Marquez. Invariant RGPD : aucune donnée personnelle dans les
    métadonnées de lineage — uniquement des noms TECHNIQUES (tables, chemins de couche)
    et des identifiants d'ORGANISATIONS (établissements), jamais d'individu.
    """
    return Dataset(namespace=LINEAGE_NAMESPACE, name=name)


def _emit(state: RunState, run_id: str, job_name: str, inputs: list, outputs: list) -> None:
    """Émet un événement OpenLineage (no-op si ``OPENLINEAGE_URL`` absent).

    ``run_id`` partagé par les jobs d'un même run Dagster → Marquez relie les nœuds. Le
    ``namespace`` du job vient de l'environnement (``OPENLINEAGE_NAMESPACE``, défaut
    ``dagster``) ; celui des datasets est fixé par la convention ci-dessus.
    """
    if not os.environ.get("OPENLINEAGE_URL"):
        return
    job_namespace = os.environ.get("OPENLINEAGE_NAMESPACE", "dagster")
    client = OpenLineageClient.from_environment()
    client.emit(
        RunEvent(
            eventType=state,
            eventTime=datetime.now(timezone.utc).isoformat(),
            run=Run(runId=run_id),
            job=Job(namespace=job_namespace, name=job_name),
            producer=_PRODUCER,
            inputs=inputs,
            outputs=outputs,
        )
    )


def build_pageviews_dbt_assets():
    """Construit l'asset multi-modèles dbt (``staging`` + ``curated`` + ``marts``).

    Isolé dans une fonction pour que l'import du module ne déclenche pas la lecture du
    manifest si dbt est indisponible (lint léger). Le corps du ``@dbt_assets`` est
    volontairement mince (construire les vars, émettre le lineage, streamer
    ``dbt build``) : aucune logique métier Python à couvrir par un run dbt réel.
    """
    manifest = ensure_manifest()

    @dbt_assets(manifest=manifest, partitions_def=pageviews_monthly_partitions)
    def pageviews_dbt_models(context: AssetExecutionContext, dbt: DbtCliResource):
        # month = la partition mensuelle (borne le scan du brut, grain ADR 0097).
        month = context.partition_key  # pragma: no cover
        dbt_vars = build_dbt_vars(context.run_id, month=month)  # pragma: no cover
        inputs = [_dataset("raw/pageviews")]  # pragma: no cover
        outputs = [  # pragma: no cover
            _dataset("curated/university_pageviews"),
            _dataset("marts/university_timeline"),
        ]
        _emit(  # pragma: no cover
            RunState.START, context.run_id, "pageviews_dbt_models", inputs, outputs
        )
        yield from dbt.cli(  # pragma: no cover
            ["build", "--vars", json.dumps(dbt_vars)], context=context
        ).stream()
        _emit(  # pragma: no cover
            RunState.COMPLETE, context.run_id, "pageviews_dbt_models", inputs, outputs
        )

    return pageviews_dbt_models


def dbt_components():
    """Renvoie ``(assets, resources)`` dbt, ou ``([], {})`` si dbt indisponible.

    La dégradation propre (``[], {}``) garde la code-location chargeable pour le lint et
    la collecte pytest même sans manifest/dbt (le projet ``pageviews-dbt`` peut être
    encore vide en checkout de travail). En prod, le manifest est packagé : ce chemin
    nominal renvoie l'asset dbt et la ressource CLI.
    """
    try:
        assets = build_pageviews_dbt_assets()
    except Exception:
        return [], {}
    resources = {"dbt": DbtCliResource(project_dir=os.fspath(DBT_PROJECT_DIR))}
    return [assets], resources
