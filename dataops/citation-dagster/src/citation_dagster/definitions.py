"""Point d'entrée de la code-location Dagster.

Chargé par le serveur gRPC (``dagster api grpc -m citation_dagster.definitions``)
que l'orchestrateur Dagster du cluster découvre via son workspace.

Deux familles d'assets :
- ``raw_snapshot`` — ingestion du brut OpenAlex (étape 2) ;
- les modèles dbt ``staging`` → ``curated`` (étape 3.2), exposés via
  ``dagster-dbt`` (``citation_dagster.dbt``).
"""

from dagster import AssetSelection, Definitions, ScheduleDefinition, define_asset_job

from citation_dagster.assets import (
    collab_manifest,
    index_load,
    raw_snapshot,
    researcher_embeddings,
    researcher_vectors_manifest,
    researchers_fts_manifest,
    researchers_manifest,
    work_vectors_manifest,
)
from citation_dagster.assets.drift import evidently_embedding_drift
from citation_dagster.assets.quality import (
    ge_curated_edges,
    ge_index_load,
    ge_marts_collab,
    ge_marts_researchers,
    ge_raw_contract,
    ge_researcher_vectors,
)
from citation_dagster.dbt import dbt_components

# Le pod de run (K8sRunLauncher) doit recevoir les accès S3 du lakehouse : on
# injecte le Secret citation-s3-access via les tags k8s au niveau du RUN (et non
# de l'op — en mode multiprocess, seule la config run-level configure le pod).
# Le job de transformation dbt en a besoin AUSSI : dbt-duckdb crée son secret S3
# depuis l'environnement (profiles.yml + env_var) à l'ouverture de session.
#
# Piège ADR 0086 (contrat cluster) : les variables posées sur le Deployment de la
# code-location gRPC (OPENLINEAGE_URL, MLFLOW_TRACKING_URI…) NE se propagent PAS
# aux pods de run du K8sRunLauncher. Sans les réinjecter ICI, l'émission de lineage
# (_emit_lineage no-op si OPENLINEAGE_URL absent) et le logging MLflow (drift/CT)
# tombent en no-op SILENCIEUX dans le run (run SUCCESS mais rien d'émis). On les
# déclare donc au niveau du run via container_config.env. Hosts en forme COURTE
# `<svc>.<ns>` (marquez.marquez, mlflow.mlflow) et NON le FQDN `…svc.cluster.local` :
# en prod, un search domain externe (resolv.conf, ndots:5) fait timeouter la résolution
# du FQDN complet côté pod de run (cf. univ-lehavre/cluster#458). Ces valeurs DOIVENT
# rester identiques à code-location.yaml (sinon Deployment gRPC ≠ pods de run).
_RUN_ENV = [
    {"name": "OPENLINEAGE_URL", "value": "http://marquez.marquez:5000"},
    {"name": "OPENLINEAGE_ENDPOINT", "value": "api/v1/lineage"},
    {"name": "OPENLINEAGE_NAMESPACE", "value": "dagster"},
    {"name": "MLFLOW_TRACKING_URI", "value": "http://mlflow.mlflow:5000"},
]
_RUN_K8S_CONFIG = {
    "dagster-k8s/config": {
        "container_config": {
            "env": _RUN_ENV,
            "env_from": [{"secret_ref": {"name": "citation-s3-access"}}],
        },
    },
}

# Le transform_job inclut index_load (étape 4), qui écrit vers Postgres/CNPG : son pod
# de run a besoin EN PLUS du Secret pg-role-pgvector (POSTGRES_*), au-delà de l'accès S3.
# Le branchement effectif du Secret au pod relève du déployeur (frontière infra) ; le
# dépôt l'EXPOSE ici (env_from) sans le garantir.
_TRANSFORM_K8S_CONFIG = {
    "dagster-k8s/config": {
        "container_config": {
            # Mêmes variables de run que _RUN_K8S_CONFIG (lineage + MLflow, piège
            # ADR 0086) : le drift Evidently et l'instrumentation CT loggent vers
            # MLflow depuis le pod de run de transform_job.
            "env": _RUN_ENV,
            "env_from": [
                {"secret_ref": {"name": "citation-s3-access"}},
                {"secret_ref": {"name": "pg-role-pgvector"}},
            ],
        },
    },
}

ingestion_job = define_asset_job(
    "ingestion_job",
    selection=AssetSelection.assets("raw_snapshot"),
    tags=_RUN_K8S_CONFIG,
)

# Assets dbt + ressource CLI (ou [], {} si dbt indisponible — lint/checkout neuf).
_dbt_assets, _dbt_resources = dbt_components()

