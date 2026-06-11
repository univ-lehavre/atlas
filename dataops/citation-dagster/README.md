# citation-dagster

## À quoi sert ce dossier ?

C'est le **pipeline de données** qui alimente la recommandation de collaborations
entre chercheurs. Il **ingère** le snapshot public [OpenAlex](https://openalex.org)
(articles et auteurs, avec leurs citations), puis le **transforme** en jeux de données
exploitables (qui cite qui, quelles paires de chercheurs se citent), stockés en fichiers
**Parquet** sur le stockage objet S3 du cluster. En aval, ces données nourrissent l'index
de recherche et l'API (hors de ce dossier). Le plan d'ensemble est décrit dans
[le plan « pipeline de collaborations »](https://univ-lehavre.github.io/atlas/plans/2026-06-02-pipeline-collaborations/).

> **Parquet** désigne ici le **format de fichier** [Apache Parquet](https://parquet.apache.org/) :
> un format **colonne** pour données tabulaires, compact et rapide à lire par tranches de
> colonnes — l'unité d'échange du pipeline (un « fichier Parquet » = une table sérialisée
> sur S3). Dans ce dépôt, « Parquet » ne désigne **jamais** autre chose que ce format.

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

## Contenu du dossier

Le code Python vit sous [`src/citation_dagster/`](src/citation_dagster/). Objectif :
définir les **assets** du pipeline et leur câblage à Dagster. Où en est-on : l'**ingestion**
(étape 2), l'**accès lakehouse + transformation dbt** (étapes 3.1/3.2), la **feature
citations croisées** (étape 3.3), le **mart servi + manifest atomique** (étape 3.4) et la
**qualité Great Expectations** (étape 3.5a) sont en place ; le lineage (3.5b) viendra s'ajouter.

| Module | Rôle | Étape |
| --- | --- | --- |
| [`definitions.py`](src/citation_dagster/definitions.py) | Point d'entrée : enregistre les assets, asset checks + jobs que l'orchestrateur découvre. | — |
| [`assets/raw_snapshot.py`](src/citation_dagster/assets/raw_snapshot.py) | Asset d'**ingestion** : sync borné du snapshot OpenAlex (`works`/`authors`) vers `raw/` via `rclone`. | 2 |
| [`watermark.py`](src/citation_dagster/watermark.py) | Watermark de date persistant pour l'ingestion **incrémentale** (ne resynchronise que le nouveau). | 2 |
| [`resources.py`](src/citation_dagster/resources.py) | Config des accès stockage objet (remotes `rclone`, config S3 DuckDB) depuis l'environnement — jamais de secret en dur. | 2/3 |
| [`lakehouse.py`](src/citation_dagster/lakehouse.py) | Accès lakehouse **DuckDB↔S3** : lit le brut JSONL.gz, écrit du Parquet. Backend que dbt consomme. | 3.1 |
| [`dbt.py`](src/citation_dagster/dbt.py) | **Intégration dbt↔Dagster** : expose les modèles dbt (`staging`→`curated`→`marts`) comme assets ; gère le manifest dbt. | 3.2/3.3 |
| [`assets/manifest.py`](src/citation_dagster/assets/manifest.py) | Asset `collab_manifest` : écrit **en dernier** le `manifest.json` atomique du mart servi (sha256/row_count par part) — le **contrat de transfert**. | 3.4 |
| [`ge_suites.py`](src/citation_dagster/ge_suites.py) | Suites **Great Expectations** (pures) + validation in-process (contexte éphémère, hermétique). | 3.5a |
| [`assets/quality.py`](src/citation_dagster/assets/quality.py) | **Asset checks bloquants** : portes de qualité GE sur `raw`/`curated`/`marts` (un échec coupe l'aval). | 3.5a |

Les **modèles de transformation SQL** ne sont pas ici mais dans le projet dbt frère
[`../citation-dbt/`](../citation-dbt/) (voir son README).

> **Qualité (étape 3.5a).** Trois *asset checks* Dagster **bloquants** valident la donnée
> via Great Expectations, **en complément** des tests dbt : structure/format du brut (qui
> n'a aucun test dbt), format des ids et absence d'auto-citation sur `curated`, contrat de
> colonnes et bornes sur le mart servi. Un échec d'attente fait échouer le run et empêche
> l'aval (p. ex. l'écriture du manifest). GE valide en mémoire un `DataFrame` pandas chargé
> par DuckDB — hors cluster, hermétique. (GE alourdit l'image d'environ 200 Mo :
> numpy/scipy/pandas/cryptography.)

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

## Assets : les étapes du pipeline, et ce qu'elles produisent

Dans Dagster, un **asset** est un objet de données **produit** par une étape (un fichier,
une table, une partition Parquet) — pas seulement une tâche, mais le **résultat** qu'elle
matérialise. Décrire le pipeline comme une liste d'assets, c'est décrire **ce qui est
produit et ce qui dépend de quoi** ; Dagster en déduit l'ordre d'exécution et trace le
lignage. Nos assets, du brut vers le raffiné :

- **`raw_snapshot`** — **produit** le brut : synchronise un sous-ensemble **borné**
  (`sample_size` fichiers `.gz` par entité) du snapshot public OpenAlex (`works`,
  `authors`) vers le lakehouse interne (`raw/<entity>/` sur le S3 du cluster), via
  `rclone`. C'est la matière première de tout le reste. Émet un événement OpenLineage
  vers Marquez (traçabilité). Le binaire `rclone` est fourni par l'image.
- **modèles dbt** (`citation_dbt_models`) — **produisent** le raffiné : les couches
  `staging` → `curated` → `marts` du projet dbt frère [`../citation-dbt/`](../citation-dbt/)
  transforment le brut en Parquet propre sur S3 (le graphe de citations `curated_edges`,
  puis le signal `marts_collab_pairs` = citations croisées par paire de chercheurs).
  Exposées comme assets via `dagster-dbt` ; le job `transform_job` les exécute
  (`dbt build`). Voir [`src/citation_dagster/dbt.py`](src/citation_dagster/dbt.py).

**À quoi servent ces produits ensuite ?** Le Parquet `curated` (puis le `mart` des étapes
suivantes) est le **contrat de sortie** du pipeline. En aval — **hors de ce dossier** — il
alimente l'index de recherche PostgreSQL/pgvector et l'API qui sert la recommandation de
collaborations (cf. [le plan](https://univ-lehavre.github.io/atlas/plans/2026-06-02-pipeline-collaborations/)
et [ADR 0029](https://univ-lehavre.github.io/atlas/decisions/0029-architecture-pipeline-collaborations/)).
Ce dossier **produit la donnée** ; il ne sert pas l'utilisateur final directement.

## Image et déploiement : comment ce code arrive dans le cluster

Cette code-location n'est pas un programme qu'on lance à la main : elle doit **tourner en
permanence dans le cluster** pour que l'orchestrateur Dagster puisse l'appeler. Le
**produit livrable** est donc une **image conteneur** (un serveur gRPC), qu'Argo CD
déploie et maintient en service. D'où deux étapes : **construire l'image**, puis la
**déployer en GitOps**.

**Construire l'image.** Elle se construit en **arm64** pour le banc Lima. Le **contexte de
build est `dataops/`** (et non `dataops/citation-dagster/`) : l'image embarque la
code-location **et** le projet dbt frère `citation-dbt/`, requis par les assets dbt. D'où
le `-f` explicite (et le `dataops/.dockerignore` qui borne le contexte) :

```bash
docker buildx build --platform linux/arm64 \
  -f dataops/citation-dagster/Dockerfile \
  -t registry:80/citation-dagster:dev --push dataops/
```

> Exception locale assumée : contrairement aux apps/services TS (contexte = racine du
> monorepo), cette code-location Python n'a pas besoin du lockfile pnpm ; son contexte
> est `dataops/`. Le `dbt parse` du build est hermétique (aucune I/O réseau).

**Déployer.** L'orchestrateur (côté cluster) **découvre** cette image via son workspace et
la tient en service ; c'est elle qui exécute nos assets lors des runs. Les manifestes de
déploiement (Deployment + Service gRPC, `ObjectBucketClaim` pour l'accès S3, patch du
workspace Dagster, `Application` Argo CD) vivent dans [`deploy/`](deploy/) et sont
réconciliés par Argo CD depuis Gitea — jamais de `kubectl apply` manuel
([ADR cluster 0046](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0046-corriger-le-code-pas-l-etat.md)).
