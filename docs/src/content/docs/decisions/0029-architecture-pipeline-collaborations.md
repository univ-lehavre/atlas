---
title: "0029 — Pipeline de collaborations : architecture V1 (plateforme DataOps, contrat Parquet)"
---

> **Amendé par [0054](/atlas/decisions/0054-ingestion-massive-snapshot-s3/).** La stratégie
> d'ingestion décrite ci-dessous (API REST OpenAlex paginée à 1 req/s,
> `from_updated_date=watermark`, sous-périmètre) est **remplacée pour la base complète** par
> l'ingestion via le **snapshot S3 OpenAlex** (`works` + `authors`, incrémental par partition
> `updated_date`). L'API REST reste pour les compléments ciblés (< 10 000 résultats). Le reste
> de cet ADR (contrat Parquet + manifest, dbt, Dagster, OpenLineage/Marquez, index pgvector,
> scoring déterministe) demeure en vigueur.

> **Amendé par [0067](/atlas/decisions/0067-modele-uplift-fwci-eunicoast/)** sur la
> **finalité**. Au-delà du signal de citations croisées décrit ici, le pipeline produit
> aussi un modèle **prédictif d'uplift de FWCI** (valeur ajoutée d'une collaboration)
> sur le périmètre **EUNICoast**, à partir d'une représentation **thématique** des
> auteurs (jamais leur identité). Les couches d'ingestion, staging/curated et le contrat
> Parquet + manifest sont réutilisés ; de nouveaux modèles dbt et assets Python sont
> ajoutés à côté du mart de collaborations.

## Contexte

Le monorepo `atlas` cherche à produire un premier service de bout en bout qui
**profile les collaborations entre chercheurs** : ingérer mensuellement des
données de citations (du type de celles exposées par OpenAlex), en dériver un
**signal de collaboration** (proximité thématique, mais surtout co-citation et
citations croisées entre travaux de deux chercheurs), et l'exposer à une PWA
permettant de trouver un expert avec qui collaborer. C'est la première
intégration **DataOps → service → PWA** du dépôt ; elle sert aussi de
**démonstrateur de plateforme DataOps**.

Ce démonstrateur n'est pas choisi en l'air : il vise explicitement à incarner le
profil DataOps tel qu'attendu sur le marché — un **pipeline lakehouse de
démonstration : ingestion → DuckDB/Iceberg sur S3, transformations dbt,
orchestration Dagster, lineage OpenLineage**. La V1 décrite ici aligne donc la
stack sur ces outils standards plutôt que sur une ossature minimale de CronJobs
et de SQL brut. C'est un **choix assumé** : la plateforme est plus riche (plus de
composants, dont des composants stateful nouveaux), au prix d'une charge
opérationnelle supérieure, en échange d'un démonstrateur représentatif de l'état
de l'art DataOps.

Plusieurs briques existent déjà et sont réutilisables **telles quelles** :

- `packages/citation-fetch` + `packages/fetch-one-api-page` : ingestion de
  citations en [Effect](/atlas/decisions/0005-effect-pour-la-pf/), avec rate-limit (1 req/s) et
  pagination ;
- `services/crf/src/server/app.ts` : patron de service Hono + OpenAPI 3.1 +
  Scalar, à cloner ;
- `apps/find-an-expert` : PWA SvelteKit avec authentification et un **dispositif
  d'événements** via Appwrite (`node-appwrite`, cf. [ADR 0010](/atlas/decisions/0010-node-appwrite-sdk-25/)),
  incluant les modules `consent-events` / `current-consents` / `ConsentType` —
  réinterprété ici comme **registre d'opposition** RGPD (il **retire** les
  personnes opposées, cf. [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)) ;
- `packages/researcher-profiles/src/services/embedding-profile.ts` : embeddings
  ONNX `all-MiniLM-L6-v2`, CPU, sans Python — réutilisés tels quels comme source
  des vecteurs de l'index sémantique ;
