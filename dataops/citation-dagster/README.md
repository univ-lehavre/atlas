# citation-dagster

Code-location [Dagster](https://dagster.io/) du pipeline de citations : le module
Python que l'orchestrateur Dagster du cluster découvre et exécute. Il expose les
assets DataOps (à commencer par l'ingestion du snapshot OpenAlex). Cadre décisionnel :
[ADR 0055](https://univ-lehavre.github.io/atlas/decisions/0055-categorie-dataops-python/).

## Développement local

Outillage : [uv](https://docs.astral.sh/uv/) (dépendances), ruff (lint/format),
pytest (tests).

```bash
uv sync                       # installe les dépendances (dagster==1.13.7, …)
uv run ruff check             # lint
uv run ruff format            # formatage
uv run pytest                 # tests unitaires (rclone mocké)
uv run dagster definitions validate -m citation_dagster.definitions   # valide la code-location
```

## Assets

- **`raw_snapshot`** — synchronise un sous-ensemble **borné** (`sample_size` fichiers
  `.gz` par entité) du snapshot public OpenAlex (`works`, `authors`) vers le lakehouse
  interne (`raw/<entity>/` sur le RGW Ceph), via `rclone`. Émet un événement
  OpenLineage vers Marquez. Le binaire `rclone` est requis à l'exécution (fourni par
  l'image).

## Image et déploiement

L'image (serveur gRPC) se construit en **arm64** pour le banc Lima :

```bash
docker buildx build --platform linux/arm64 \
  -t registry:80/citation-dagster:dev --push dataops/citation-dagster/
```

Les manifestes de déploiement (Deployment + Service gRPC, `ObjectBucketClaim`, patch
du workspace Dagster, `Application` Argo CD) vivent dans [`deploy/`](deploy/) et sont
réconciliés par Argo CD depuis Gitea — jamais de `kubectl apply` manuel
([ADR cluster 0046](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0046-corriger-le-code-pas-l-etat.md)).
