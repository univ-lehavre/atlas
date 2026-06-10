---
title: "0054 — Ingestion massive OpenAlex par snapshot S3 (works + authors, incrémental par updated_date)"
---

## Contexte

L'[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/) a posé
l'architecture du pipeline de collaborations et prévoyait une ingestion **delta
d'un sous-périmètre** via l'**API REST** d'OpenAlex (interface web qui renvoie les
données page par page sur requête HTTP), paginée à une requête par seconde, avec
un curseur de date (`from_updated_date=watermark`). Le paquet `citation-fetch`
implémente déjà cette voie.

L'exigence a changé : il faut désormais ingérer **toute la base OpenAlex** — les
deux entités **`works`** (publications) **et `authors`** (chercheurs) — de façon
**mensuelle et incrémentale**. À cette échelle, l'API REST devient **infaisable** :

- **Volumétrie.** OpenAlex compte de l'ordre de **250 millions** de `works` et
  **90 millions** d'`authors`. À une requête par seconde, parcourir l'ensemble
  prendrait des années.
- **Limite technique dure.** Le code d'ingestion par API
  ([`packages/citation/src/fetch/fetch-citation.ts`](https://github.com/univ-lehavre/atlas/blob/main/packages/citation/src/fetch/fetch-citation.ts), `count > 10000`)
  plafonne à **10 000 résultats** par requête — la pagination profonde de l'API
  n'autorise pas davantage. L'API ne peut donc **pas** servir l'ingestion massive.

OpenAlex publie, en regard de l'API, un **data snapshot** : une copie complète de
la base, exportée en fichiers, mise à disposition sur un stockage objet public.
C'est la voie retenue ici. Faits techniques (source : documentation officielle
OpenAlex) :

- **Bucket** : `s3://openalex` (programme **AWS Open Data**, accès **anonyme** sans
  clé d'authentification). Le terme **S3** désigne le protocole de stockage objet
  d'Amazon, devenu un standard de fait.
- **Taille** : environ **330 Go compressés** (≈ 1,6 To décompressés).
- **Arborescence** : `s3://openalex/data/works/updated_date=YYYY-MM-DD/0000_part_00.gz`,
  idem pour `data/authors/`. Une **partition `updated_date`** est un dossier
  regroupant les enregistrements modifiés à une date donnée. Les fichiers sont au
  format **JSONL** (_JSON Lines_ : un objet JSON par ligne) **compressé en gzip**.
- **`manifest`** : un fichier par entité, **sentinelle de complétude** — sa
  présence garantit que tous les fichiers de données sont écrits (absent =
  export en cours).
- **`merged_ids`** : le dossier `s3://openalex/data/merged_ids/` liste les
  **entités fusionnées** (deux identifiants OpenAlex désignant la même entité
  réelle, dédupliqués) ; il faut les supprimer ou les rediriger localement.
- **`fwci`** (_Field-Weighted Citation Impact_, impact de citation normalisé par
  domaine) et `cited_by_count` sont des champs portés par chaque `work` dans le
  snapshot — captés au passage, sans seconde ingestion.

> **Cadence : un fait à assumer.** Le snapshot **gratuit** est rafraîchi
> **trimestriellement**. Les snapshots **mensuels** et les fichiers de changements
> quotidiens sont **payants**. Il n'existe donc pas de snapshot mensuel gratuit :
> cette décision n'en invente pas un (voir _Décision_ et _Prix à payer_).

## Décision

> **L'ingestion de la base complète OpenAlex (`works` + `authors`) se fait par le
> snapshot S3, de façon incrémentale par partition `updated_date`. L'API REST est
> reléguée aux compléments ciblés (moins de 10 000 résultats).**

### Source : le snapshot S3, pas l'API REST

Le pipeline synchronise `s3://openalex/data/{works,authors}` vers le lakehouse
souverain `s3://citation/raw` (bucket RGW Ceph du cluster, voir
[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/) pour le
contrat de stockage). L'API REST (`citation-fetch`) **reste disponible** mais
**uniquement** pour des compléments ponctuels et bornés (une entité précise, une
fenêtre étroite) sous le plafond des 10 000 résultats. Elle n'est plus le chemin
d'ingestion massive.

### Périmètre : `works` + `authors`

Les deux entités sont ingérées. Les **références bibliographiques**
(`referenced_works`, matière première du signal de citations croisées), le `fwci`
et le `cited_by_count` sont lus **comme champs des `works`** du snapshot — ils ne
nécessitent plus de passe d'ingestion séparée par l'API.

### Incrémental par `updated_date` + watermark de date

Après le **bootstrap** (synchronisation initiale complète), chaque exécution ne
re-synchronise que les **partitions `updated_date` postérieures** à un **watermark
de date** persistant (un enregistrement modifié migre dans la partition de sa
nouvelle date). Le watermark n'avance qu'après une synchronisation **complète et
réussie** (idempotence : un rejeu ne corrompt pas l'état).

### Transfert inter-endpoints : `rclone`

La source (`s3://openalex`, endpoint AWS public) et la cible (`s3://citation/raw`,
endpoint RGW Ceph interne) sont **deux endpoints S3 distincts** ; aucun outil ne
copie nativement de l'un à l'autre par une simple commande mono-endpoint. Le
transfert est confié à **`rclone`** (outil libre de synchronisation de stockage,
licence MIT), configuré avec **deux remotes** : `openalex` (accès anonyme,
sans clé) et `ceph` (credentials de l'`ObjectBucketClaim`). `rclone sync` gère
nativement le transfert entre endpoints distincts, le **parallélisme**, la
**reprise** et le **filtrage par préfixe** (donc le sous-échantillon borné des
tests). Alternative écartée : un `aws s3 cp` en deux temps (téléchargement
éphémère puis ré-upload) — plus de code, pas de sync différentiel natif. `rclone`
est ajouté à l'image du code-location.

### Entités fusionnées : `merged_ids`

À chaque incrément, le dossier `data/merged_ids/` est appliqué pour supprimer ou
rediriger localement les entités dédupliquées en amont. Le format exact des
colonnes (de l'ordre de `id` / `merge_into_id` / `merged_date`) est **à confirmer
à l'implémentation** — la documentation OpenAlex ne le fige pas formellement.

### Cadence réelle : trimestrielle

La cadence effective d'arrivée de nouvelles données est **trimestrielle** (limite
de la source gratuite). Le planificateur (_schedule_) Dagster peut rester déclaré
**mensuel** : un passage mensuel est **idempotent** et ne traite que d'éventuelles
nouvelles partitions — entre deux trimestres, il ne trouve rien de neuf et
n'écrit rien. Si une fraîcheur mensuelle réelle devient nécessaire, l'offre
payante OpenAlex est l'option à arbitrer (par le déployeur). On **ne prétend pas**
un mensuel gratuit qui n'existe pas.

### Nommage

`s3://openalex` est le **bucket source externe** : il n'apparaît que dans la prose.
Aucun identifiant interne d'`atlas` (bucket, namespace, paquet, variable, modèle)
ne porte « openalex » : la synchronisation écrit vers `s3://citation/raw`
(convention de dépôt, voir le plan
[pipeline de collaborations](/atlas/plans/2026-06-02-pipeline-collaborations/)).

## Statut

Accepted (2026-06-10). **Amende** l'[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)
sur le seul point de la stratégie d'ingestion : l'ingestion delta par API REST
paginée (`from_updated_date=watermark`, sous-périmètre) est remplacée, **pour la
base complète**, par le snapshot S3 (`works` + `authors`, incrémental par
`updated_date`). L'API REST subsiste pour les compléments ciblés (< 10 000
résultats). Le reste de 0029 (contrat Parquet + `manifest`, transformations dbt,
orchestration Dagster, lineage OpenLineage/Marquez, index pgvector, scoring
déterministe) demeure en vigueur.

## Conséquences

**Bénéfices.** Souveraineté : la source est un export public, en accès anonyme,
sans quota d'API ni clé. Exhaustivité : toute la base `works` + `authors`, pas un
sous-ensemble. Incrémentalité native : les partitions `updated_date` donnent le
delta sans logique de curseur applicative. Plus de plafond des 10 000 résultats.

**Prix à payer.** Volumétrie : ~330 Go compressés / 1,6 To décompressés à
rapatrier au bootstrap, avec l'impact correspondant sur le stockage objet Ceph
(datalake en _erasure coding_ 2+1) et sur la durée du premier run. Cadence
**trimestrielle** (pas mensuelle) tant qu'on reste sur la source gratuite. Coût
des jointures dbt/DuckDB sur ce volume (`works` × `referenced_works`). Gestion des
`merged_ids` (format à confirmer). Surtout : la synchronisation exige un **accès
Internet sortant** depuis le cluster vers les endpoints S3 d'AWS, ce qui entre en
tension avec le réseau **default-deny** du cluster (ADR cluster
[0019](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0019-durcissement-reseau-cilium.md)) :
une politique d'_egress_ Internet dédiée est un **prérequis d'infrastructure**
(tracé côté dépôt `cluster`).

**Garde-fous.** L'API REST reste plafonnée aux compléments (< 10 000) — jamais
l'ingestion massive. Les **partitions du lakehouse restent immuables** (un rejeu
produit un nouveau `run`, jamais une réécriture en place). Le **contrat de
transfert** producteur↔consommateur (Parquet + `manifest`) est **inchangé** : cet
ADR ne touche que l'amont (l'ingestion brute), pas l'interface DataOps↔scoring.
Le watermark de date n'avance qu'après succès complet. En test local (petit
cluster), l'échelle est **bornée par configuration** (un seul dossier
`updated_date`, ou un nombre limité de fichiers) — on ne synchronise jamais 1,6 To
sur le banc.
