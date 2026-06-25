---
title: "0058 — Chargement de l'index (mart→Postgres) : report de l'asset index_load faute de producteur researchers"
---

> **Report levé par [0059](/atlas/decisions/0059-mart-researchers-author-id-grain/).**
> Les deux préconditions de ce report sont désormais satisfaites : le mart
> producteur `researchers` (ancré sur `author_id`) est livré, et l'asset Dagster
> `index_load` est **réactivé et implémenté**
> (`dataops/citation-dagster/src/citation_dagster/assets/index_load.py`). Le
> schéma d'index réellement consommé a aussi évolué (une table `researchers`
> avec `fts tsvector` déjà matérialisé, sans table `pairs` —
> `dataops/citation-dagster/deploy/migrations/0001_researchers_index.sql`). Le
> contexte ci-dessous décrit l'état au moment du report.

## Contexte

La [Phase 4](/atlas/plans/2026-06-02-pipeline-collaborations/) indexe le mart dans
PostgreSQL/pgvector pour l'exploration et la recherche. Les briques sont posées et
**prouvées par exécution** contre un PostgreSQL+pgvector réel (épinglé par digest,
[ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)) :

- **4.1** — schéma d'index : tables `pairs` (paires + `cross_citations`) et `researchers`
  (`embedding vector(384)` + index HNSW cosinus), migrations versionnées
  (`packages/citation/migrations/`), client `postgres` enveloppé en Effect ;
- **4.2** — chargement FTS lexical (`fts tsvector` + index GIN) par chercheur ;
- **4.3** — chargement des vecteurs + recherche kNN.

L'**étape 4.4** devait orchestrer ces chargements comme un **asset Dagster `index_load`**
en aval du mart, avec validation du contrat, asset check de cohérence et lineage
prolongé jusqu'à l'index. En la concevant, un **gap structurel** s'est révélé — le même
que celui que [4.1](/atlas/decisions/0029-architecture-pipeline-collaborations/) avait
déjà acté pour `works`/`authorships` : **la capacité est livrée, le producteur ne l'est
pas**.

### Le gap : capacité vs producteur

| Table de l'index  | Source produite dans le pipeline ?                                                                                                                                                                                                                                 | Chargeable par `index_load` aujourd'hui ? |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| **`pairs`**       | **Oui** — le mart servi `marts/collab/` (modèle dbt `marts_collab_pairs`), contractualisé par `manifest.json` ([ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/))                                                                            | **Oui**                                   |
| **`researchers`** | **Non** — la source (embeddings `vector(384)` + labels topics/mots-clés par chercheur) vient de `researcher-profiles`, un **artefact en mémoire** d'un CLI. **Aucun mart servi, aucun `manifest.json`, aucune étape Dagster/dbt n'émet de données par chercheur.** | **Non**                                   |

Autrement dit, les loaders TypeScript de 4.2/4.3 et le schéma de 4.1 existent et
fonctionnent, mais leur **entrée** — un jeu de données _par chercheur_, servi et
contractualisé — **n'est produite nulle part** dans le pipeline qui tourne. `index_load`
ne pourrait donc charger aujourd'hui que `pairs`.

### Architecture validée pour le futur `index_load`

La conception (vérifiée end-to-end avant ce report) reste acquise et guidera
l'implémentation une fois le producteur disponible :

- **Python-natif, zéro dépendance neuve.** L'asset charge depuis le mart servi via
  l'**extension `postgres` de DuckDB** (déjà présent) : `lakehouse.connect()` lit le
  Parquet validé, puis `ATTACH … (TYPE postgres)` + `INSERT … SELECT … FROM
read_parquet(…)` écrit dans Postgres. **Pas de Node** dans l'image `python:3.10-slim`,
  **pas de driver pg** (psycopg2 est écarté pour sa licence LGPL, [ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)).
  L'extension est **chargeable hors-ligne** (cuite au build).
- **Idempotence par partition** : `BEGIN; DELETE … WHERE dt=? AND run=?; INSERT …;
COMMIT` (remplacement, pas d'`ON CONFLICT` — un rechargement plus court ne laisse
  aucune ligne périmée). La clé primaire Postgres `(author_a, author_b, dt, run)` est
  honorée à travers DuckDB.
- **Validation du contrat en Python avant chargement** : le validateur de 3.6 est en
  TypeScript, inatteignable depuis l'image Python. On re-vérifie en Python les trois
  faits du contrat (`schema_version` connue, `row_count`, `sha256` des parts) avec les
  helpers de `manifest.py`.