- `match-formatter.ts` : explicabilité (`sharedDomains` / `distinctTopicsA` /
  `distinctTopicsB` / `sharedKeywords`), base des résumés extractifs.

À l'inverse, plusieurs « déjà fait » apparents sont en réalité **à écrire
intégralement**, et il faut le dire sans le survendre :

1. `packages/citation/src/db/index.ts` est un wrapper DuckDB **local** trivial.
   Il ne contient **aucun** code `httpfs` / `s3://` / Parquet / `CREATE SECRET`.
   Une grande part du moteur de transformation passe désormais par
   **dbt (`dbt-duckdb`)**, mais l'accès lakehouse sous-jacent (httpfs, secret
   RGW path-style, lecture/écriture Parquet partitionnée Hive) reste neuf.
2. Le **signal cœur** — citations croisées article ↔ article entre deux
   chercheurs — n'existe **pas**. `scorer.ts` / `ensemble.ts` ne pondèrent que
   `{tfidf, embedding}` ; aucune notion de référence ou de citation croisée. Il
   faut ingérer les `referenced_works` (volumétrie lourde) et écrire la feature
   comme **modèle dbt + SQL**. Le point d'extension `EnsembleWeights` existe : on
   y branche le 3ᵉ signal.
   De plus, le **FWCI** (_Field-Weighted Citation Impact_) — métadonnée OpenAlex
   au niveau _work_, signal d'excellence du modèle supervisé du palier 2 —
   **n'est pas capté** par les types actuels (`WorksResult` porte
   `publication_year` et les `score` des topics/keywords, mais ni FWCI ni
   `cited_by_count`) : l'ajouter aux types et à l'ingestion est un chantier à
   part entière.
3. `find-an-expert` **dépend** d'Appwrite pour l'auth **et** le consentement : ce
   n'est pas « zéro base de données » mais une dépendance backend réelle à
   assumer (auto-hébergement Appwrite + MariaDB/Redis sur le cluster, non
   trivial).
4. L'**index d'exploration PostgreSQL/pgvector** (FTS lexical + recherche
   sémantique) n'existe pas : c'est un sous-système neuf, alimenté depuis le mart
   Parquet, déployé sur CloudNativePG.

