# Migrations du schéma d'index (Postgres/pgvector)

Migrations SQL **versionnées** du schéma de l'index recherche par chercheur,
appliquées **au déploiement** contre la base `pgvector` du cluster (rôle
`pgvector`). Elles fournissent le schéma que l'asset Dagster
[`index_load`](../../src/citation_dagster/assets/index_load.py) **consomme** :
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

Le branchement effectif (job d'init, hook Argo CD, etc.) relève du **déployeur**
(frontière infra, ADR cluster 0022/0046) : le dépôt fournit le SQL, pas le
mécanisme d'exécution.
