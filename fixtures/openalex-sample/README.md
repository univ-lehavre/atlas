# openalex-sample

Fixture **synthétique** du **mart EUNICoast**, pour les tests **hermétiques** du
pipeline DataOps ([ADR 0057](https://univ-lehavre.github.io/atlas/decisions/0057-reproductibilite-tests-hermetiques/),
[ADR 0105](https://univ-lehavre.github.io/atlas/decisions/0105-ingestion-mart-eunicoast/)).
Aucune donnée réelle, aucune source live : le fichier est fabriqué à la main d'après le
schéma réel du mart OpenAlex projeté par l'asset `mart_eunicoast`.

La fixture n'est **plus** le brut JSONL.gz (works/authors/merged_ids) : c'est directement
le **mart EUNICoast** (Parquet colonnaire), déjà filtré au périmètre (works ayant ≥1
auteur affilié EUNICoast ET publiés depuis 2016). La chaîne dbt le lit comme sa source
(`citation_raw.works` → `read_parquet(mart_root/run=*/*.parquet)`).

```
data/mart_eunicoast/run=fixture/part_000.parquet   # mart EUNICoast (Parquet)
```

Colonnes du mart (projection stricte, ADR 0105) : `work_id, publication_year, title,
authorships, topics, keywords, fwci, cited_by_count`. `authorships` / `topics` /
`keywords` sont des arrays de structs imbriqués au schéma OpenAlex réel
(`authorships[].author.{id,display_name,orcid}`, `authorships[].institutions[].{id,ror,…}`,
`topics[].{id,display_name,score,subfield{…},field{…},domain{…}}`,
`keywords[].{id,display_name,score}`).

## Génération déterministe

Le Parquet est produit par [`generate.py`](./generate.py) via DuckDB `COPY … (FORMAT
PARQUET)`, lignes **triées** par `work_id` et compression figée : relancer le script
donne un contenu **identique** (vérifiable par `sha256`). Le fichier `.parquet` est
**commité** (fixture figée).

```bash
python fixtures/openalex-sample/generate.py
```

## Contenu

- **5 works** au périmètre EUNICoast (tous auteurs affiliés Le Havre, tous ≥ 2016), avec
  un graphe de **co-autorat contrôlé** — voir [`GOLDEN.md`](./GOLDEN.md) pour les valeurs
  attendues (golden du co-autorat, des topics/keywords et de l'agrégat lexical).
- **3 auteurs** : `A1000000001` (Alice), `A1000000002` (Bob), `A1000000003` (Carol).
- Paires de co-autorat golden : (Alice,Bob)=3, (Alice,Carol)=2, (Bob,Carol)=1.
