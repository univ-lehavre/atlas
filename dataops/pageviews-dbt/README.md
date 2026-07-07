# pageviews-dbt — transformations dbt de la prévision des vues

Projet [dbt](https://www.getdbt.com/) (sur DuckDB) des transformations SQL de la source
« pageviews » ([ADR 0097](https://univ-lehavre.github.io/atlas/decisions/0097-prevision-vues-pageviews/)).
Orchestré par `pageviews-dagster` via `dagster-dbt`. La frontière entre les deux : dbt
**décrit** les transformations, Dagster les **exécute** et émet le lineage.

Projet **frère** de `mediawatch-dbt` et `citation-dbt`, sur le même patron
(staging vues `:memory:` → couches externalisées en Parquet immuable). La différence de
fond : la série est **mensuelle** (grain `(university_id, month, views)`), curseur au
**mois** (`YYYY-MM`), pas au jour.

> **État.** Ce projet dbt est encore un **squelette** (arborescence `models/`, `seeds/`,
> `macros/`, `tests/` présente, modèles à venir dans une PR ultérieure). Le
> `pageviews-dagster` sait déjà l'orchestrer et dégrade proprement tant qu'il est vide
> (`dbt_components() → ([], {})`). La validation end-to-end (transform réelle → mart +
> manifest) est planifiée en **Phase 5, issue #564**.

## Couches (cible)

- **staging** (`models/staging/`) — vues de session `:memory:`, typage et normalisation :
  - `stg_pageviews` : série mensuelle des vues normalisée, `month` en curseur `YYYY-MM`,
    grain `(university_id, month, views)` ;
  - `stg_ref_universities` : le référentiel d'établissements normalisé (résolution
    Wikidata/OpenAlex → `(university_id, lang, title)`).
- **curated** (`models/curated/`) — Parquet external immuable `dt=…/run=…/` : série
  mensuelle consolidée par établissement (déduplication titre + redirections, comblement
  des mois manquants).
- **marts** (`models/marts/`) — Parquet external « servi » :
  - `views_timeline` : la série temporelle mensuelle `(university_id, month, views)` — **entrée
    du modèle** de prévision (asset `forecast_views` côté Dagster) ;
  - `views_forecast` : le mart des prévisions servies `(university_id, horizon_label,
    window_start, window_end, views_pred, served_mode)`, avec son `manifest.json` (contrat
    Parquet servi, [ADR 0029](https://univ-lehavre.github.io/atlas/decisions/0029-contrat-transfert-manifest/)).

Le grain servi des prévisions est `(university_id, horizon_label)` avec `horizon_label` ∈
**`{month_1, month_3, year_1}`** — les horizons métier 1 / 3 / 12 mois (équivalents
mensuels de « 1 semaine / 1 mois / 1 an » sur une série mensuelle).

## Variables de run (injectées par Dagster)

Dagster passe les variables au run (`dbt build --vars …`) ; les défauts sont **inertes**
(ils permettent `dbt parse` et le dev local sans Dagster) :

- `curated_dt` — période de la partition curated (**`YYYY-MM`**, mensuelle), remplacée
  au run ;
- `curated_run` — identifiant de run **IMMUABLE** (rejeu = nouveau `run=<id>`, depuis
  `context.run_id`) : garantit qu'un rejeu n'écrase jamais en place (ADR 0054/0057) ;
- `raw_root` / `marts_root` / `ref_root` — racines lakehouse (`s3://<bucket>/…`),
  surchargées en test vers le bucket du banc.

## Conventions

- **Série mensuelle, saisonnalité annuelle.** Le curseur est le **mois** (`YYYY-MM`), pas
  un jour ; la consolidation comble les mois manquants (indispensable au modèle aval, dont
  les lags à 12 mois captent la saisonnalité annuelle).
- **Déterminisme / hermétisme** ([ADR 0057](https://univ-lehavre.github.io/atlas/decisions/0057-determinisme-reproductibilite/)) :
  pas de télémétrie réseau ni d'identifiant machine généré
  (`send_anonymous_usage_stats: false`) ; staging en vues `:memory:` (aucun artefact S3
  intermédiaire) ; seul curated/marts est externalisé (contrat de sortie). Les tests sont
  **hermétiques** (seeds versionnés, aucune I/O réseau).
- **Immutabilité `dt=`/`run=`** ([ADR 0054](https://univ-lehavre.github.io/atlas/decisions/0054-immutabilite-partitions/)) :
  chaque partition curated/marts est immuable ; un rejeu est un nouveau `run=<id>`.
- **Nommage neutre** ([ADR 0035](https://univ-lehavre.github.io/atlas/decisions/0035-depot-generaliste-ouvert/)) :
  aucun identifiant (modèle, colonne, bucket, seed) ne porte « wikipedia », « wikimedia »
  ni « openalex » — ce sont les **sources**. Le domaine donne le nom générique
  **`pageviews`** ; les marques n'apparaissent qu'en prose.

## Contrat cluster (ADR 0033)

Le backend S3 est configuré dans `profiles.yml` (DuckDB httpfs + secret **path-style**
depuis l'environnement). Le bucket, l'endpoint et les identifiants proviennent tous du
**contrat d'interface cluster→atlas**
([ADR 0033](https://univ-lehavre.github.io/atlas/decisions/0033-contrat-interface-cluster/),
[ADR 0043](https://univ-lehavre.github.io/atlas/decisions/0043-provisionnement-bucket-obc/)) :
bucket via `ObjectBucketClaim` (`BUCKET_NAME`, jamais codé en dur), endpoints path-style
(`BUCKET_HOST`/`BUCKET_PORT`), secrets `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` de
l'OBC — mêmes noms que citation/mediawatch, contrat banc ↔ prod identique.
