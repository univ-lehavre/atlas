---
title: "0100 — Couche brute « native » GKG (27 champs) et bascule tout-Parquet du brut mediawatch"
---

## Contexte

L'[ADR 0064] a fixé la collecte GKG (_Global Knowledge Graph_ de GDELT) par pull
HTTP des fichiers 15 minutes, avec deux choix d'ingestion aujourd'hui remis en
cause par un besoin nouveau :

1. **Projection à l'ingestion.** Pour borner la volumétrie (le flux complet pèse
   plusieurs Go/jour décompressé, ≈ To/an), l'asset `raw_gkg` ne **conserve que 6
   des 27 champs** du format V2.1 (identifiant de document, date, organisations,
   source/URL, info de traduction) et **jette les 21 autres à l'ingestion**. La
   perte est **irréversible** sans re-télécharger GDELT — or la source est
   **rate-limitée** ([ADR 0064], garde-fous 429). Un usage aval qui voudrait un
   autre champ (thèmes, tonalité, localisations, personnes, GCAM, citations…)
   n'a aucun recours sur l'historique déjà collecté.
2. **Format JSONL gzippé.** Le brut est écrit en `*.jsonl.gz` (une ligne JSON par
   mention). Ce format n'est ni **colonnaire**, ni **typé**, ni doté de
   **statistiques de bloc** : le _predicate pushdown_ (sauter des blocs sur un
   filtre) est impossible, et chaque lecture aval re-décompresse et re-parse tout
   le texte. Les autres sources dataops récentes ([ADR 0094] mart eunicoast,
   [ADR 0095] pageviews) sont **en Parquet** ; le brut mediawatch est la dernière
   exception JSONL du dépôt.

Le besoin exprimé : **stocker les données brutes GKG de façon fidèle** (aucun champ
perdu), et **normaliser le stockage brut en Parquet**. Le typage « université /
laboratoire » reste **hors périmètre** de cet ADR (il relève de l'[ADR 0065],
classification par heuristique + référentiel ROR, en aval dbt).

Fait technique vérifié (codebook officiel _GDELT 2.0 Global Knowledge Graph
Codebook **V2.1**_, 2015-02-19) : le format GKG de la plateforme GDELT 2.0 est
versionné **V2.1** — **27 champs** tab-delimited, sans en-tête, l'ordre ayant
**changé** entre V2.0 et V2.1 (ne jamais présumer un index). C'est la version **la
plus à jour** de la source ; l'ADR 0064 la ciblait déjà.

## Décision

> **Le brut GKG mediawatch adopte une architecture en couches, entièrement en
> Parquet. Une couche « native » fidèle (les 27 champs V2.1) est ajoutée en amont ;
> la couche projetée (6 champs) en dérive sans re-télécharger la source ; le format
> JSONL gzippé est abandonné. Aucun filtrage métier n'est appliqué dans le brut :
> le filtre université/laboratoire reste en aval (dbt, [ADR 0065]).**

Cet ADR **amende** l'[ADR 0064] sur deux points (« projection à l'ingestion » et
format du brut) ; tout le reste de l'ADR 0064 (pull HTTP, partition journalière
curseur, cadence 15 minutes, backfill, robustesse rate-limit, neutralité de nommage)
**demeure**.

### Trois couches, chacune sa responsabilité

| Couche       | Préfixe S3                | Contenu                          | Filtre             | Producteur               |
| ------------ | ------------------------- | -------------------------------- | ------------------ | ------------------------ |
| **native**   | `raw_native/gkg/dt=/run=` | **27 champs** V2.1, copie fidèle | aucun              | asset `raw_native_gkg`   |
| **projetée** | `raw/gkg/dt=/run=`        | **6 champs** (chronogramme)      | aucun (toutes org) | asset `raw_gkg` (dérivé) |
| **curated**  | `curated/…`, `marts/…`    | mentions classées, chronogramme  | université/labo    | dbt ([ADR 0065])         |