# collab_manifest dépend de l'asset dbt marts_collab_pairs (via AssetKey) : il s'exécute
# APRÈS le mart, dans le même run (donc même context.run_id → même préfixe dt=…/run=…).
# Ajouté inconditionnellement : si dbt est indisponible ([],{}), sa dépendance pend sur
# une clé externe non exécutable et la code-location reste chargeable (asset orphelin).
# researcher_embeddings (lot 3) dépend des assets dbt curated_work_topics/keywords
# et curated_authorships (via AssetKey) : il s'exécute APRÈS eux, dans le même run
# (même context.run_id → même préfixe dt=…/run=…). Ajouté inconditionnellement,
# comme collab_manifest : en mode dégradé (dbt indisponible), ses clés sources ne
# sont pas exécutables et il reste un asset orphelin chargeable.
# Les manifests du producteur researchers (lot 4) sont ajoutés inconditionnellement,
# comme collab_manifest : researchers_manifest dépend du mart dbt marts_researchers ;
# researcher_vectors_manifest et work_vectors_manifest dépendent de l'asset Python
# researcher_embeddings (toujours présent). En mode dégradé (dbt absent), les manifests
# dont la dépendance est une clé dbt pendent sur une clé externe non exécutable et la
# code-location reste chargeable (assets orphelins).
# index_load (étape 4) charge l'index Postgres depuis les marts servis researchers_fts
# + researcher_vectors (via leurs manifests). Ajouté inconditionnellement comme les
# manifests : ses dépendances (clés de manifests, eux-mêmes adossés à dbt) pendent en
# mode dégradé et la code-location reste chargeable (asset orphelin).
_assets = [
    raw_snapshot,
    collab_manifest,
    researcher_embeddings,
    researchers_manifest,
    researchers_fts_manifest,
    researcher_vectors_manifest,
    work_vectors_manifest,
    index_load,
    *_dbt_assets,
]
_jobs = [ingestion_job]

# Asset checks Great Expectations bloquants (étape 3.5a). Le check du brut s'applique
# à raw_snapshot (toujours présent) ; ceux des couches dbt (curated_edges,
# marts_collab_pairs) ne sont enregistrés QUE si les assets dbt existent — sinon leur
# clé cible n'est pas résolue en mode dégradé (dbt indisponible : lint/checkout neuf).
# ge_researcher_vectors cible l'asset PYTHON researcher_embeddings (toujours enregistré)
# → INCONDITIONNEL (ne pas copier le pattern conditionnel-dbt, sinon le check du vecteur
# disparaîtrait en mode dégradé). ge_marts_researchers cible la clé dbt marts_researchers
# → conditionnel comme les autres checks dbt.
# ge_index_load cible l'asset Python index_load (toujours enregistré) → inconditionnel
# (comme ge_researcher_vectors). Il vérifie count(researchers en base) == row_count
# attendu du manifest FTS pour la partition chargée.
# evidently_embedding_drift cible l'asset PYTHON researcher_embeddings (toujours
# enregistré) → INCONDITIONNEL comme ge_researcher_vectors. NON bloquant : il mesure le
# drift N vs N-1 (informatif, loggué MLflow), ne casse pas le run (cf. assets/drift.py).
_asset_checks = [ge_raw_contract, ge_researcher_vectors, ge_index_load, evidently_embedding_drift]
if _dbt_assets:
    _asset_checks += [ge_curated_edges, ge_marts_collab, ge_marts_researchers]

# Le job de transformation n'est enregistré QUE si les assets dbt existent : un
# job dont la sélection ne résout aucun asset ferait échouer la construction des
# Definitions. En prod le manifest est packagé → les assets dbt sont présents. Le job
# enchaîne le mart dbt PUIS l'écriture du manifest (collab_manifest) dans un seul run.
if _dbt_assets:
    transform_job = define_asset_job(
        "transform_job",
        selection=(
            AssetSelection.assets(*_dbt_assets)
            | AssetSelection.assets("collab_manifest")
            | AssetSelection.assets("researcher_embeddings")
            | AssetSelection.assets("researchers_manifest")
            | AssetSelection.assets("researchers_fts_manifest")
            | AssetSelection.assets("researcher_vectors_manifest")
            | AssetSelection.assets("work_vectors_manifest")
            | AssetSelection.assets("index_load")
        ),
        # index_load écrit vers Postgres → ce job a besoin du Secret pg-role-pgvector.
        tags=_TRANSFORM_K8S_CONFIG,
    )
    _jobs.append(transform_job)

# ENTRAÎNEMENT CONTINU (CT, MLOps 1→2) : le transform_job (dbt → embeddings → index)
# se rejoue automatiquement, plus de re-trigger 100 % manuel. Cadence par défaut
# QUOTIDIENNE (02:00 UTC, heure creuse) ; statut STOPPED par défaut — l'opérateur
# l'arme dans l'UI Dagster (pas de re-training silencieux non voulu). Le drift mesuré
# par evidently_embedding_drift nourrit la décision d'ajuster cette cadence. Enregistré
# UNIQUEMENT si transform_job existe (assets dbt présents), comme le job lui-même.
_schedules = []
if _dbt_assets:
    transform_daily = ScheduleDefinition(
        name="transform_daily",
        job=transform_job,
        cron_schedule="0 2 * * *",
        execution_timezone="UTC",
        description="Entraînement continu : rejoue transform_job (dbt → embeddings → index).",
    )
    _schedules.append(transform_daily)

defs = Definitions(
    assets=_assets,
    asset_checks=_asset_checks,
    jobs=_jobs,
    schedules=_schedules,
    resources=_dbt_resources,
)
