# dataops/ — code DataOps en Python

Cette catégorie héberge le code **DataOps** du dépôt : l'application au traitement
de données des pratiques d'automatisation et de qualité du DevOps. Concrètement, les
assets [Dagster](https://dagster.io/) (orchestrateur de pipelines de données), les
modèles [dbt](https://www.getdbt.com/) (transformation SQL versionnée) et le code de
synchronisation de données.

À la différence du reste du dépôt — TypeScript/Node — `dataops/` est en **Python
natif** : Dagster et dbt sont des outils Python sans équivalent TypeScript. Ce choix,
son périmètre et ses garde-fous sont actés par
l'[ADR 0055](https://univ-lehavre.github.io/atlas/decisions/0055-categorie-dataops-python/).

## Particularités

- **Outillage Python** : [uv](https://docs.astral.sh/uv/) (environnement et
  dépendances), [ruff](https://docs.astral.sh/ruff/) (lint et format),
  [pytest](https://pytest.org/) (tests). Le `uv.lock` de chaque sous-projet est
  versionné.
- **Hors du graphe pnpm** : `dataops/` n'est pas un _workspace_ pnpm. Les outils Node
  (pnpm, turbo, knip, `audit:structure`) l'ignorent ; sa discipline relève de ruff et
  pytest.
- **Frontière par le contrat** : aucun import croisé avec le code TypeScript. La seule
  interface avec le reste du dépôt est le contrat Parquet + `manifest.json` sur le
  stockage objet.

## Sous-projets

- [`citation-dagster/`](citation-dagster/) — la **code-location Dagster** du pipeline de
  citations : les assets (ingestion du snapshot OpenAlex, orchestration des
  transformations dbt, matérialisation du mart) et leur déploiement.
- [`citation-dbt/`](citation-dbt/) — le **projet dbt** (sur DuckDB) des transformations
  SQL : couches `staging` → `curated` → `marts`. Orchestré par `citation-dagster` via
  `dagster-dbt`. La frontière entre les deux : dbt **décrit** les transformations,
  Dagster les **exécute** et émet le lineage.
