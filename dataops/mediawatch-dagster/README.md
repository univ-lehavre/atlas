# mediawatch-dagster — code-location Dagster de la veille médiatique

Code-location [Dagster](https://dagster.io/) de la collecte **veille médiatique**
([ADR 0064](https://univ-lehavre.github.io/atlas/decisions/0064-collecte-mediawatch-gkg/)) :
ingestion du **GKG v2** (_Global Knowledge Graph_) du projet **GDELT**, pour établir
un chronogramme du nombre d'articles mentionnant une université choisie.

C'est une **seconde source** de la plateforme DataOps, distincte de `citation-dagster`
(bibliométrie OpenAlex) : sources, schéma et qualité n'ont rien en commun.

## Particularités vis-à-vis de `citation-dagster`

- **Source HTTP, pas S3.** Le brut est tiré par **pull HTTP** des fichiers 15 minutes
  de GDELT (`httpx`), pas par un sync S3→S3 rclone. Un seul remote rclone (`ceph`)
  sert l'écriture lakehouse. L'ingestion est **partitionnée par jour** (la partition
  est le curseur) : schedule 15 min pour le temps réel, backfill par matérialisation
  des partitions passées.
- **Classification à faire nous-mêmes.** Le GKG ne type pas les organisations : la
  qualification « université » se fait par heuristique de nom multilingue + référentiel
  ([ADR 0065](https://univ-lehavre.github.io/atlas/decisions/0065-classification-universites-heuristique-referentiel/)).
- **Pas d'embedding ni d'index pgvector** en v1 (périmètre « articles seulement ») :
  le mart est un agrégat `(université, date, n_articles)` servi en Parquet + `manifest`.

## Neutralité

Aucun identifiant interne ne porte la marque « GDELT » ni « GKG »
([ADR 0035](https://univ-lehavre.github.io/atlas/decisions/0035-depot-generaliste-ouvert/)) :
le domaine fonctionnel donne le nom générique **`mediawatch`** (bucket
`s3://mediawatch/...`, namespace de déploiement, secret). Ces marques n'apparaissent
qu'en prose.

## Outillage

Python natif ([ADR 0055](https://univ-lehavre.github.io/atlas/decisions/0055-categorie-dataops-python/)) :
[uv](https://docs.astral.sh/uv/) (dépendances), [ruff](https://docs.astral.sh/ruff/)
(lint/format), [pytest](https://pytest.org/) (tests, couverture ≥ 90 %). Depuis la
racine du dépôt :

```sh
pnpm lint:python        # ruff check + format --check (les deux code-locations)
pnpm test:python        # pytest (les deux code-locations)
pnpm dataops:manifests  # validate.sh des overlays de déploiement
pnpm dataops:check      # les trois enchaînés
```

## Pipeline (assets)

- `raw_gkg` — pull HTTP du flux GKG, **partitionné par jour** (schedule 15 min
  `ingest_current_day`, STOPPED par défaut) ;
- `ref_universities_snapshot` — ingestion du **référentiel** d'universités (dump
  ouvert, type _education_) ;
- modèles dbt (`mediawatch-dbt`) — staging → curated (classification) → mart ;
- `timeline_manifest` — `manifest.json` atomique du mart servi (contrat ADR 0029).

Jobs : `ingestion_job` (partitionné), `ref_job`, `transform_job` (dbt + manifest).
GE bloquant à chaque couche (brut, curated, mart).