- **Asset check bloquant** : `count(*)` Postgres `pairs` == `row_count` du manifest
  (fidèle car le chargement est 1:1) ; `context.run.run_id` (le contexte d'un asset
  check n'expose pas `run_id`).
- **Lineage** : un dataset `citation:index/pairs` en sortie, avec le mart servi en
  entrée — la chaîne `marts/collab → index_load → index/pairs` apparaît connectée dans
  Marquez.
- **Précondition de déploiement** : l'asset **ne crée jamais le schéma** (ce serait
  dupliquer la source de vérité TS de `vector(384)`/HNSW et risquer une dérive). Les
  migrations (`packages/citation/migrations/`) sont **appliquées au déploiement** ;
  l'asset échoue clairement si la table n'existe pas. Le **Secret `pg-role-pgvector`**
  est injecté au run de transformation (en plus de `citation-s3-access`).

## Décision

> **L'asset `index_load` (étape 4.4) est REPORTÉ.** Il ne sera implémenté qu'une fois
> qu'un **producteur de données par chercheur servi et contractualisé** existera (un mart
> `researchers` : `vector(384)` + labels topics/mots-clés + `manifest.json`). Tant que ce
> producteur manque, on **ne livre pas** un `index_load` partiel (`pairs` seul, sans
> recherche FTS/kNN sur les chercheurs).

Raisons :

- **Refus d'une demi-fonctionnalité.** Un `index_load` _pairs only_ chargerait les
  compteurs de collaboration mais **aucune capacité de recherche** (FTS lexicale, kNN
  sémantique), qui portent sur l'entité **chercheur**. La valeur d'exploration de la
  Phase 4 — celle que consomme `atlas-api` (Phase 5) — vient des `researchers`. Livrer la
  moitié `pairs` sans la recherche n'apporte pas l'exploration attendue et figerait un
  asset à ré-ouvrir dès le producteur disponible.
- **Cohérence avec le précédent.** [4.1](/atlas/decisions/0029-architecture-pipeline-collaborations/)
  a délibérément différé `works`/`authorships` (mêmes raisons : pas de mart servi). Le
  même critère — _« on indexe l'entité qui a une vraie source produite »_ — conduit ici à
  différer l'orchestration tant que `researchers` n'a pas de producteur.
- **Le vrai débloqueur est en amont.** Le chemin critique n'est pas l'asset `index_load`
  (conçu, vérifié) mais le **producteur researchers**, de taille Phase 3 (nouveau
  modèle/asset + contrat). Il débloque conjointement : `index_load` complet, la recherche
  FTS/kNN, et la **purge de l'index sous opposition** ([3.7](/atlas/architecture/re-derivabilite-mart-index/)).

## Statut

Accepted (2026-06-11). Reporte l'étape 4.4 du plan
[pipeline-collaborations](/atlas/plans/2026-06-02-pipeline-collaborations/) sans la
contredire : la **capacité** (schéma 4.1, loaders 4.2/4.3) reste livrée et prouvée ; seule
l'**orchestration** `index_load` attend son producteur. Ne remet en cause aucun ADR.

## Conséquences

**Bénéfices.** On évite de figer une demi-fonctionnalité (un asset à ré-ouvrir) et de
polluer le lineage/les asset checks avec une table `researchers` vide. L'architecture
`index_load` est **capturée et validée** : son implémentation, une fois le producteur là,
sera mécanique (chemin DuckDB-ATTACH éprouvé, idempotence et validation déjà spécifiées).
Le périmètre réellement chargeable (`pairs`) reste indexable dès que le producteur élargit
le besoin.

**Prix à payer.** L'index Postgres reste **non alimenté par le pipeline** entre-temps : la
recherche (Phase 5) n'a pas encore de données à interroger. Un consommateur pressé de
`pairs` seul devra attendre `index_load`. Le report **déplace** le travail vers le
producteur researchers (chantier Phase 3) plutôt que de le supprimer.

**Garde-fous.**

- L'asset `index_load` n'est **pas** implémenté tant que le producteur researchers servi
  (mart + `manifest.json`) n'existe pas ; aucune table de l'index n'est chargée à vide.
- Quand il le sera : **python-natif** (DuckDB ATTACH, pas de Node ni de driver pg),
  **idempotent par partition** (DELETE+INSERT), **validation du contrat en Python avant
  chargement**, **asset check** `count == row_count`, **lineage** prolongé jusqu'à
  `citation:index/*`.
- L'asset **ne crée jamais le schéma** : les migrations sont **appliquées au déploiement**
  (le dépôt **permet** le chargement ; **appliquer** les migrations et **brancher** le
  Secret Postgres relève du déployeur).
- Le producteur researchers, et avec lui `index_load` et la purge d'opposition
  ([3.7](/atlas/architecture/re-derivabilite-mart-index/)), restent **bloqués** sur la
  clé chercheur (cf. la dette structurante de l'étape 0,
  [§1.4 de la ré-dérivabilité](/atlas/architecture/re-derivabilite-mart-index/)).
