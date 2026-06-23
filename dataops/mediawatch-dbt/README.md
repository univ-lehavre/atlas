# mediawatch-dbt — transformations dbt de la veille médiatique

Projet [dbt](https://www.getdbt.com/) (sur DuckDB) des transformations SQL de la
collecte « mediawatch » (ADR 0064). Orchestré par `mediawatch-dagster` via
`dagster-dbt`. La frontière entre les deux : dbt **décrit** les transformations,
Dagster les **exécute** et émet le lineage.

## Couches

- **staging** (`models/staging/`) — vues de session `:memory:`, typage et
  normalisation :
  - `stg_gkg_mentions` : mentions d'organisations typées, avec la date civile
    (axe du chronogramme) et une **clé de rapprochement** normalisée ;
  - `stg_ref_universities` : le référentiel d'universités normalisé (seed CSV).
- **curated** (`models/curated/`) — Parquet external immuable `dt=…/run=…/` :
  - `curated_university_mentions` : mentions **qualifiées université** (appariées
    au référentiel — l'autorité, [ADR 0065](https://univ-lehavre.github.io/atlas/decisions/0065-classification-universites-heuristique-referentiel/)) ;
  - `curated_university_candidates` : organisations universitaires **d'aspect**
    absentes du référentiel — le canal d'**enrichissement** (arbitrage humain).

## Classification « université » (ADR 0065)

Le référentiel **fait foi** : une mention est retenue si sa clé normalisée apparie
une université du seed `ref_universities`. L'heuristique de nom (regex multilingue,
var `university_name_regex`) **n'est pas** un critère de rétention à elle seule ;
elle alimente le canal d'enrichissement (`curated_university_candidates`).

La **source** du référentiel est choisie par la var `ref_source` :

- `seed` (défaut) — le seed `ref_universities.csv`, **exemple minimal** versionné
  (identifiants génériques, neutralité [ADR 0035](https://univ-lehavre.github.io/atlas/decisions/0035-depot-generaliste-ouvert/)) ;
  utilisé par les tests hermétiques ;
- `ingested` — le référentiel **ingéré** dans le lakehouse par l'asset
  `ref_universities_snapshot` (dump ouvert d'organisations de recherche, type
  `education`). La prod surcharge à `ingested` : la classification est alors
  **autonome** (≈ 24 000 universités), sans référentiel hors dépôt.

Le code **permet** de charger un référentiel, il n'en impose aucun ; le déployeur
fournit l'URL du dump (config de l'asset).

## Le mart du chronogramme

Le mart `marts_university_timeline` (agrégat `(université, jour, n_articles)`) est
ajouté en PR 4, avec son `manifest.json` (contrat Parquet servi, ADR 0029).
