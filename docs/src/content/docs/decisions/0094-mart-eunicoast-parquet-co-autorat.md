---
title: "0094 — Mart EUNICoast Parquet + co-autorat (modèle de données du pipeline citation)"
---

## Contexte

L'[ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/) a réorienté le
pipeline citation vers un **modèle prédictif d'uplift FWCI sur le périmètre
EUNICoast** : recommander à un chercheur des collaborations hors de sa zone de
confort thématique susceptibles d'un fort FWCI. La mise en route sur prod dirqual
(juillet 2026) a buté sur un mur de **volume** : la chaîne dbt matérialisait
l'intégralité d'OpenAlex (plus de 250 millions de works, snapshot ~1,6 To) avant de
filtrer au périmètre EUNICoast, ce qui faisait systématiquement OOM le pod. Deux
drifts l'ont établi empiriquement côté cluster : l'échantillonnage du _nombre_ de
fichiers ne suffit pas ([L76]), le facteur mémoire étant le **parsing JSON de forme**
de chaque work — `read_json_auto` infère et matérialise des champs lourds
(`abstract_inverted_index`, une MAP imbriquée) même lorsqu'on ne les projette pas
([L77]).

Trois faits, mesurés directement sur le lac public OpenAlex, ont ouvert la sortie :

1. **OpenAlex publie désormais un format Parquet** (`s3://openalex/data/parquet/`) à
   côté du JSONL.gz historique. Le Parquet est **colonnaire** : lire un sous-ensemble
   de colonnes ne désérialise jamais les colonnes lourdes non demandées.
2. **Le nombre de works par fichier est déjà inscrit dans le footer Parquet**
   (`num_rows`), lisible sans scanner les données (~0,2 s/fichier).
3. **L'affiliation d'un auteur est portée par le work lui-même** :
   `authorships[].institutions[].ror` contient directement le ROR de l'établissement,
   pas seulement un identifiant OpenAlex. Le work est donc **auto-suffisant** pour
   décider de son appartenance au périmètre — aucune jointure à l'entité
   `institutions` ni `authors`.

Un objectif métier a par ailleurs été précisé par le porteur : la collaboration se
mesure par le **co-autorat** (avoir co-signé un article), et l'on ne travaille que sur
les **métadonnées** du work (année de publication, `authorships`, `topics`,
`keywords`) — jamais sur les références sortantes (`referenced_works`).

## Décision

Le pipeline adopte un **mart EUNICoast Parquet** comme source unique de la chaîne dbt,
produit en amont par un asset Dagster dédié.

1. **Ingestion Parquet.** `raw_snapshot` rapatrie `s3://openalex/data/parquet/works`
   (Parquet seul ; le JSONL.gz est abandonné). Après le sync, un **manifest**
   (`raw/manifest_works.parquet` : `file, num_rows`) est écrit depuis les footers.

2. **Filtre par lots homogènes.** Un asset `mart_eunicoast` lit le manifest, compose
   des **lots ~homogènes en nombre de works** (par cumul de `num_rows`, les fichiers
   OpenAlex allant de quelques dizaines à ~360 k works), et traite chaque lot par une
   requête DuckDB **bornée en mémoire** : projection stricte des seules colonnes
   d'intérêt (jamais `abstract_inverted_index` ni `referenced_works`), filtre des works
   ayant **au moins un auteur affilié EUNICoast** (`authorships[].institutions[].ror`
   dans les 14 ROR du référentiel) **et publiés depuis 2016**. Le résultat (~10⁴–10⁵
   works) est accumulé en Parquet sous `mart_eunicoast/run=<id>/`.

3. **L'affiliation se lit dans le work.** Le périmètre est décidé sur l'affiliation
   **déclarée sur l'article** (l'institution résolue de l'authorship), pas sur
   l'affiliation courante ou agrégée de l'entité `authors`. C'est la sémantique
   correcte (un chercheur ayant changé d'établissement reste rattaché à EUNICoast pour
   les works qu'il y a signés) et cela rend le filtre auto-suffisant.

4. **Colonnes du mart.** `work_id, publication_year, title, authorships, topics,
keywords, fwci, cited_by_count`. Le `title` est porté pour l'affichage aval ;
   `keywords` pour le mart lexical `researchers`. L'abstract inversé reste exclu.

5. **Le mart est la source de dbt.** dbt lit `read_parquet(mart_eunicoast)`, un volume
   déjà réduit et filtré. Le filtre de périmètre **ne vit plus dans dbt** (où il
   provoquait l'OOM) mais dans l'asset Python, seul capable d'exploiter la projection
   colonnaire du Parquet.

6. **Collaboration = co-autorat.** `marts_collab_pairs` devient un auto-join de
   `curated_authorships` sur `work_id` : pour chaque paire canonique
   (`author_a < author_b`), `co_publications = count(distinct work_id)`. Le volet
   **citations** (`referenced_works`, `curated_edges` et ses dérivés) et l'entité
   **authors** (`stg/curated_authors`, `author_institutions`) sont **retirés** — hors
   périmètre métier et sans consommateur. Le modèle d'uplift (ADR 0067) était déjà en
   co-autorat et reste inchangé.

7. **DuckDB, pas Dask.** Le moteur du filtre reste DuckDB (déjà dans l'image, déjà
   prouvé sur ce lac). Dask a été étudié et **écarté** : il ne sait pas lire un seul
   sous-champ imbriqué (`authorships[].institutions[].ror`) et charge la colonne
   `authorships` entière — l'inverse de ce dont on a besoin (drift [L78] côté cluster).

## Statut

Accepted (2026-07-06). Prolonge [ADR 0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/)
(en fournit le socle de données scalable) et
[ADR 0055](/atlas/decisions/0055-categorie-dataops-python/) (accès lakehouse
DuckDB↔S3). Résout les drifts cluster L76/L77 (OOM du parse JSON) à la racine — en
abandonnant le JSON de forme au profit du Parquet colonnaire — et acte L78 (Dask
écarté). Preuve prévue en deux étages ([ADR 0104 cluster](https://univ-lehavre.github.io/cluster/decisions/0104-doctrine-preuve-deux-etages-banc-logique-prod-integration/)) :
banc-logique (fixtures hermétiques, uplift non vide) puis prod-intégration (run réel).

## Conséquences

- **Scalabilité acquise.** La mémoire est bornée par la taille d'un lot, plus par les
  ~250+ millions de works du lac. L'OOM récurrent disparaît par construction.
- **Un seul moteur.** rclone → DuckDB → dbt-duckdb : aucune couture, aucune image
  supplémentaire à mirrorer, cohérent avec l'air-gap.
- **Perte assumée.** Le graphe de citations et l'entité `authors` disparaissent des
  sorties. C'est voulu (hors périmètre). Le **raw Parquet complet reste sur Ceph** :
  un autre filtrage reste possible sans re-télécharger.
- **Fixtures et golden refondus.** Les fixtures deviennent le mart Parquet (works déjà
  filtrés) ; le golden bascule en co-autorat et prouve un uplift **non vide** au banc
  (paires (Alice, Bob) et (Alice, Carol) labellisées), ce qui couvre désormais
  l'objectif final dès la validation hermétique.
- **Réserve d'honnêteté.** Le volume EUNICoast réel (~70 k works, extrapolé d'un
  échantillon) et l'absence d'OOM à l'échelle complète restent à confirmer par un run
  prod-intégration.

[L76]: https://univ-lehavre.github.io/cluster/architecture/registre-drifts/
[L77]: https://univ-lehavre.github.io/cluster/architecture/registre-drifts/
[L78]: https://univ-lehavre.github.io/cluster/architecture/registre-drifts/
