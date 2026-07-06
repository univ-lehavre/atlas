# citation-dbt

## À quoi sert ce dossier ?

C'est le **projet de transformation** du pipeline de citations, écrit en
[dbt](https://www.getdbt.com/) sur moteur [DuckDB](https://duckdb.org/). Il prend le
**mart EUNICoast** (Parquet, produit en amont par l'asset `mart_eunicoast` de la
code-location [`../citation-dagster/`](../citation-dagster/) : le périmètre des works
ayant ≥1 auteur affilié EUNICoast et publiés depuis 2016, déjà filtré) et le **raffine**
en jeux de données propres et exploitables, écrits en fichiers **Parquet** sur le même
stockage objet. Le filtre de périmètre vit dans l'asset (lecture Parquet colonnaire
bornée), pas dans dbt — voir [ADR 0105](https://univ-lehavre.github.io/atlas/decisions/0105-modele-citation-parquet-mart-eunicoast/).

> **Parquet** = le **format de fichier** [Apache Parquet](https://parquet.apache.org/)
> (format colonne pour données tabulaires), jamais autre chose dans ce dépôt.

dbt **décrit les transformations en SQL** ; Dagster les **orchestre** (les modèles dbt
sont exposés comme assets Dagster via `dagster-dbt`, voir
[`../citation-dagster/src/citation_dagster/dbt.py`](../citation-dagster/src/citation_dagster/dbt.py)).

## Les couches

Le pipeline va du brut vers le raffiné, par couches successives :

- **`staging`** (`models/staging/`) — nettoyage/typage **un-pour-un** du mart. Des vues
  éphémères (rien n'est écrit sur S3) : on type les colonnes, on déplie les listes
  imbriquées (les auteurs, topics et mots-clés de chaque article) en lignes.
  - `stg_citation_works` — articles typés (work_id, année, titre, FWCI, compteur de citations).
  - `stg_citation_authorships` — un lien (article ↔ auteur) par ligne. L'affiliation est lue
    **dans le work** (les authorships portent l'auteur et son institution) — pas d'entité
    `authors` séparée (le work est auto-suffisant, ADR 0105).
  - `stg_citation_topics` / `stg_citation_keywords` — un lien (article ↔ topic/mot-clé) par ligne.
- **`curated`** (`models/curated/`) — données **canoniques, dédupliquées**, matérialisées
  en **Parquet sur S3** (le contrat de sortie). Chaque sortie est immuable : un nouveau
  run écrit sous un chemin `dt=AAAA-MM/run=<id>/` distinct, jamais en écrasant l'ancien.
  - `curated_works` / `curated_authorships` — œuvres et liens œuvre↔auteur canoniques.
  - `curated_work_topics` / `curated_work_keywords` — provenance thématique/lexicale.
  - `curated_pair_uplift_labels` — la **cible d'entraînement** : par paire de co-auteurs, le
    gain de FWCI obtenu ensemble vs la baseline solo antérieure (anti-fuite temporelle).
- **`marts`** (`models/marts/`) — le **signal métier** final (le mart « servi »), Parquet
  immuable sous `s3://citation/marts/collab/dt=AAAA-MM/run=<id>/` — le **contrat de sortie**
  du pipeline ([ADR 0029](https://univ-lehavre.github.io/atlas/decisions/0029-architecture-pipeline-collaborations/)).
  - `marts_collab_pairs` — **le cœur** : pour chaque **paire de chercheurs**, le nombre de
    **co-publications** (articles co-signés) — le signal de collaboration (cf. ci-dessous).

  > **Contrat & manifest.** dbt **produit** le Parquet ; un asset Dagster
  > (`collab_manifest`, côté [`../citation-dagster/`](../citation-dagster/)) écrit **en
  > dernier** un `manifest.json` voisin `{partition, schema_version, row_count,
  > parts:[{key,sha256,bytes}], produced_at}`. Le consommateur le valide (sha256 +
  > row_count) **avant** de lire et refuse une `schema_version` inconnue. Écrit en dernier,
  > le manifest est la **sentinelle de complétude** : un run coupé avant lui ne laisse
  > aucun manifest → la partition n'est pas servie.

### `marts_collab_pairs` — sémantique du co-autorat

Pour une paire de chercheurs (A, B), la collaboration se mesure par le **co-autorat** :
le nombre d'articles qu'ils ont **co-signés**. Le modèle **auto-joint** `curated_authorships`
sur `work_id` (deux auteurs distincts d'un même article), **canonicalise** la paire en
`(author_a, author_b)` avec `author_a < author_b` (ordre des ids) — ainsi (A,B) et (B,A)
fusionnent en **une ligne** — puis compte les works distincts.

| Colonne | Sens |
| --- | --- |
| `author_a` | premier auteur de la paire (ordre canonique `author_a < author_b`) |
| `author_b` | second auteur de la paire |
| `co_publications` | nombre d'articles **co-signés** par les deux (`count(distinct work_id)`) |

Le signal est **symétrique** (la paire, pas un sens). Les citations (`referenced_works`) sont
**hors périmètre** (ADR 0105) : on ne travaille que sur les métadonnées du work (année,
authorships, topics). Exemple golden (fixtures) : (Alice, Bob) `co_publications = 3`,
(Alice, Carol) `= 2`, (Bob, Carol) `= 1`.

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