La règle : **native et projetée fidèles et larges, curated filtré et métier**. Filtrer les
organisations dès le brut serait destructif et amputerait l'historique dès qu'un
établissement est ajouté au référentiel ROR ; la classification se **recalcule** au
contraire sur tout le brut conservé. La couche projetée garde donc **toutes** les
organisations ; elle ne fait que **réduire les colonnes** (27 → 6), pas les lignes.

### Couche native : les 27 champs en Parquet, fidèles

`raw_native_gkg` télécharge les fichiers 15 minutes du jour (même mécanique et même
client throttlé/anti-429 que l'ancien `raw_gkg`, [ADR 0064]), décompresse chaque
ZIP, et écrit les **27 champs V2.1 en Parquet** sous
`raw_native/gkg/dt=YYYY-MM-DD/run=<run_id>/<timestamp>.parquet`. Les champs sont
conservés **en `VARCHAR`** (copie fidèle du texte source ; le typage/parsing des
sous-structures — GCAM, thèmes, offsets — est un travail **aval**, pas celui du
brut). Un mapping documenté relie chaque colonne Parquet (identifiant neutre
snake_case, ex. `v21_date`, `v2_enhanced_organizations`) à son nom de codebook (le
`.` de `V2.1DATE` n'étant pas un identifiant SQL/Parquet valide).

### Couche projetée : dérivée de la native, un seul téléchargement

`raw_gkg` **ne télécharge plus** la source : il **lit la couche native** en S3
(`raw_native/gkg/dt=<jour>/run=<dernier>/`), **projette les 6 champs** et écrit sa
sortie **en Parquet** (fin du JSONL) sous `raw/gkg/dt=YYYY-MM-DD/run=<run_id>/`.
Il **dépend** de `raw_native_gkg` (même partition journalière) : un run
d'ingestion matérialise les deux dans l'ordre. Conséquence directe : la source
GDELT n'est frappée **qu'une seule fois** par fichier (la native), ce qui **réduit
la pression sur l'API rate-limitée** au lieu de la doubler.

### Partition : `dt=` journalier uniquement, pas par organisation

Les deux couches sont partitionnées **par jour** (`dt=YYYY-MM-DD`, Hive), réutilisant
la `DailyPartitionsDefinition` existante comme curseur ([ADR 0064]). On **écarte**
un partitionnement par organisation (`V2ENHANCEDORGANIZATIONS`) : cardinalité **non
bornée** (texte libre, centaines de milliers de valeurs croissantes), relation
**N-N** (une ligne mentionne plusieurs organisations, aucune clé scalaire), et
**explosion de petits fichiers** (désastreux pour S3 et DuckDB). Le filtrage rapide
par organisation est plutôt servi, dans le fichier, par le **tri à l'écriture** (par
`gkg_record_id`) qui donne des **statistiques de _row-group_** exploitables en
_predicate pushdown_, avec option d'un **filtre de Bloom** Parquet sur la colonne
organisations — un « index de zone », jamais une partition.

### Bascule tout-Parquet : migration du contrat aval dbt

L'abandon du JSONL **rompt** le contrat de lecture dbt (aujourd'hui
`read_json_auto('…/*.jsonl.gz')`). La migration est **dans la même PR** : la source
dbt `mediawatch_raw.gkg` et le modèle de staging passent à `read_parquet('…/*.parquet')` ;
la suite Great Expectations du brut lit désormais le Parquet. Le grain et les noms
de champs projetés sont **inchangés** — seul le format de fichier change.

### Rétention et immutabilité : inchangées

Le doublet `dt=…/run=<run_id>/` et la sémantique « dernier run gagne » +
lifecycle S3 (TTL) de l'[ADR 0064] sont **conservés** pour les deux couches : un
rejeu de partition écrit un nouveau `run=`, jamais un écrasement ; le code n'efface
jamais. La couche native **augmente** le volume conservé (27 champs vs 6) : le
bornage par `max_files` et le lifecycle S3 restent les garde-fous, comme prévu par
l'ADR 0064 (_prix à payer_ : volumétrie).

### Nommage : neutralité de domaine

