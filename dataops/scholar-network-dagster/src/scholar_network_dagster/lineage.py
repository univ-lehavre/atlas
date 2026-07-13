"""Émission OpenLineage → Marquez.

Copié (jamais importé — ADR 0055) du gabarit `citation`, adapté au namespace
scholar-network. Centralise le **canal de lineage** et la **convention de nommage des
datasets**, pour que les jobs du pipeline s'enchaînent en un graphe CONNECTÉ dans Marquez :
un dataset de sortie d'un job doit porter EXACTEMENT le même ``(namespace, name)`` que le
dataset d'entrée du job aval.

Chaîne visée (namespace ``scholar-network`` pour le lakehouse interne ; ``openalex`` pour
la source externe, en prose seulement) — les couches concrètes (prefiltered → researchers →
scholar_works → profiles) seront câblées aux lots 2–5 :

    openalex:data/works
        ─▶ [prefiltered_raw]  ─▶ scholar-network:prefiltered/works
        ─▶ [researchers]      ─▶ scholar-network:passes/researchers
        ─▶ [scholar_works]    ─▶ scholar-network:passes/scholar_works
        ─▶ [scholar_profiles] ─▶ scholar-network:index/profiles

Invariant RGPD : **aucune PII** dans les métadonnées de lineage — uniquement des noms
TECHNIQUES (tables, chemins de couche), jamais d'identifiant de personne ou d'œuvre.

NB : pas de ``from __future__ import annotations`` (cohérence dépôt, drift D9).
"""

import os
from datetime import datetime, timezone

from openlineage.client import OpenLineageClient
from openlineage.client.event_v2 import Dataset, Job, Run, RunEvent, RunState

_PRODUCER = "https://github.com/univ-lehavre/atlas/dataops/scholar-network-dagster"

# Namespaces : interne (lakehouse) et source externe.
NAMESPACE = "scholar-network"
SOURCE_NAMESPACE = "openalex"


def raw_dataset(entity: str) -> Dataset:
    """Dataset de la couche brute (sortie de l'ingestion, entrée du pré-filtre)."""
    return Dataset(namespace=NAMESPACE, name=f"raw/{entity}")


def prefiltered_dataset(entity: str = "works") -> Dataset:
    """Dataset du brut pré-filtré (``≥2016 ∧ article``, projeté) — prédicat commun des
    deux passes (ADR 0103 §1.1). Sortie de ``prefiltered_raw`` (lot 2), entrée des passes."""
    return Dataset(namespace=NAMESPACE, name=f"prefiltered/{entity}")


def pass_dataset(name: str) -> Dataset:
    """Dataset d'une passe (``researchers`` en passe 1, ``scholar_works`` en passe 2).

    ``name`` ex. ``researchers`` → ``scholar-network:passes/researchers``. Noms techniques
    (pas de PII : uniquement des identifiants OpenAlex d'auteurs/works, jamais de nom civil).
    """
    return Dataset(namespace=NAMESPACE, name=f"passes/{name}")


def index_dataset(name: str) -> Dataset:
    """Dataset de l'index Postgres servi (sortie du chargement pgvector, lot 5).

    ``name`` ex. ``profiles`` → ``scholar-network:index/profiles``. Termine la chaîne
    raw → prefiltered → passes → INDEX dans Marquez. Noms techniques (pas de PII).
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
