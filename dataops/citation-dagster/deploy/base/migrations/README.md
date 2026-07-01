# Migrations du schéma d'index (Postgres/pgvector)

Migrations SQL **versionnées** du schéma de l'index recherche par chercheur,
appliquées **au déploiement** contre la base `pgvector` du cluster (rôle
`pgvector`). Elles fournissent le schéma que l'asset Dagster
[`index_load`](../../../src/citation_dagster/assets/index_load.py) **consomme** :
l'asset y charge la donnée mais **ne crée pas** le schéma (frontière
capacité/décision, cf. son docstring et
[ADR 0058 §4.1](https://univ-lehavre.github.io/atlas/decisions/0058-report-index-load/)
« migrations versionnées »).

## Fichiers

| Migration                      | Objet                                                            |
| ------------------------------ | --------------------------------------------------------------- |
| `0001_researchers_index.sql`   | Table `researchers` (`vector(384)` HNSW cosinus + `fts` GIN).    |

## Application

Idempotentes (`IF NOT EXISTS`) — rejouables sans effet de bord. À appliquer dans
l'ordre lexicographique contre la base `pgvector`, p. ex. :

```bash
# Depuis un pod ayant accès au primary CNPG (psql), base pgvector :
psql -d pgvector -f 0001_researchers_index.sql
```

## Branchement effectif — hook PreSync Argo CD

Le mécanisme d'exécution est fourni par
[`../migration-job.yaml`](../migration-job.yaml) : un **Job en hook `PreSync`
Argo CD** qui applique ces migrations (via `psql`, image épinglée) contre la base
`pgvector` **avant** que la code-location démarre. Le `.sql` est embarqué en
ConfigMap par le `configMapGenerator` de
[`../kustomization.yaml`](../kustomization.yaml).

C'est l'implémentation de la frontière
[ADR cluster 0094 §5](https://univ-lehavre.github.io/cluster/decisions/0094-frontiere-deploiement-applicatif/)
: **atlas FOURNIT** le `.sql` et le Job (schéma métier + manifeste) ; **cluster
ORCHESTRE** (l'`Application` réconcilie l'overlay et déclenche le hook). La
preuve de bout en bout (le hook s'exécute avant les workloads, tables + index
créés, rejeu `changed=0`) reste **à valider au banc**.
