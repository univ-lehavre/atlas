---
title: "0064 — Collecte « veille médiatique » (GKG v2) par pull HTTP incrémental, code-location dédié"
---

## Contexte

Le pipeline DataOps existant ([ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/),
[ADR 0055](/atlas/decisions/0055-categorie-dataops-python/)) ne couvre qu'**une
seule source** : le snapshot bibliométrique OpenAlex
([ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/)), ingéré par le
code-location Dagster `citation-dagster`. Une **nouvelle exigence** apparaît :
établir un **chronogramme** (courbe temporelle) du **nombre d'articles de presse
mentionnant une université** choisie par l'utilisateur, toutes langues confondues.

La source retenue est le **GKG** (_Global Knowledge Graph_, graphe de connaissances
extrait de l'actualité mondiale), version 2, publié par le projet **GDELT**
(_Global Database of Events, Language, and Tone_). Faits techniques vérifiés
(sources : codebook GKG 2.1 et blog GDELT) :

- **Cadence** : un fichier **toutes les 15 minutes** (96 fichiers/jour). La liste
  maître est `masterfilelist.txt` (presse anglophone) et
  `masterfilelist-translation.txt` (presse traduite, _Translingual_) ; chaque ligne
  donne `taille md5 url`. Le dernier lot est dans `lastupdate.txt`.
- **Format** : chaque fichier est un **ZIP** contenant un unique `.gkg.csv`
  **tab-delimited** (l'extension `.csv` est trompeuse : le séparateur est la
  **tabulation**), **sans ligne d'en-tête**, **27 champs** (format V2.1). Taille
  ~4 à 11 Mo compressé, ~33 Mo décompressé.
- **Granularité** : **une ligne = un document/article** (clé `GKGRECORDID` unique,
  URL dans `V2DOCUMENTIDENTIFIER`). Compter les lignes mentionnant une université
  = compter les **articles** la mentionnant. C'est exactement le signal du
  chronogramme visé.
- **Multilingue gratuit** : _GDELT Translingual_ traduit la presse non-anglophone
  (de l'ordre de **65 langues** au lancement de GKG 2.0, davantage depuis) **vers
  l'anglais en amont** de l'extraction. Les organisations détectées dans un article
  non-anglophone atterrissent donc dans les **mêmes champs** que l'anglais, sous
  forme normalisée anglaise — « toutes langues » est natif, sans travail
  supplémentaire d'ingestion.
- **Volumétrie** : le flux GKG complet pèse de l'ordre de **plusieurs Go/jour**
  (≈ To/an) décompressé — à **ne pas** rapatrier intégralement (voir _Prix à payer_).

Le **typage université** n'est **pas** fourni par GKG : c'est l'objet de l'ADR
distinct [0065](/atlas/decisions/0065-classification-universites-heuristique-referentiel/).
Le présent ADR ne tranche que **où** et **comment** la source est collectée.

## Décision

> **La collecte GKG v2 vit dans un code-location Dagster dédié,
> `mediawatch-dagster`, distinct de `citation-dagster`. L'ingestion se fait par
> pull HTTP des fichiers 15 minutes depuis `data.gdeltproject.org`, pilotée par une
> partition temporelle journalière (curseur ré-matérialisable), vers le lakehouse
> souverain. Aucune dépendance à un service tiers (BigQuery) n'est introduite.**

### Source : pull HTTP des fichiers 15 minutes, pas BigQuery

GDELT met aussi le GKG à disposition en **BigQuery public** (`gdelt-bq.gdeltv2.gkg`),
souvent plus simple à requêter. Cette voie est **écartée** : elle introduit une
**dépendance à Google Cloud** (compte, facturation du compute à la requête,
egress hors du périmètre souverain) en tension avec la **souveraineté on-premise**
du cluster, déjà actée pour OpenAlex
([ADR 0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/), _souveraineté :
la source est un export public, en accès anonyme_). On retient le **pull HTTP**
direct des `YYYYMMDDHHMMSS.gkg.csv.zip` listés dans `masterfilelist.txt` /
`masterfilelist-translation.txt`, cohérent avec le modèle d'ingestion par copie de
fichiers déjà en place.

### Transport : `httpx` pour le download, `rclone`/DuckDB pour le lakehouse

Contrairement à OpenAlex (transfert **S3→S3** confié à `rclone` entre deux
endpoints), la source GKG est un **serveur HTTP** : le téléchargement des ZIP se
fait en **HTTP GET** (`httpx`, déjà dans l'écosystème Python). Les fichiers bruts
(CSV décompressés) sont ensuite **écrits dans le lakehouse** S3 souverain via les
mêmes briques que `citation-dagster` (`rclone` / DuckDB `httpfs`). `rclone` reste
ajouté à l'image du code-location pour l'écriture S3 et le `manifest`.

### Curseur d'ingestion : partition temporelle journalière (pas de watermark)

L'ingestion est pilotée par une **partition temporelle journalière** (Dagster
`DailyPartitionsDefinition`) : **la partition EST le curseur**. Matérialiser la
partition d'un jour rapatrie tous les fichiers 15 minutes de ce jour
(`YYYYMMDD…`), écrits sous `raw/gkg/dt=YYYY-MM-DD/run=<run_id>/` — idempotent (un
rejeu écrit un nouveau `run=`). Ce choix remplace un watermark applicatif : il rend
chaque jour **ré-matérialisable indépendamment**, donc le **backfill** historique
parallélisable et traçable (voir ci-dessous). Sur le banc, le volume reste **borné
par configuration** (`max_files` par partition) — on ne rapatrie jamais une journée
entière en test.

### Cadence : quasi temps réel (15 minutes), schedule armé par l'opérateur

La source publie toutes les 15 minutes ; on **colle à cette cadence**. Un schedule
`*/15 * * * *` (`ingest_current_day`, **STOPPED par défaut** — l'opérateur l'arme,
même posture que `citation` `transform_daily`) **re-matérialise la partition du jour
courant** à chaque tick : les nouveaux fichiers du jour sont rapatriés au fil de
l'eau (ingestion quasi temps réel). Le watermark n'étant plus nécessaire, la
re-matérialisation est sûre (immutabilité par `run=`). Une cadence plus lente
resterait correcte (la partition rattrape le jour entier) ; on retient 15 minutes
pour la fraîcheur maximale, à la main de l'opérateur.

### Backfill historique : matérialiser les partitions passées

Le rattrapage de l'historique (GKG 2.1 démarre le 2015-02-19) **ne passe pas** par
le schedule : il se fait en **matérialisant les partitions journalières passées**
depuis l'UI Dagster (ou par l'API de backfill), **parallélisable** et **traçable**
partition par partition. Chaque jour backfillé est indépendant et idempotent. Le
volume par partition reste borné (`max_files`) ; un backfill large est étalé sous
contrôle de l'opérateur, jamais un téléchargement géant en un seul run.

### Projection à l'ingestion : ne garder que les champs utiles

Le flux complet (27 champs) étant lourd, l'asset brut ne **conserve** que les
champs nécessaires au chronogramme : l'**identifiant de document**
(`GKGRECORDID`), la **date** (`V2.1DATE`), les **organisations**
(`V2ENHANCEDORGANIZATIONS`), l'**URL/source** (`V2DOCUMENTIDENTIFIER`,
`V2SOURCECOMMONNAME`) et la **provenance de traduction**
(`V2.1TRANSLATIONINFO`, pour tracer la langue d'origine). Le reste est **écarté**
à l'ingestion. La donnée brute conservée reste **immuable** (copie fidèle des
champs retenus, jamais transformée à l'ingestion — la transformation est en aval,
dbt).

