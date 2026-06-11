# openalex-sample

Échantillon **synthétique** du snapshot OpenAlex, pour les tests **hermétiques** du
pipeline DataOps ([ADR 0057](https://univ-lehavre.github.io/atlas/decisions/0057-reproductibilite-tests-hermetiques/)).
Aucune donnée réelle, aucune source live : les fichiers sont fabriqués à la main
d'après le schéma réel d'OpenAlex (champs réellement consommés par le pipeline).

Reproduit l'arborescence réelle de la source pour que le code de test pointe les
mêmes chemins qu'en production :

```
data/works/updated_date=2020-01-01/part_000.gz      # JSONL gzippé
data/authors/updated_date=2020-01-01/part_000.gz    # JSONL gzippé
legacy-data/merged_ids/works/2022-07-15.csv.gz       # CSV gzippé (merge_date,id,merge_into_id)
```

## Génération déterministe

Les `.gz` sont produits par [`generate.py`](./generate.py) avec `gzip mtime=0` :
relancer le script donne des **octets identiques** (vérifiable par `sha256`).

```bash
python fixtures/openalex-sample/generate.py
```

Les sources en clair (`part_000`, `2022-07-15`) sont commitées **à côté** des `.gz`
pour être relisibles en revue. Les `.gz` sont la forme consommée par DuckDB/dbt.

## Contenu

- **4 works** (`W101`, `W102` d'Alice ; `W201`, `W202` de Bob), avec un graphe de
  citations croisées **contrôlé** — voir [`GOLDEN.md`](./GOLDEN.md) pour les valeurs
  attendues (golden test de l'étape 3.3, citations croisées).
- **2 authors** (`A1000000001` Alice, `A1000000002` Bob), affiliés à deux
  établissements synthétiques.
- **1 merged_id** (`W900000900` → `W101`).

Les champs reproduisent la forme réelle (`authorships[].author.{id,orcid,display_name}`,
`authorships[].institutions[]`, `referenced_works[]`, `cited_by_count`, `fwci`).
