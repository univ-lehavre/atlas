"""Émission OpenLineage → Marquez (étape 3.5b).

Centralise le **canal de lineage** et surtout la **convention de nommage des
datasets**, pour que les jobs du pipeline s'enchaînent en un graphe CONNECTÉ dans
Marquez : un dataset de sortie d'un job doit porter EXACTEMENT le même
``(namespace, name)`` que le dataset d'entrée du job aval.

Chaîne visée (namespace ``citation`` pour le lakehouse interne ; ``openalex`` pour la
source externe, en prose seulement). Chaque flèche = un dataset partagé entre le job
amont (sortie) et le job aval (entrée) :

    openalex:data/{works,authors}
        ─▶ [raw_snapshot]   ─▶ citation:raw/{works,authors}
        ─▶ [citation_dbt_models] ─▶ citation:curated/* + citation:marts/collab
        ─▶ [collab_manifest] ─▶ citation:marts/collab/manifest

Invariant RGPD : **aucune PII** dans les métadonnées de lineage — uniquement des noms
TECHNIQUES (tables, chemins de couche), jamais d'identifiant de personne ou d'œuvre.

NB : pas de ``from __future__ import annotations`` (cohérence dépôt, drift D9).
"""

import os
from datetime import datetime, timezone

from openlineage.client import OpenLineageClient
from openlineage.client.event_v2 import Dataset, Job, Run, RunEvent, RunState

_PRODUCER = "https://github.com/univ-lehavre/atlas/dataops/citation-dagster"

# Namespaces : interne (lakehouse) et source externe.
NAMESPACE = "citation"
SOURCE_NAMESPACE = "openalex"


def raw_dataset(entity: str) -> Dataset:
    """Dataset de la couche brute (sortie de raw_snapshot, entrée de dbt)."""
    return Dataset(namespace=NAMESPACE, name=f"raw/{entity}")


def curated_dataset(model: str) -> Dataset:
    """Dataset d'un modèle curated (sortie de dbt)."""
    return Dataset(namespace=NAMESPACE, name=f"curated/{model}")


def mart_dataset(mart_subdir: str = "marts/collab") -> Dataset:
    """Dataset d'un artefact servi (sortie de dbt/asset, entrée de son manifest).

    ``mart_subdir`` par défaut ``marts/collab`` (rétro-compat) ; les artefacts du
    producteur researchers passent ``marts/researchers`` / ``marts/researcher_vectors``.
    """
    return Dataset(namespace=NAMESPACE, name=mart_subdir)


def index_dataset(name: str) -> Dataset:
    """Dataset de l'index Postgres servi (sortie d'index_load, étape 4).

    ``name`` ex. ``researchers`` → ``citation:index/researchers``. Termine la chaîne
    raw → curated → mart → INDEX dans Marquez. Noms techniques (pas de PII).
    """
    return Dataset(namespace=NAMESPACE, name=f"index/{name}")


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


def dbt_lineage_io() -> tuple[list, list]:
    """Datasets d'entrée/sortie du job dbt (connecte raw → curated/mart).

    Entrées : la couche brute (sorties de raw_snapshot). Sorties : les modèles curated
    et le mart servi (entrée de collab_manifest). Noms purement techniques (pas de PII).
    """
    inputs = [raw_dataset("works"), raw_dataset("authors")]
    outputs = [
        curated_dataset("curated_works"),
        curated_dataset("curated_authors"),
        curated_dataset("curated_authorships"),
        curated_dataset("curated_edges"),
        # Provenance lexicale du producteur researchers (lot 1, modèles dbt).
        curated_dataset("curated_work_topics"),
        curated_dataset("curated_work_keywords"),
        mart_dataset(),
        # Mart lexical researchers (lot 2, modèle dbt). Le mart researcher_vectors
        # vient de l'asset PYTHON researcher_embeddings, pas de dbt → hors dbt_lineage_io
        # (il trace ses propres I/O depuis l'asset).
        mart_dataset("marts/researchers"),
    ]
    return inputs, outputs