### Périmètre v1 : articles seulement (GKG), pas la table Events

GDELT publie aussi une table **Events** (un évènement extrait par ligne, acteurs
**CAMEO**) et une table **Mentions**. La v1 **se limite au GKG** (axe
« articles ») : c'est le signal direct du chronogramme (`COUNT` de lignes GKG par
jour et par université). L'axe « évènements » (Events/Mentions) est **reporté à
une phase ultérieure** — il double le travail d'ingestion **et** de rattachement
(les acteurs CAMEO ne typent pas davantage une université), pour un signal
distinct qui peut être ajouté incrémentalement sans remettre en cause la v1.

### Code-location dédié, pas extension de `citation-dagster`

La veille médiatique est un **domaine distinct** de la bibliométrie : sources,
schéma, suites de qualité et cadence n'ont rien en commun avec OpenAlex. Plutôt
que de mêler les deux dans `citation-dagster`, on crée un **code-location séparé**
`mediawatch-dagster` (même patron : image gRPC, `definitions.py`, assets, dbt
DuckDB, Great Expectations, contrat Parquet+`manifest`, déploiement
`base`/`overlays`), enregistré comme un second `load_from.grpc_server` dans le
`ConfigMap dagster-workspace` du cluster. Coût assumé : un peu de _boilerplate_
de déploiement dupliqué (voir _Prix à payer_).

