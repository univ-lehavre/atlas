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
  sert l'écriture lakehouse. Le watermark est un **timestamp** (`YYYYMMDDHHMMSS`),
  pas une date de partition.
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

## Statut

**Scaffold** (PR 1) : structure, déploiement et câblage K8s posés ; assets ajoutés
par lots (voir [`definitions.py`](src/mediawatch_dagster/definitions.py)).