Conformément à l'[ADR 0035] / [ADR 0022], le préfixe **`raw_native`** est neutre
(aucune marque « GDELT »/« GKG » dans un identifiant) ; « GKG » et « V2.1 »
n'apparaissent qu'en **prose** (cet ADR, la documentation) pour nommer la brique
réellement intégrée. Cohérent avec `raw/gkg` déjà en place (le segment `gkg`
descriptif du sous-chemin y étant admis comme pour l'ADR 0064).

## Statut

Accepted. **Amende** l'[ADR 0064] (§ « Projection à l'ingestion » et format du brut)
sans invalider ses autres décisions. **S'inscrit** dans la catégorie `dataops/`
([ADR 0055], Python natif, contrat Parquet + `manifest`). Le typage université reste
porté par l'[ADR 0065] (aval). La frontière avec le cluster (volumétrie S3 accrue,
lifecycle des `run=`) relève de l'[ADR 0033], mis à jour dans la même PR le cas
échéant.

## Conséquences

**Bénéfices.** Fidélité : aucun champ GKG n'est plus perdu à l'ingestion — tout usage
aval futur (thèmes, tonalité, localisations, GCAM, citations…) dispose de
l'historique complet sans re-télécharger la source rate-limitée. Format colonnaire :
Parquet apporte typage, compression et _predicate pushdown_ (statistiques de
_row-group_, filtres de Bloom) — lectures aval bien plus efficaces qu'un scan JSONL.
Homogénéité : le brut mediawatch rejoint la norme Parquet du dépôt ([ADR 0094],
[ADR 0095]). Pression API **réduite** : un seul téléchargement de la source (native),
la projection en dérivant. Séparation des responsabilités : le filtre métier reste
en aval ([ADR 0065]), le brut demeure large et recalculable.

**Prix à payer.** Volumétrie : la couche native stocke les 27 champs (≈ 4× le volume
projeté) — atténuée par la compression Parquet, le bornage `max_files` et le
lifecycle S3, mais réelle. Deux assets d'ingestion à opérer au lieu d'un (native +
projeté), avec une dépendance entre eux. Migration : la bascule Parquet **casse** le
contrat de lecture dbt du brut — traitée dans la même PR (source + staging + GE), à
ne pas oublier sous peine de rupture silencieuse. Backfill : le coût d'un rattrapage
historique augmente (Parquet 27 champs par fichier 15 minutes), toujours **étalé**
sous contrôle de l'opérateur ([ADR 0064]).

**Garde-fous.** La donnée brute (native et projetée) reste **immuable** (nouveau
`run=` à chaque rejeu, jamais de réécriture, [ADR 0054]/[ADR 0064]). Le contrat de
transfert producteur↔consommateur (Parquet + `manifest`, [ADR 0029]) est
**renforcé** (le brut y passe aussi). Le schedule d'ingestion demeure **STOPPED par
défaut** (l'opérateur l'arme). En test, l'échelle reste **bornée** (quelques fichiers
15 minutes par partition, fixtures figées, [ADR 0057]) — jamais le flux réel sur le
banc. Aucune marque dans les identifiants ([ADR 0035]).

[ADR 0022]: /atlas/decisions/0022-naming-convention/
[ADR 0029]: /atlas/decisions/0029-architecture-pipeline-collaborations/
[ADR 0033]: /atlas/decisions/0033-contrat-interface-cluster/
[ADR 0035]: /atlas/decisions/0035-depot-generaliste-ouvert/
[ADR 0054]: /atlas/decisions/0054-ingestion-massive-snapshot-s3/
[ADR 0055]: /atlas/decisions/0055-categorie-dataops-python/
[ADR 0057]: /atlas/decisions/0057-reproductibilite-tests-hermetiques/
[ADR 0064]: /atlas/decisions/0064-collecte-mediawatch-gkg/
[ADR 0065]: /atlas/decisions/0065-classification-universites-heuristique-referentiel/
[ADR 0094]: /atlas/decisions/0094-mart-eunicoast-parquet-co-autorat/
[ADR 0095]: /atlas/decisions/0095-source-pageviews-universites/