### Nommage : neutralité de domaine

Conformément à la neutralité du dépôt
([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/),
[ADR 0022](/atlas/decisions/0022-naming-convention/)), **aucun identifiant interne**
(code-location, bucket, namespace, secret, modèle, variable) ne porte la marque
« GDELT » ni « GKG ». Le domaine fonctionnel — **veille médiatique** — donne le
nom générique **`mediawatch`** (code-location `mediawatch-dagster`, lakehouse
`s3://mediawatch/raw`, namespace de déploiement `mediawatch`). « GDELT » et
« GKG » n'apparaissent qu'en **prose** (cet ADR, la documentation), pour nommer la
brique réellement intégrée.

## Statut

Accepted. **Étend** l'[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)
(le pipeline DataOps accueille une **seconde source**, dans un code-location
distinct) et **s'inscrit** dans la catégorie `dataops/`
([ADR 0055](/atlas/decisions/0055-categorie-dataops-python/), Python natif,
contrat Parquet+`manifest`). Le typage université relève de l'[ADR
0065](/atlas/decisions/0065-classification-universites-heuristique-referentiel/).
La frontière avec le cluster (nouveau code-location, nouveau lakehouse, nouvel
egress) est portée par l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/),
mis à jour dans la même PR le cas échéant.

## Conséquences

**Bénéfices.** Souveraineté : pas de dépendance Google Cloud, la source est un
serveur HTTP public en accès anonyme. Multilingue **natif** : la traduction
amont de GDELT rend « toutes langues » gratuit, sans logique d'ingestion par
langue. Pilotage simple : la partition journalière sert de curseur, le flux étant
nativement horodaté ; chaque jour est ré-matérialisable, donc le **backfill** est
parallélisable et traçable. Séparation des domaines : la veille médiatique
n'alourdit pas le code-location bibliométrique.

**Prix à payer.** Volumétrie du flux : plusieurs Go/jour décompressé si l'on
ingérait tout — d'où la **projection à l'ingestion** (champs utiles seulement) et
le **bornage** par partition (`max_files`). Backfill : sur une fenêtre historique
longue, chaque jour est une partition (96 fichiers) ; le rattrapage doit être
**étalé** sous contrôle de l'opérateur (jamais un run géant). Cadence 15 minutes :
~96 runs/jour quand le schedule est armé (coût orchestrateur et pods de run K8s,
assumé pour la fraîcheur quasi temps réel ; STOPPED par défaut). _Boilerplate_ de
déploiement : un second code-location duplique le patron `base`/`overlays`, le
Dockerfile gRPC et la chaîne CI Python. Egress Internet : comme pour OpenAlex, le
pull HTTP exige un **egress sortant** depuis le cluster, en tension avec le réseau
**default-deny** (ADR cluster
[0019](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0019-durcissement-reseau-cilium.md)) :
une politique d'egress vers `data.gdeltproject.org` (et le registre du référentiel,
voir [ADR 0065](/atlas/decisions/0065-classification-universites-heuristique-referentiel/))
est un **prérequis d'infrastructure** (tracé côté dépôt `cluster`).

**Garde-fous.** La donnée brute reste **immuable** (un rejeu d'une partition produit
un nouveau `run`, jamais une réécriture). Le **contrat de transfert**
producteur↔consommateur (Parquet + `manifest`,
[ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)) est
**réutilisé tel quel** : cette source produit son mart sous le même contrat. Le
schedule d'ingestion est **STOPPED par défaut** (l'opérateur l'arme). En test,
l'échelle est **bornée** (quelques fichiers 15 minutes par partition, fixtures
figées) — on ne télécharge jamais le flux réel sur le banc
([ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)). Aucune
marque dans les identifiants
([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)).
