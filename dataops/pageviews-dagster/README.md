# pageviews-dagster — code-location Dagster de la prévision des vues

Code-location [Dagster](https://dagster.io/) de la **prévision des vues Wikipédia**
des établissements ([ADR 0097](https://univ-lehavre.github.io/atlas/decisions/0097-prevision-vues-pageviews/)) :
on collecte la **série mensuelle** des vues de page par établissement, on la transforme
(dbt), puis on **entraîne/sert un modèle de prévision** dont le résultat est un mart
« servi » en Parquet + `manifest.json`.

C'est une **troisième source** de la plateforme DataOps, sœur de `citation-dagster`
(bibliométrie OpenAlex) et de `mediawatch-dagster` (veille médiatique GDELT). Elle
reprend le même patron d'ingénierie — corps purs séparés de la glue I/O, déterminisme,
lakehouse Parquet immuable, contrat de transfert par manifest — mais sur une série
**mensuelle** à **saisonnalité annuelle**.

## Transparence sur l'état de validation (à lire en premier)

Ce package est écrit **fidèlement au patron** des sources sœurs, mais tout n'a **pas**
le même niveau de validation :

- **Validé / exécuté.** Le **cœur de prévision** (`forecast_model.py`, ML pur numpy +
  scikit-learn, zéro I/O) est **exécuté et testé** — assemblage de features anti-fuite
  (property test), backtest temporel honnête, porte de décision prédictif/descriptif,
  agrégation en fenêtres métier. Il tourne en mémoire, sans S3 ni réseau.
- **Structurellement conforme, NON exécuté end-to-end.** Les **assets S3**
  (`raw_pageviews`, `forecast_views`, `manifest`, checks GE, drift), le **Dockerfile**
  et les **overlays de déploiement** (`deploy/`) sont écrits au patron mais **n'ont pas
  été rejoués contre un vrai S3 / un vrai cluster** — faute d'infra disponible à ce
  stade. Leur validation end-to-end (ingestion réelle, transform dbt, écriture mart +
  manifest, GitOps) est **planifiée en Phase 5, issue #564**.

Cette séparation est **délibérée** : la décision ML vit dans le module pur (testable
sans infra), l'I/O vit dans les assets (glue). C'est ce qui permet de garantir la
correction structurelle des assets tout en ne validant réellement que le cœur.

## Modules (`src/pageviews_dagster/`)

| Module | Rôle | Étape du pipeline |
| --- | --- | --- |
| `forecast_model.py` | Cœur ML **pur** (numpy + scikit-learn) : features anti-fuite, backtest temporel, porte de décision `has_predictive_power`, prévision + agrégation en fenêtres. **Zéro I/O.** | modèle (décision) |
| `resources.py` | Accès stockage objet : `ceph_target_from_env`, `render_rclone_config`, `duckdb_s3_config_from_env`, `MissingEnvError`. Un seul remote rclone `ceph` (source HTTP, pas de sync S3→S3). | config I/O |
| `lakehouse.py` | Pont DuckDB ↔ S3 : `connect` (secret `pageviews_s3`, httpfs path-style), `read_parquet`, `copy_to_parquet`. | lecture/écriture Parquet |
| `lineage.py` | Émission OpenLineage (namespace **`pageviews`**) — événements start/complete par asset. | observabilité |
| `tracking.py` | MLflow : `log_run`, `mlflow_config_from_env`, `EXPERIMENT_FORECAST` (experiment `pageviews_views_forecast`). Best-effort (dégrade sans `MLFLOW_TRACKING_URI`). | tracking MLOps |
| `dbt.py` | Intégration `dagster-dbt` : expose `staging → curated → marts` comme assets, partition **mensuelle** (`YYYY-MM`), garantit le manifest dbt (image / dev / parse paresseux). Dégrade en `([], {})` si dbt indisponible. | transformations |
| `ge_suites.py` | Suites Great Expectations **pures** (contexte éphémère, hermétique — aucune I/O). | qualité (défs) |
| `assets/raw_pageviews.py` | **Ingestion** : collecte HTTP des vues mensuelles par `(university_id, lang, title)` (titre + redirections), watermark incrémental `AAAAMM`, écriture `raw/pageviews/dt=<mois>/run=<run>/`. | brut |
| `assets/quality.py` | Asset checks GE **bloquants** (`ge_raw_pageviews`, `ge_marts_views_forecast`) : porte de qualité avant l'aval. | qualité (portes) |
| `assets/ref_universities_snapshot.py` | Ingestion du **référentiel** d'universités (résolution Wikidata/OpenAlex → `(university_id, lang, title)`). | référentiel |
| `assets/forecast.py` | **Prévision** : lit le mart `views_timeline`, délègue la décision au cœur pur, écrit `marts/views_forecast/` (Parquet), logge MLflow, émet le lineage. | mart servi |
| `assets/manifest.py` | Écrit **en dernier** le `manifest.json` atomique du mart de prévisions (contrat de transfert ADR 0029). | contrat |
| `assets/drift_forecast.py` | Suivi de **dérive** (`evidently_forecast_drift`) : distribution des prévisions (informatif) + bascule `predictive → descriptive` (**bloquant**). | drift MLOps |

## Le modèle de prévision (saisonnalité annuelle)

- **Grain** : `(university_id, month, views)`. Série **mensuelle** (les dumps
  `pageview_complete` de Wikimedia sont mensuels), **pas** journalière.
- **Saisonnalité annuelle** (cycle universitaire : rentrée, examens, creux estival) —
  d'où des lags à 12 mois et une baseline **saisonnière naïve annuelle** (S=12, repli
  persistance). C'est l'équivalent mensuel de la saisonnalité hebdomadaire de mediawatch.
- **Modèle GLOBAL unique** (identité établissement encodée en feature catégorielle
  `univ_code`), scalable aux ~10⁴ établissements.
- **Multi-horizon direct** : l'horizon `h` (en mois) est une feature ; les horizons
  métier sont obtenus par **agrégation** des prévisions mensuelles.
- **Horizons métier** — les équivalents mensuels propres de « 1 semaine / 1 mois / 1 an »
  (une série mensuelle n'a pas d'horizon « 1 semaine ») :
  - **`month_1`** — 1 mois ;
  - **`month_3`** — 3 mois ;
  - **`year_1`** — 12 mois.
- **Validation honnête temporelle** : `TimeSeriesSplit` sur les mois d'origine +
  **embargo** sur la date cible (jamais de KFold aléatoire — fuite). La **porte**
  `has_predictive_power` (R² nettement positif ET bat la baseline) décide de servir en
  mode **prédictif** ou de rabattre en **descriptif** (baseline). Le `served_mode` est
  porté sur chaque ligne servie (le drift le lit).
- **Déterminisme** figé (`RANDOM_STATE`, [ADR 0057]) ; prévision jamais négative (clip ≥ 0).

## Conventions (partagées avec les sources sœurs)

- **Déterminisme** ([ADR 0057](https://univ-lehavre.github.io/atlas/decisions/0057-determinisme-reproductibilite/)) :
  `RANDOM_STATE` figé, encodage d'identité par tri lexical, tri stable des sorties ;
  `sha256` calculé sur les **octets réels** des parts.
- **Nommage neutre** ([ADR 0035](https://univ-lehavre.github.io/atlas/decisions/0035-depot-generaliste-ouvert/)) :
  aucun identifiant interne ne porte « wikipedia », « wikimedia » ni « openalex » — ce
  sont les **sources**. Le domaine donne le nom générique **`pageviews`** partout (secret
  DuckDB `pageviews_s3`, experiment MLflow `pageviews_views_forecast`, namespace lineage
  `pageviews`, sous-répertoires `raw/pageviews/`, `marts/views_*`). Les marques
  n'apparaissent qu'**en prose**.
- **Immutabilité `dt=`/`run=`** ([ADR 0054](https://univ-lehavre.github.io/atlas/decisions/0054-immutabilite-partitions/)) :
  chaque partition `dt=…/run=<run_id>/` est immuable ; un rejeu est un **nouveau `run=`**,
  jamais une réécriture en place.
- **Atomicité du manifest** ([ADR 0029](https://univ-lehavre.github.io/atlas/decisions/0029-contrat-transfert-manifest/)) :
  le `manifest.json` est l'**unique et dernière** écriture de l'asset dédié, faite par un
  seul `rclone rcat` (PutObject atomique) — sentinelle de complétude. Un run coupé avant
  laisse les parts sans manifest ; le consommateur, qui lit le manifest d'abord, refuse
  alors de lire.
- **Hermétisme des tests** : les corps purs (agrégation, features, décision ML, suites GE)
  sont testables **sans S3 ni réseau**. Les assets injectent leur fetcher HTTP et leur
  accès S3 ; sans infra, ils dégradent proprement (skip / mode descriptif).
- **Pas de `from __future__ import annotations`** dans les modules introspectés par
  Dagster (assets, `dbt.py`, définitions) — Dagster lit les annotations à l'exécution
  (leçon drift D9). Les modules **purs** (`forecast_model.py`) peuvent l'avoir.

## Contrat cluster (ADR 0033)

La code-location ne code aucun endpoint ni identifiant en dur : tout vient du **contrat
d'interface cluster→atlas**
([ADR 0033](https://univ-lehavre.github.io/atlas/decisions/0033-contrat-interface-cluster/),
[ADR 0043](https://univ-lehavre.github.io/atlas/decisions/0043-provisionnement-bucket-obc/)).

- **Bucket via `ObjectBucketClaim` (OBC)** : le nom réel est choisi par l'OBC et lu dans
  `BUCKET_NAME` — **jamais** codé en dur.
- **Endpoints path-style** : `http(s)://<BUCKET_HOST>:<BUCKET_PORT>`, `force_path_style`
  côté rclone, `USE_SSL` explicite côté DuckDB (RGW Ceph en prod, SeaweedFS/MinIO au banc).
- **Secrets** : `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` du Secret de l'OBC, injectés
  à l'exécution — aucun identifiant committé ni présent dans l'image. Le `rclone.conf` est
  **rendu au run** depuis l'environnement.

Ce sont **exactement** les mêmes noms de variables que citation/mediawatch, pour que le
contrat banc ↔ prod soit identique.

## Outillage

Python natif ([ADR 0055](https://univ-lehavre.github.io/atlas/decisions/0055-categorie-dataops-python/)) :
[uv](https://docs.astral.sh/uv/) (dépendances), [ruff](https://docs.astral.sh/ruff/)
(lint/format), [pytest](https://pytest.org/) (tests). Depuis la racine du dépôt :

```sh
pnpm lint:python        # ruff check + format --check (toutes les code-locations)
pnpm test:python        # pytest
pnpm dataops:manifests  # validate.sh des overlays de déploiement
pnpm dataops:check      # les trois enchaînés
```

Localement dans le package : `uv run ruff check .`, `uv run pytest`.
