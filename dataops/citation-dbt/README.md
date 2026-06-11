# citation-dbt

## À quoi sert ce dossier ?

C'est le **projet de transformation** du pipeline de citations, écrit en
[dbt](https://www.getdbt.com/) sur moteur [DuckDB](https://duckdb.org/). Il prend le
**brut** ingéré (JSONL gzippé d'OpenAlex, déposé sur S3 par la code-location
[`../citation-dagster/`](../citation-dagster/)) et le **raffine** en jeux de données
propres et exploitables, écrits en fichiers **Parquet** sur le même stockage objet.

> **Parquet** = le **format de fichier** [Apache Parquet](https://parquet.apache.org/)
> (format colonne pour données tabulaires), jamais autre chose dans ce dépôt.

dbt **décrit les transformations en SQL** ; Dagster les **orchestre** (les modèles dbt
sont exposés comme assets Dagster via `dagster-dbt`, voir
[`../citation-dagster/src/citation_dagster/dbt.py`](../citation-dagster/src/citation_dagster/dbt.py)).

## Les couches

Le pipeline va du brut vers le raffiné, par couches successives :

- **`staging`** (`models/staging/`) — nettoyage/typage **un-pour-un** du brut. Des vues
  éphémères (rien n'est écrit sur S3) : on type les colonnes, on déplie les listes
  imbriquées (les auteurs et les références de chaque article) en lignes.
  - `stg_citation_works` / `stg_citation_authors` — articles / auteurs typés.
  - `stg_citation_authorships` — un lien (article ↔ auteur) par ligne.
  - `stg_citation_referenced_works` — un lien (article citant → article cité) par ligne.
- **`curated`** (`models/curated/`) — données **canoniques, dédupliquées**, matérialisées
  en **Parquet sur S3** (le contrat de sortie). Chaque sortie est immuable : un nouveau
  run écrit sous un chemin `dt=AAAA-MM/run=<id>/` distinct, jamais en écrasant l'ancien.
  - `curated_works` / `curated_authors` / `curated_authorships`.
  - `curated_edges` — **le cœur** : les arêtes article→référence, dédupliquées. C'est ce
    graphe de citations qui sert ensuite à mesurer les citations croisées entre chercheurs.

À venir (étapes suivantes) : une couche `marts` calculant le signal de citations
croisées par paire de chercheurs.

## Conventions & garanties

- **Déterminisme** (reproductibilité, [ADR 0057](https://univ-lehavre.github.io/atlas/decisions/0057-reproductibilite-tests-hermetiques/)) :
  même brut → même sortie. Chaque modèle alimentant un Parquet est trié (`ORDER BY`
  stable) et déduplique de façon déterministe.
- **Nommage** : `stg_citation_*` / `curated_*`. Jamais « openalex » dans un identifiant —
  c'est la source, pas le nom de nos objets.
- **Pas de télémétrie réseau** (`send_anonymous_usage_stats: false`) : hermétisme.
- **Tests dbt** (`not_null`, `unique`, `relationships`, plus des tests singuliers)
  vérifient les invariants à **toute** échelle ; les valeurs chiffrées attendues sur les
  fixtures (« golden ») sont vérifiées côté pytest de la code-location.

## Accès S3

Le backend S3 (lecture du brut, écriture du Parquet) est configuré dans
[`profiles.yml`](profiles.yml) : DuckDB `httpfs` + un secret S3 **path-style** dont les
identifiants viennent de l'**environnement** (jamais en dur) — mêmes variables que le
reste de la code-location. Au banc c'est SeaweedFS/MinIO (HTTP), en prod le RGW Ceph.

## Lancer en local

dbt s'exécute via l'environnement [uv](https://docs.astral.sh/uv/) de la code-location
sœur (qui porte les dépendances `dbt-duckdb` / `dagster-dbt`) :

```bash
# Vérifie que le projet compile (génère le manifest, sans I/O réseau) :
AWS_ACCESS_KEY_ID=x AWS_SECRET_ACCESS_KEY=x BUCKET_HOST=x BUCKET_PORT=0 \
  uv --project ../citation-dagster run dbt parse --project-dir . --profiles-dir . --target dev
```

Un `dbt build` réel (contre un S3 chargé des fixtures synthétiques) est exécuté par le
smoke hermétique `test_dbt_models.py` de la code-location — c'est la « preuve de
mécanique » exigée à chaque incrément ([ADR 0057](https://univ-lehavre.github.io/atlas/decisions/0057-reproductibilite-tests-hermetiques/)).