Côté infrastructure, le cluster (dépôt séparé `../cluster`) fournit **déjà en
production** : Ceph RGW S3 (`CephObjectStore datalake`, bucket déclaré par
`ObjectBucketClaim`, EC 2+1), RBD ×3 (RWO par défaut), CephFS RWX,
VolumeSnapshots CSI, un registry interne (distribution v3, HTTP sans auth),
`metrics-server` + HPA, et des NetworkPolicies default-deny. Mais il **manque**
ce qu'exige une plateforme DataOps exposable, observable et stateful : ingress
controller + LoadBalancer/MetalLB, cert-manager/TLS, GitOps (Argo CD), une
gestion de secrets, la stack Prometheus/Grafana/Loki (jusqu'ici palier 2 de
l'ADR cluster 0016), **un PostgreSQL managé (CloudNativePG)** et
**l'orchestrateur Dagster** (avec son event log Postgres). Le cluster a des
**limites dures** : control-plane unique (SPOF de l'API), EC 2+1 `min_size=3`
(la perte d'1 nœud sur 4 **bloque** les I/O du datalake), pas de chiffrement
at-rest ni TLS interne, aucun GPU.

Sans architecture actée, le risque est double : surdimensionner sur les axes qui
ne servent pas ce cas (Kafka, Feast, KServe, LLM génératif synchrone pour un
batch mensuel mono-producteur) ou, à l'inverse, coupler les composants par une
API ou une base partagée et hériter du schema drift et de la latence sur le
chemin de calcul.

## Décision

On pose une **plateforme DataOps alignée sur les standards du marché** : un
lakehouse (S3 Ceph + Parquet + DuckDB), des transformations **dbt**, une
orchestration **Dagster**, un lineage **OpenLineage**, une qualité de données
**Great Expectations**, et — pour l'exploration — un **index PostgreSQL/pgvector**
alimenté depuis le mart. Le contrat de données producteur ↔ consommateur reste
**Parquet + manifest**, inchangé. Deux services métier (`atlas-api`,
`find-an-expert`) consomment le résultat, sur un socle cluster relevé. Iceberg,
MLflow et le LLM génératif sont **palier 2**, pas V1.

### Le flux mensuel orchestré par Dagster

```
Dagster (webserver + daemon + run workers sur K8s ; event log Postgres)
  schedule mensuel ──► asset: raw_citations
    citation-fetch (1 req/s, from_updated_date=watermark)
    → s3://citation/raw/dt=YYYY-MM/run=<id>/
  ──► assets dbt (dbt-duckdb)
    staging (typage, nettoyage) → curated (works, authorships, edges dédupliqués)
    → marts (collab : paires de chercheurs + features, dont citations croisées)
    → s3://citation/marts/collab/dt=YYYY-MM/run=<id>/ + manifest.json
  ──► asset checks (Great Expectations) sur raw / curated / marts
  ──► asset: index_load → PostgreSQL/pgvector (CloudNativePG)
    FTS tsvector (lexical) + colonnes vector(384) (all-MiniLM-L6-v2)
  ──► lineage OpenLineage (dbt + Dagster) → Marquez

atlas-api (Hono + OpenAPI 3.1 + Scalar) : (a) métier /recommendations /summary ;
  (b) exploration /search (lexical + sémantique) + filtrage structuré (debug)
find-an-expert (SvelteKit → PWA : vite-plugin-pwa, Workbox, Dexie offline)
```

L'**orchestration est asset-centric (Dagster)** : chaque artefact (raw, curated,
mart, index) est un _asset_ matérialisé, daté, traçable. Le **schedule mensuel**
remplace les CronJobs K8s bruts ; les **asset checks** (Great Expectations,
en complément des tests dbt) gardent la qualité en porte d'entrée et de sortie.
Dagster tourne sur K8s (`dagster-k8s` : daemon + webserver + run workers), son
**event log** est persisté dans Postgres. Cet orchestrateur est le livrable
représentatif du profil DataOps.

### Les transformations dbt

Le SQL DuckDB brut est remplacé par **dbt (`dbt-duckdb`)**, en couches
`staging` → `curated` → `marts` :

- **staging** : typage et nettoyage des entités brutes (works, authorships,
  `referenced_works`) ;
- **curated** : entités dédupliquées et conformes (works canoniques, arêtes
  d'authorship et de citation) ;
- **marts** : la table de fait `collab` (paires de chercheurs + features, dont
  le signal **citations croisées** écrit comme modèle dbt + SQL), matérialisée
  en Parquet partitionné sur S3.

dbt apporte les **tests** (`not_null`, `unique`, `relationships`, tests
singuliers), la **documentation** (`dbt docs`) et le **lineage** natif. La
qualité dbt est **complétée** par des suites **Great Expectations** sur
`raw` / `curated` / `marts`, exposées comme asset checks Dagster (ou, en
variante liée à dbt, par Elementary).

### Le lineage OpenLineage

Le **lineage est émis nativement** par dbt et Dagster via **OpenLineage**, et
collecté par **Marquez**. On obtient une traçabilité bout-en-bout
source → staging → curated → mart → index, sans instrumentation manuelle. Marquez
est un composant stateful supplémentaire (cf. _Prix à payer_).

### L'interface DataOps ↔ service : Parquet + manifest (inchangée)

Le contrat entre le pipeline et les consommateurs reste **un artefact Parquet sur
S3 Ceph + un `manifest.json` atomique** (écrit **en dernier**) contenant au
minimum :

```json
{ "partition": "dt=YYYY-MM/run=<id>", "schema_version": 1, "row_count": N,
  "parts": [{ "key": "...", "sha256": "...", "bytes": M }], "produced_at": "…" }
```

Invariants :

- le consommateur valide `row_count` + `sha256` **avant** de lire, et **refuse**
  une `schema_version` inconnue ;
- les partitions sont **strictement immuables** : un rejeu écrit
  `dt=YYYY-MM/run=<id>/`, **jamais** de réécriture en place ;
- le mart est conçu **ré-dérivable by-design** (régénération / masquage), pour
  ne pas opposer l'immutabilité au droit à l'effacement (cf.
  [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)).

**C'est dbt qui produit ce mart Parquet** (matérialisation des modèles `marts`),
et le manifest est écrit en dernier par l'asset de matérialisation. **L'index
PostgreSQL/pgvector est alimenté depuis ce mart**, en aval : il sert
l'exploration et la recherche, **il n'est pas le contrat de transfert**. Le
contrat producteur ↔ scoring reste **batch, par fichiers**, sans queue, sans API,
sans base partagée sur le chemin de calcul.

**Alternatives écartées (sur le chemin de calcul).**

- **API REST entre ingestion et modélisation** — couplage et latence inutiles
  pour un batch mensuel mono-producteur ; écartée.
- **Base de données partagée comme contrat producteur ↔ consommateur** — source
  de schema drift ; écartée. (Postgres existe bien, mais **en aval** comme index
  d'exploration, pas comme interface de transfert.)
- **Queue (Kafka / NATS)** — composant stateful pour ~1 événement/mois ;
  écartée.
- **Feature store (Feast)** — surdimensionné : Feast résout le train/serve skew
  du streaming, pas notre cas batch ; écarté.
- **Iceberg + MLflow** dès la V1 — écartés, gardés en ligne de mire : la
  migration Parquet → Iceberg est non destructive (cf. _Garde-fous_).

### L'index PostgreSQL/pgvector pour l'exploration

Au-delà du contrat Parquet (batch), la V1 alimente un **index PostgreSQL** sur
le cluster via **CloudNativePG**, pour l'exploration et la vérification
manuelle :

- **FTS lexical** : colonnes `tsvector` (recherche plein-texte sur titres,
  topics, mots-clés) ;
- **Recherche sémantique** : `pgvector`, colonnes `vector(384)` indexées,
  alimentées par les embeddings `all-MiniLM-L6-v2` **déjà produits** par
  `researcher-profiles` (aucun nouveau modèle, aucun GPU). Ces embeddings sont
  produits **par chercheur** (`EmbeddingProfile { researcherId, vector }` :
  mean-pooling L2 des œuvres d'un chercheur), pas par publication : le vecteur
  sémantique est donc porté par l'**entité chercheur**, et la recherche
  sémantique opère sur des profils de chercheurs, non sur des `works`
  individuels.

`pgvector` est retenu (recommandé par les fiches AI/microservices/MLOps) plutôt
qu'une base vectorielle dédiée (Qdrant, Milvus, Chroma, FAISS, Weaviate) : un
seul moteur (Postgres) sert à la fois le lexical et le sémantique, et il est de
toute façon nécessaire au cluster. L'index est **dérivé** du mart (régénérable),
jamais source de vérité du contrat.

### Le service de données `atlas-api` : double rôle

`atlas-api` (Hono + OpenAPI 3.1 + Scalar, patron `services/crf` cloné) assume
**deux rôles distincts** :

- **(a) Métier** : `/recommendations` (paires nominatives + score) et `/summary`
  (résumé **extractif**), consommés par la PWA.
- **(b) Exploration / vérification manuelle** : `/search` (recherche **lexicale**
  FTS _et_ **sémantique** pgvector) et des **endpoints de filtrage structuré**
  (par chercheur, run, partition, institution, période) destinés à
  **vérifier / débugger** l'indexation. C'est une demande explicite : disposer
  d'une API pour questionner les données en manuel et contrôler l'indexation.

Ce second rôle est en **lecture seule** par-dessus l'index Postgres ; il
**n'invalide pas** le contrat Parquet+manifest comme interface DataOps ↔ scoring
(qui reste batch). Conformément à [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/),
**toute** route exposant des personnes ou des recommandations nominatives — y
compris les routes d'exploration — exige une **authentification**.

### La stack, composant par composant (réutilisation honnête)

- **Ingestion** — `packages/citation-fetch` + `fetch-one-api-page` réutilisés
  tels quels ; `from_updated_date=watermark` pour l'incrémental. Le seul ajout
  côté ingestion est l'ingestion des `referenced_works` (volumétrie lourde,
  nouveau).
- **Transformations** — **dbt (`dbt-duckdb`)** : staging / curated / marts, tests
  dbt, `dbt docs`. L'accès lakehouse sous-jacent (httpfs, secret RGW path-style,
  Parquet Hive) est neuf.
- **Orchestration** — **Dagster** sur K8s (asset-centric, schedule mensuel, asset
  checks, event log Postgres).
- **Lineage** — **OpenLineage** → **Marquez**.
- **Qualité** — **Great Expectations** (suites sur raw/curated/marts) en
  complément des tests dbt (variante : Elementary lié à dbt).
- **Feature cœur** — citations croisées article ↔ article entre deux chercheurs,
  comme modèle dbt + SQL, branchée sur `EnsembleWeights` comme 3ᵉ signal aux
  côtés de `{tfidf, embedding}`. **100 % nouveau code métier.**
- **Index d'exploration** — **PostgreSQL + pgvector** (CloudNativePG) : FTS
  tsvector + vecteurs `all-MiniLM-L6-v2` **par chercheur** (clé `researcherId`),
  alimenté depuis le mart.
- **Service de données** — `atlas-api` (Hono + OpenAPI 3.1 + Scalar), double rôle
  métier + exploration ; lit le mart et/ou l'index ; **cache local sur PVC RBD**
  pour découpler la latence du RGW.
- **PWA** — `apps/find-an-expert` étendue (`vite-plugin-pwa`, Workbox, Dexie
  offline), endpoint `/summary` extractif. Ce tooling PWA répond à la **demande
  PWA de l'utilisateur** et sort du périmètre des fiches benchmark (qui couvrent
  DataOps / API / AI / MLOps / microservices, pas le front PWA).
- **Stockage & registry** — Ceph RGW (bucket `citation`) et le registry interne
  **déjà en prod**, réutilisés.

Conformément à [ADR 0008](/atlas/decisions/0008-clis-thins-logique-dans-packages/), la logique
(accès lakehouse, feature, scoring, chargement d'index) vit dans `packages/*` et
reste testable hors CLI/service ; les assets Dagster et les services restent des
consommateurs thins. Conformément à [ADR 0005](/atlas/decisions/0005-effect-pour-la-pf/), les
paquets retournent des `Effect<A, E>` et le `run` est déclenché aux points
d'entrée (handler Hono, `bin` du batch, op Dagster).

### Le socle cluster relevé (Prometheus complet + CloudNativePG + Dagster)

La V1 **déclenche** ce qui était différé, et y ajoute les composants stateful de
la plateforme :

- **ingress-nginx + cert-manager + MetalLB** (exposition HTTPS) ;
- **Argo CD** (GitOps) ;
- la stack d'observabilité **complète** — `kube-prometheus-stack`
  (Prometheus + Grafana + Alertmanager) **+ Loki** — dès la V1 (palier 2 de l'ADR
  cluster 0016 déclenché) ;
- **CloudNativePG** (PostgreSQL managé : index d'exploration **et** event log
  Dagster) ;
- **Dagster** (daemon + webserver + run workers) et **Marquez** (lineage).

Ces composants vivent dans le dépôt `../cluster` (manifestes d'infrastructure,
`platform/<addon>/`, validés au banc Vagrant) ; `atlas` ne porte que ses propres
manifestes applicatifs.

### Le modèle de collaboration : déterministe en V1, supervisé d'excellence au palier 2

Le « modèle » se décline en **deux temps**, sur le même point d'extension
`EnsembleWeights` (qui reste l'interface stable) :

- **V1 — scoring déterministe (non supervisé).** Une combinaison pondérée des
  signaux (`tfidf`, `embedding`, et le nouveau `cross_citations`) à **poids
  fixes** calibrés à la main. Pas d'apprentissage, pas de label, pas de données
  d'entraînement. Reproductible, auditable, explicable — c'est un **scoring de
  similarité/ranking**, pas un modèle appris. Il livre un premier bout-en-bout
  utile sans dépendre d'une vérité terrain.
- **Palier 2 — modèle supervisé de _prédiction d'excellence collaborative_.**
  L'unité d'analyse n'est plus « deux chercheurs se ressemblent-ils » mais le
  **profil d'excellence d'un collectif** sur une thématique, mesuré par le
  **FWCI** (_Field-Weighted Citation Impact_, métadonnée OpenAlex au niveau
  _work_). À partir des métadonnées des articles **récents (< 5 ans)** —
  co-auteurs, hiérarchie domain/field/subfield/topic + keywords, et FWCI — le
  modèle apprend, pour un chercheur donné (historique de ses articles), **(a)** sa
  **prochaine thématique d'excellence** et **(b)** **quels profils de chercheurs**
  formeraient une **collaboration d'excellence**, pour filtrer les chercheurs
  correspondants. **Label = co-publication future** (split **temporel** :
  features calculées sur la fenêtre `[..T]`, observation de la matérialisation
  sur `[T+1, T+n]` — ce qui évite la fuite de données). Modèle **léger,
  CPU-friendly** (régression logistique ou gradient boosting type
  LightGBM/scikit-learn — aucun GPU), tracé et versionné via **MLflow**
  (registry + artifact store sur le S3 Ceph). Ce volet **suppose d'ingérer le
  FWCI** (absent des types actuels) — voir _Garde-fous_ et le plan.
- **Résumés extractifs d'abord** : templates à trous depuis `match-formatter`
  (`sharedDomains` / `distinctTopicsA` / `distinctTopicsB` / `sharedKeywords`),
  pas de génération. Le LLM (Ollama CPU, Mistral-7B-Instruct Apache-2.0, résumés
  **pré-calculés en batch**, poids mirrorés sur le registry interne) est
  **palier 2** : aucun GPU au cluster ⇒ un 7B CPU coûte des dizaines de secondes
  par résumé, rédhibitoire en synchrone.
- **IA 100 % interne, sur CPU, sans aucun appel externe — _free tier_ inclus.**
  C'est un invariant, pas une commodité : (1) un mart de paires de chercheurs est
  une donnée personnelle ; l'envoyer à une IA SaaS (OpenAI, Anthropic, Mistral
  hébergé…) serait un transfert à un sous-traitant, contraire à
  [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/) — le caractère gratuit d'une
  offre n'y change rien (transfert hors UE, entraînement possible sur les
  données, quotas instables). (2) Le tout-interne est aussi un atout de
  **souveraineté** assumé. Les embeddings (`all-MiniLM-L6-v2`, ONNX) et, au
  palier 2, le LLM (Mistral-7B, GGUF quantifié) tournent **sur le cluster**, sans
  exfiltration.

### Découpage : assets orchestrés + deux services métier

- **`atlas-api`** (service long-vivant) : lit le mart et l'index, sert l'API
  (métier + exploration).
- **`find-an-expert`** (PWA + son backend SvelteKit/Appwrite) : auth, registre
  d'opposition (dispositif `consent-events` réinterprété), UI, `/summary`.
- **Le pipeline** (raw → dbt staging/curated/marts → index) : **assets Dagster**
  matérialisés à la demande / au schedule, pas un service de calcul en ligne. Il
  ne tient d'état métier qu'au travers des artefacts S3 et de l'index dérivé ;
  l'event log Dagster et l'index Postgres sont des **états opérationnels**
  assumés.

## Statut

Accepted (2026-06-02). Conditionnée par
[ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/) (gate RGPD) avant tout
traitement de données réelles.

## Conséquences

**Bénéfices.** Le contrat Parquet + manifest découple producteur et consommateur
sur le chemin de calcul sans queue, sans base partagée, sans API intermédiaire :
un seul artefact, validable (`sha256` + `row_count`) et versionné
(`schema_version`). Les partitions immuables rendent chaque exécution
reproductible et rejouable. La plateforme est **représentative du profil DataOps
attendu** : Dagster (orchestration asset-centric), dbt (transformations testées
et documentées), OpenLineage/Marquez (lineage), Great Expectations (qualité),
pgvector (recherche lexicale + sémantique). Elle réutilise massivement l'existant
(ingestion Effect, embeddings ONNX, patron Hono, PWA, Ceph, registry). L'API à
double rôle donne, en plus du métier, un **levier d'exploration et de débogage**
de l'indexation. Le socle relevé (ingress + TLS + GitOps + Prometheus complet)
rend le démonstrateur exposable et observable. Le scoring déterministe et les
résumés extractifs restent auditables et n'exigent ni GPU ni dépendance
générative.

**Prix à payer.** Cette V1 est **plus riche** que l'ossature minimale
(CronJobs + SQL brut) : c'est un choix assumé pour coller au démonstrateur du
benchmark, mais il coûte. Elle introduit plusieurs **composants stateful
nouveaux** à exploiter sur un cluster non-HA :

- **Dagster** (webserver + daemon + run workers) **et son event log Postgres** ;
- **CloudNativePG** (PostgreSQL : index d'exploration + event log Dagster) ;
- **Marquez** (store de lineage OpenLineage).

La **charge opérationnelle** augmente d'autant : sauvegardes/restaurations
Postgres, montées de version dbt/Dagster, supervision de trois nouveaux
sous-systèmes stateful, gestion de schéma de l'index. Quatre chantiers restent du
**vrai code neuf** :

1. accès lakehouse DuckDB ↔ S3 ↔ Parquet (httpfs, secret RGW, Parquet Hive) **et**
   les modèles dbt (staging/curated/marts) — le wrapper actuel ne couvre rien ;
2. feature citations croisées (modèle dbt + SQL) **+** ingestion des
   `referenced_works` (volumétrie lourde) — le signal cœur n'existe pas ;
3. l'index d'exploration PostgreSQL/pgvector (chargement depuis le mart, FTS +
   vecteurs) et l'API d'exploration `/search` + filtrage ;
4. l'intégration d'orchestration et de qualité (assets Dagster, schedule, asset
   checks Great Expectations, émission OpenLineage).

À cela s'ajoutent l'exposition externe (ingress + TLS, absents du cluster) et le
socle d'observabilité (Prometheus + Grafana + Alertmanager + Loki), ainsi que la
dépendance Appwrite (auth + consentement) à **auto-héberger** (Appwrite +
MariaDB/Redis), non triviale. La **signature des images** conteneur
(cosign/SLSA) n'existe pas encore — `release.yml` ne fait que la provenance npm
OIDC ; elle reste à ajouter (cf. plan, phase DevSecOps). Le cluster est
**non-HA** et ces SPOF sont **assumés** pour la V1 : control-plane unique (SPOF
de l'API K8s), et surtout **EC 2+1 `min_size=3`** — la perte d'1 nœud sur 4
bloque les I/O du datalake, donc le pipeline **et** `atlas-api` (mitigé
partiellement par le cache RBD), et l'event log Dagster / l'index Postgres
deviennent eux aussi sensibles à la disponibilité du stockage. Pas de chiffrement
at-rest ni TLS interne (acceptable tant qu'interne, à corriger avant exposition
d'un mart ou d'un index nominatif).

**Garde-fous.**

- **RGPD préalable** : [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/) est la
  **gate phase 0**, bloquante avant tout code sur données réelles. Le traitement
  repose sur une **base légale d'intérêt public / intérêt légitime — pas le
  consentement — en _opt-out_** : tout chercheur du périmètre d'ingestion est
  profilé par défaut, sauf opposition. Le dispositif `consent-events` /
  `ConsentType` de `find-an-expert` sert de **registre d'opposition** (il
  **retire** les personnes s'étant opposées au titre de l'art. 21 RGPD). L'outil
  est **générique/multi-tenant** : chaque établissement exploite une instance
  dont il est **responsable de traitement**, et la déclaration des alliances par
  l'utilisateur **filtre l'affichage**, pas l'ingestion. Le mart **et l'index
  dérivé** sont **ré-dérivables** pour intégrer le droit d'opposition et le droit
  à l'effacement ; l'authentification est exigée sur toute route nominative, **y
  compris les routes d'exploration** ; base légale et responsable de traitement
  restent institutionnels/DPO. Cet ADR **rouvre** [ADR 0026](/atlas/decisions/0026-rgpd-perimetre/)
  pour le cas précis du profilage (la collecte d'un nouveau type de donnée
  personnelle par une app déployée — déclencheur explicite de 0026), sans le
  contredire.
- **Nommage** : convention du dépôt — aucun nom de marque dans un identifiant.
  On emploie `citation` (jamais la marque) dans tout identifiant : bucket
  `s3://citation`, namespaces `citation-ingest` / `citation-marts` /
  `citation-serving` / `citation-pwa`, paquets `atlas-*`. La marque n'apparaît
  que dans la prose explicative. Cette convention est appliquée partout dans le
  dépôt (renommages OpenAlex → `citation`, REDCap → `crf`) mais n'est pas encore
  portée par un ADR dédié ; [ADR 0022](/atlas/decisions/0022-naming-convention/) ne traite que
  du préfixe `atlas-` des paquets publiés. Acter cette convention dans son propre
  ADR est une dette connue.
- **Évolution non destructive vers le palier 2** : Parquet → Iceberg (migration
  non destructive), scoring déterministe → modèle versionné (MLflow / registry),
  résumés extractifs → LLM pré-calculé en batch (Ollama CPU, poids sur le
  registry interne). Chaque marche se branche sur un point d'extension déjà posé
  (`schema_version` du contrat, `EnsembleWeights`, endpoint `/summary`) sans
  réécrire l'ossature.
- **Interface Parquet préservée** : l'introduction de dbt/Dagster et de l'index
  Postgres ne change **pas** le contrat producteur ↔ scoring. dbt **produit** le
  mart Parquet+manifest ; l'index Postgres/pgvector est **dérivé** du mart pour
  l'exploration, jamais source de vérité du transfert. Aucun couplage par base ou
  par API n'est introduit sur le chemin de calcul.
- **Documentation** : la chaîne est documentée à plusieurs niveaux
  ([ADR 0025](/atlas/decisions/0025-documentation-multi-niveaux/)) — surface (PWA, README
  services), profondeur (`docs/architecture/` : contrat de données, lakehouse,
  modèles dbt, orchestration Dagster, lineage, index, scoring), inline pour les
  dérogations.
- Le plan d'exécution phasé (une PR par phase, phase 0 = gate RGPD) vit dans
  `docs/plans/` et prend cet ADR + [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)
  comme socle décisionnel.
