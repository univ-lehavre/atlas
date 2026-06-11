# citation-dagster

## À quoi sert ce dossier ?

C'est le **pipeline de données** qui alimente la recommandation de collaborations
entre chercheurs. Il **ingère** le snapshot public [OpenAlex](https://openalex.org)
(articles et auteurs, avec leurs citations), puis le **transforme** en jeux de données
exploitables (qui cite qui, quelles paires de chercheurs se citent), stockés en Parquet
sur le stockage objet S3 du cluster. En aval, ces données nourrissent l'index de
recherche et l'API (hors de ce dossier). Le plan d'ensemble est décrit dans
[le plan « pipeline de collaborations »](https://univ-lehavre.github.io/atlas/plans/2026-06-02-pipeline-collaborations/).

## Qu'est-ce qu'une « code-location Dagster » ?

Le pipeline est orchestré par [Dagster](https://dagster.io/) — l'outil qui planifie et
exécute les étapes (« quand lancer la synchro ? », « quelle étape dépend de quelle
autre ? »). Dagster est découpé en deux :

- **l'orchestrateur** (webserver, planificateur, lanceur de jobs) tourne **dans le
  cluster** et est fourni par le dépôt `cluster` ([ADR cluster 0026](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0026-orchestration-dagster.md)).
  Il est livré **vide** : il ne connaît aucun pipeline a priori.
- **la code-location** (ce dossier) est **notre code métier** : la liste des étapes du
  pipeline (les *assets*) et leur logique. Empaquetée en image, elle expose un serveur
  gRPC que l'orchestrateur **découvre** et appelle pour exécuter nos étapes.

Autrement dit : l'orchestrateur est le moteur (générique, côté cluster), cette
code-location est ce qu'on lui donne à exécuter (spécifique au pipeline de citations).
Le code DataOps est en **Python natif** parce que Dagster et dbt l'imposent — c'est la
[catégorie `dataops/`](https://univ-lehavre.github.io/atlas/decisions/0055-categorie-dataops-python/)
([ADR 0055](https://univ-lehavre.github.io/atlas/decisions/0055-categorie-dataops-python/)),
tenue à la même exigence de qualité que le reste du dépôt (lint, tests, couverture).

### Repères

| Sujet | Référence |
| --- | --- |
| Architecture du pipeline & contrat de données | [ADR 0029](https://univ-lehavre.github.io/atlas/decisions/0029-architecture-pipeline-collaborations/) |
| Ingestion par snapshot S3 (works + authors) | [ADR 0054](https://univ-lehavre.github.io/atlas/decisions/0054-ingestion-massive-snapshot-s3/) |
| DataOps en Python (Dagster/dbt) | [ADR 0055](https://univ-lehavre.github.io/atlas/decisions/0055-categorie-dataops-python/) |
| Tests hermétiques & reproductibilité | [ADR 0057](https://univ-lehavre.github.io/atlas/decisions/0057-reproductibilite-tests-hermetiques/) |
| Projet de transformation dbt | [`../citation-dbt/`](../citation-dbt/) |

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
- **modèles dbt** (`citation_dbt_models`) — couches `staging` → `curated` du projet
  dbt frère [`../citation-dbt/`](../citation-dbt/), exposées via `dagster-dbt`. Le job
  `transform_job` les exécute (`dbt build`) ; le manifest est packagé dans l'image
  (`dbt parse` au build). Voir [`src/citation_dagster/dbt.py`](src/citation_dagster/dbt.py).

## Image et déploiement

L'image (serveur gRPC) se construit en **arm64** pour le banc Lima. Le **contexte de
build est `dataops/`** (et non `dataops/citation-dagster/`) : l'image embarque la
code-location **et** le projet dbt frère `citation-dbt/`, requis par les assets dbt
(étape 3.2). D'où le `-f` explicite (et le `dataops/.dockerignore` qui borne le
contexte) :

```bash
docker buildx build --platform linux/arm64 \
  -f dataops/citation-dagster/Dockerfile \
  -t registry:80/citation-dagster:dev --push dataops/
```

> Exception locale assumée : contrairement aux apps/services TS (contexte = racine du
> monorepo), cette code-location Python n'a pas besoin du lockfile pnpm ; son contexte
> est `dataops/`. Le `dbt parse` du build est hermétique (aucune I/O réseau).

Les manifestes de déploiement (Deployment + Service gRPC, `ObjectBucketClaim`, patch
du workspace Dagster, `Application` Argo CD) vivent dans [`deploy/`](deploy/) et sont
réconciliés par Argo CD depuis Gitea — jamais de `kubectl apply` manuel
([ADR cluster 0046](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0046-corriger-le-code-pas-l-etat.md)).
