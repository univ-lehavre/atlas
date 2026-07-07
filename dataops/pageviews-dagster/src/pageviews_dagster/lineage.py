"""Émission OpenLineage → Marquez de la code-location « pageviews ».

Centralise le **canal de lineage** et la **convention de nommage des datasets**,
pour que les jobs du pipeline s'enchaînent en un graphe CONNECTÉ dans Marquez : un
dataset de sortie d'un job porte EXACTEMENT le même ``(namespace, name)`` que le
dataset d'entrée du job aval.

Chaîne visée (namespace ``pageviews`` pour le lakehouse interne ; ``wikimedia`` pour
la source externe, en prose seulement). Chaque flèche = un dataset partagé entre le
job amont (sortie) et le job aval (entrée) :

    wikimedia:pageview_complete (+ API Pageviews / SPARQL Wikidata / API OpenAlex)
        ─▶ [raw_pageviews]  ─▶ pageviews:raw/pageviews
        ─▶ [pageviews_dbt]  ─▶ pageviews:curated/* + pageviews:marts/views_forecast
        ─▶ [forecast_manifest] ─▶ pageviews:marts/views_forecast/manifest

Les sources externes (dumps mensuels ``pageview_complete`` de Wikimedia, API
Pageviews, SPARQL Wikidata, API OpenAlex) ne sont NOMMÉES qu'en description : les
identifiants de datasets restent neutres (``pageviews``), conformément à la
convention de nommage du dépôt.

Invariant : **aucune donnée sensible** dans les métadonnées de lineage — uniquement
des noms TECHNIQUES (tables, chemins de couche), jamais de contenu de vue. La série
porte sur des organisations (établissements), au grain ``(university_id, month,
views)``.

NB : pas de ``from __future__ import annotations`` (cohérence dépôt, drift D9).
"""

import os
from datetime import datetime, timezone

from openlineage.client import OpenLineageClient
from openlineage.client.event_v2 import Dataset, Job, Run, RunEvent, RunState

_PRODUCER = "https://github.com/univ-lehavre/atlas/dataops/pageviews-dagster"

# Namespaces : interne (lakehouse) et source externe.
NAMESPACE = "pageviews"
SOURCE_NAMESPACE = "wikimedia"


def source_dataset() -> Dataset:
    """Dataset de la source externe (entrée de raw_pageviews)."""
    return Dataset(namespace=SOURCE_NAMESPACE, name="pageview_complete")


def raw_dataset(entity: str = "pageviews") -> Dataset:
    """Dataset de la couche brute (sortie de raw_pageviews, entrée de dbt)."""
    return Dataset(namespace=NAMESPACE, name=f"raw/{entity}")


def curated_dataset(model: str) -> Dataset:
    """Dataset d'un modèle curated (sortie de dbt)."""
    return Dataset(namespace=NAMESPACE, name=f"curated/{model}")


def mart_dataset(mart_subdir: str = "marts/views_forecast") -> Dataset:
    """Dataset d'un artefact servi (sortie de dbt/asset, entrée de son manifest)."""
    return Dataset(namespace=NAMESPACE, name=mart_subdir)


def emit(
    state: RunState,
    run_id: str,
    job_name: str,
    inputs: list,
    outputs: list,
) -> None:
    """Émet un événement OpenLineage (no-op si ``OPENLINEAGE_URL`` absent).

    ``run_id`` partagé par les jobs d'un même run Dagster → Marquez relie les nœuds.
    Le ``namespace`` du job vient de l'environnement (``OPENLINEAGE_NAMESPACE``, défaut
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
