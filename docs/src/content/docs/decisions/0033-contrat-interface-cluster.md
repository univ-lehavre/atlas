---
title: "0033 — Contrat d'interface entre l'application (`atlas`) et le cluster"
---

## Contexte

Le pipeline de collaborations ([ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/))
est développé dans le dépôt `atlas` (code, manifestes applicatifs, plan) mais
**s'exécute sur un cluster Kubernetes** dont l'infrastructure vit dans un dépôt
**séparé** (`cluster` : Ansible, addons `platform/<addon>/`, banc Vagrant). Le
plan d'exécution répartit explicitement le travail : la Phase 1 (socle :
ingress, TLS, Argo CD, observabilité, CloudNativePG, Dagster, Marquez) est
**côté cluster** ; les Phases 2–6 (ingestion, transformations, index, API, PWA)
sont **côté `atlas`**.

Les deux dépôts collaborent par un **contrat implicite** : `atlas` suppose que le
cluster fournit un bucket S3 nommé d'une certaine façon, un Postgres avec
`pgvector`, un registry pour ses images, un Argo CD qui réconcilie ses
manifestes ; le cluster suppose que `atlas` lui livre des images et des
`Application` Argo CD dans un format donné. **Tant que ce contrat reste
implicite, il peut diverger en silence** : un nom de bucket différent de part et
d'autre, une image taguée autrement que ce que le manifeste référence, une
version de `pgvector` ou de Dagster incompatible — autant de pannes qui
**compilent et déploient mais échouent à l'exécution**.

L'outil étant **générique et multi-tenant** ([ADR 0031](/atlas/decisions/0031-outil-generique-open-source/)),
ce contrat ne lie pas seulement « mes deux dépôts » : il lie le **code générique**
à **n'importe quel cluster** qui l'exploite. Il doit donc être **explicite et
unique**, pour que tout déployeur sache ce que l'application attend de son
infrastructure, sans avoir à lire le code.

On retient une **coordination par contrat documenté** plutôt que par tests
d'intégration automatisés inter-dépôts : à ce stade (un opérateur, un
déploiement pilote), un test end-to-end en CI serait disproportionné (cluster
requis, lenteur, fragilité). Le contrat explicite suffit à empêcher la dérive ;
des vérifications statiques ou un smoke-test au banc pourront être ajoutés
**si** une douleur réelle se manifeste.

## Décision

> **Cette page est la _vue applicative dérivée_ du contrat d'interface entre
> l'application `atlas` et le cluster qui l'exploite.** La source de vérité du
> contrat est **publiée par le dépôt `cluster`**
> ([ADR cluster 0043](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0043-contrat-interface-cluster-atlas.md),
> fichiers machine-lisibles `contract/*.example.yaml`) ; cette page en est le
> **miroir côté atlas** — elle énonce les mêmes points de contact, du point de
> vue de ce que l'application _attend_ et _fournit_. Les deux côtés s'y conforment ;
> tout changement d'un point de contact se reflète ici **dans la même PR** que le
> changement de code, et l'alignement avec la source `cluster` est tenu par
> discipline (la frontière est outillée, [ADR 0077](/atlas/decisions/0077-topologie-deux-depots-cluster-atlas/)).

Les valeurs concrètes (noms d'hôtes, plages d'IP, tailles) sont **propres à
chaque instance** et relèvent de sa **configuration**, pas du code générique
([ADR 0022](/atlas/decisions/0022-naming-convention/), [ADR 0031](/atlas/decisions/0031-outil-generique-open-source/)) ;
le contrat fixe les **conventions et formats**, pas les valeurs d'une instance
donnée.

### Ce que le cluster fournit à l'application

| Point de contact          | Contrat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Fourni par (Phase 1)                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Stockage objet S3**     | Un bucket dont le nom suit la convention `citation` (jamais la marque, [ADR 0022](/atlas/decisions/0022-naming-convention/)), accessible en **path-style**, avec un **Secret** d'identifiants S3 (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / endpoint) généré par un **`ObjectBucketClaim`**.                                                                                                                                                                                                                                                             | Ceph RGW (déjà en prod)              |
| **PostgreSQL + pgvector** | Un cluster PostgreSQL géré (**CloudNativePG**) avec l'extension **`pgvector`** activée, accessible par DSN depuis les namespaces consommateurs, dimension de vecteur **384** (modèle `all-MiniLM-L6-v2`).                                                                                                                                                                                                                                                                                                                                                      | Étape 1.6                            |
| **Cache de flux**         | Une **base logique `cache`** sur le **même CloudNativePG** (pas de brique Redis dédiée — sobriété, [ADR cluster 0093](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0093-cache-flux-cnpg.md)), rôle `cache` + Secret `pg-role-cache`, DSN composé des `POSTGRES_CACHE_*` (`HOST=pg-rw.postgres` — **nom court**, jamais le FQDN ; `PORT`, `DB=cache`, `USER`, `PASSWORD`). L'**adaptateur** (table clé-valeur + UPSERT + `pg_advisory_lock`) vit côté application ([ADR 0085](/atlas/decisions/0085-cache-flux-postgres-package-partage/)). | Endpoint `postgres-cache`            |
| **Orchestrateur**         | **Dagster** déployé (webserver + daemon + run workers), event log dans Postgres ; l'application fournit la **code-location** (assets), pas l'orchestrateur.                                                                                                                                                                                                                                                                                                                                                                                                    | Étape 1.7                            |
| **Lineage**               | Un collecteur **OpenLineage** (**Marquez**) joignable via `OPENLINEAGE_URL`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Étape 1.8                            |
| **Suivi de modèles**      | Un serveur **MLflow** (tracking + registre de modèles) joignable via `MLFLOW_TRACKING_URI`, avec **backend store** sur **CloudNativePG** et **artefact store** sur un bucket S3 (convention `citation`, [ADR 0022](/atlas/decisions/0022-naming-convention/)). L'application **logue** ses runs et **enregistre** le modèle ; elle ne déploie pas le serveur ([ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/)).                                                                                                                            | Serveur MLflow (ADR `cluster` dédié) |
| **Registry d'images**     | Un registry interne où l'application pousse ses images et que les manifestes/run workers référencent.                                                                                                                                                                                                                                                                                                                                                                                                                                                          | déjà en prod                         |
| **GitOps**                | **Argo CD** réconciliant les `Application` de l'application, cadrées par un `AppProject` couvrant les namespaces `citation-*`.                                                                                                                                                                                                                                                                                                                                                                                                                                 | Étape 1.4                            |
| **Exposition**            | Un **ingress** + **TLS de bordure** (cert-manager) pour exposer l'API et la PWA en HTTPS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Étapes 1.2–1.3                       |
| **Observabilité**         | **Prometheus** scrappant les `ServiceMonitor` des services applicatifs ; Grafana + Loki.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Étape 1.5                            |

### Ce que l'application fournit au cluster

| Point de contact       | Contrat                                                                                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Namespaces**         | Les charges applicatives vivent dans `citation-ingest`, `citation-marts`, `citation-serving`, `citation-pwa` (convention [ADR 0022](/atlas/decisions/0022-naming-convention/) — jamais la marque).  |
| **Images**             | Poussées sur le registry interne, **taguées explicitement** (pas `latest` en production) ; les manifestes référencent le tag exact.                                                                 |
| **Manifestes**         | Des `Application` Argo CD + Deployment/CronJob/Service/Ingress conformes (validés `kubeconform`), réconciliables sans intervention manuelle.                                                        |
| **Métriques**          | Chaque service expose `/metrics` et déclare un `ServiceMonitor` ; aucune donnée personnelle dans les labels (cardinalité + RGPD, [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/)). |
| **Contrat de données** | Le mart est un artefact **Parquet + `manifest.json`** sur le bucket S3 (immuable, checksummé, versionné) — l'infrastructure n'a pas à le connaître, mais elle garantit la **durabilité** du bucket. |

### Frontière de responsabilité

- **`atlas`** : tout ce qui est _applicatif_ (code, images, manifestes de ses
  propres services, assets Dagster, schéma de l'index).
- **`cluster`** : tout ce qui est _infrastructure_ (addons `platform/<addon>/`,
  Ansible, opérateurs, exposition, observabilité), **et le déploiement réel**,
  désormais **déclenché par le push de code** (chaîne événementielle GitOps, zéro
  geste) — l'intervention humaine subsiste comme **revue de PR**, pas comme geste
  de déploiement (cf. l'Évolution du 2026-07-02 en bas de page ; le « comment »
  vit côté cluster, [ADR cluster 0095 §1.b](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0095-build-applicatif-evenementiel-in-cluster.md)).
- **Aucun manifeste d'infrastructure ne vit dans `atlas` ; aucun code applicatif
  ne vit dans `cluster`.**

## Statut

Accepted (2026-06-02). Complète [ADR 0029](/atlas/decisions/0029-architecture-pipeline-collaborations/)
(architecture) et [ADR 0031](/atlas/decisions/0031-outil-generique-open-source/) (outil
générique) ; ne crée aucune contrainte technique nouvelle, il **rend explicite**
un contrat jusqu'ici implicite.

## Conséquences

**Bénéfices.** Les deux dépôts (et leurs agents) ont une **référence unique** des
points de contact : un nom de bucket, un format de manifeste, une version
d'extension ne peuvent plus diverger en silence sans qu'un côté contredise ce
document. Tout déployeur tiers sait, en une page, ce que l'application **attend**
de son cluster — sans lire le code. La frontière de responsabilité est nette, ce
qui évite que de l'infrastructure ne fuite dans `atlas` ou que du code applicatif
ne fuite dans `cluster`.

**Prix à payer.** Le contrat est tenu **par discipline**, pas par un test
automatisé : un changement non répercuté ici reste possible (le garde-fou est
humain, pas mécanique). Il faut le **maintenir à jour dans la PR** qui change un
point de contact — sinon il périme, comme toute documentation non vérifiée. Le
couplage par valeurs d'instance (noms d'hôtes, IP) reste à la charge de chaque
déployeur via sa configuration.

**Garde-fous.**

- **Tout changement d'un point de contact** (nom de bucket, namespaces, format de
  manifeste, version d'un composant fourni) **met à jour ce document dans la même
  PR** que le code ou l'infrastructure concernés.
- Le **nommage** suit [ADR 0022](/atlas/decisions/0022-naming-convention/) des deux côtés :
  `citation`, jamais la marque, dans tout identifiant partagé (bucket,
  namespaces, secrets).
- Les **valeurs propres à une instance** (hôtes, IP, tailles, base légale)
  vivent dans la **configuration de l'instance**, pas dans ce contrat ni dans le
  code générique ([ADR 0031](/atlas/decisions/0031-outil-generique-open-source/)).
- Si une dérive silencieuse cause une panne malgré le contrat, on **promeut** la
  vérification au niveau supérieur (checks statiques inter-dépôts, puis
  smoke-test au banc) — pas avant qu'une douleur réelle ne le justifie.
- Le **déploiement réel** est **déclenché par le push de code** (le webhook de
  build atlas amorce la chaîne événementielle GitOps, zéro geste manuel) ; le
  **garde-fou humain** est la **revue de PR** en amont du merge, pas un geste de
  déploiement. Le mécanisme détaillé vit côté cluster
  ([ADR cluster 0095 §1.b](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0095-build-applicatif-evenementiel-in-cluster.md))
  — atlas ne le duplique pas (neutralité de domaine) ; cf. l'Évolution du
  2026-07-02 ci-dessous.

## Évolution (2026-06-04) — Stratégie d'images de déploiement

Le contrat ci-dessus dit ce que l'application **fournit** au cluster (des images
taguées, poussées sur le registry, référencées par les manifestes). Il ne disait
rien, jusqu'ici, de **comment ces images sont fabriquées**. Le cadre [#308](https://github.com/univ-lehavre/atlas/issues/308)
a produit le **premier et unique `Dockerfile` du dépôt** —
[`apps/sillage/Dockerfile`](https://github.com/univ-lehavre/atlas/blob/main/apps/sillage/Dockerfile) —
qui sert désormais de **patron recopiable** sur les six unités déployables du
monorepo. Cet ajout ne modifie aucun point de contact existant : il **fixe la
forme** des images livrées, là où le contrat fixait déjà leur tag et leur
destination.

### Patron d'image

- **Version Node alignée sur `.nvmrc`.** L'image part de `node:${NODE_VERSION}-alpine`
  avec `ARG NODE_VERSION=24`, valeur identique au `.nvmrc` de la racine. La version
  d'exécution ne peut donc pas diverger de la version de développement : un seul
  endroit à bumper, vérifiable d'un `grep`. `corepack enable` active **pnpm à la
  version pinnée** par le champ `packageManager` du `package.json` racine.
- **Multi-stage `builder` / `runner`.** Un stage `deps` installe **toutes** les
  dépendances du workspace (`pnpm install --frozen-lockfile`, store monté en
  cache) — devDeps comprises, car le build SvelteKit a besoin de la toolchain
  (vite/svelte-kit). Le stage `builder` compile l'unité ciblée ; le stage `runner`
  final ne garde que le runtime Node, les artefacts de build et un `node_modules`
  de prod élagué. **Pas de pnpm, pas de sources, pas de devDeps** dans l'image
  livrée.
- **`pnpm deploy` → `node_modules` autonome.** `pnpm --filter=<unité> --prod --legacy deploy /prod`
  matérialise un `node_modules` de **production résolu hors du symlink-store** (deps
  workspace internes incluses, devDeps écartées), copiable seul dans le `runner`.
  C'est ce qui permet une image finale minimale sans embarquer le store pnpm ni le
  graphe workspace complet. Le flag `--legacy` est requis par pnpm 10 pour cibler
  un filtre depuis la racine du monorepo.
- **`USER node` non-root.** Le `runner` `chown`e `/app` puis bascule sur l'user
  `node` (uid 1000) fourni par l'image officielle : **aucune charge applicative ne
  tourne en root**, conformément à la posture de durcissement attendue côté
  cluster.
- **`PORT` / `HOST` au runtime.** L'adapter Node lit `PORT`/`HOST` à l'exécution ;
  l'image fixe `ENV PORT=5173` et `ENV HOST=0.0.0.0` par défaut, surchargables par
  le `Deployment`. Le `Service`/`containerPort` du manifeste s'aligne sur cette
  valeur.
- **`HEALTHCHECK` ↔ probe Kubernetes.** L'image déclare un `HEALTHCHECK` (HTTP `GET /`
  sur le port d'écoute) ; côté cluster, il se traduit en **`readinessProbe` /
  `livenessProbe`** dans le `Deployment`. Le contrat est : _toute unité déployable
  répond sur son endpoint de santé_, pour qu'Argo CD et le scheduler ne routent du
  trafic que vers des pods prêts.

### Injection des variables : `PUBLIC_*` au build, `PRIVATE_*` au runtime

La frontière la plus piégeuse est l'injection de configuration, et elle découle
directement de SvelteKit :

| Type            | Source SvelteKit      | Moment            | Mécanisme image                                                                        |
| --------------- | --------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| **`PUBLIC_*`**  | `$env/static/public`  | **figé au build** | **build-args** (`ARG` + `ENV` du `builder`), inlinés par vite/SvelteKit dans le bundle |
| **`PRIVATE_*`** | `$env/static/private` | **runtime**       | `environment:` / `Secret` du pod, jamais en dur dans l'image                           |

Les `PUBLIC_*` (endpoints publics, URLs de login, etc.) sont **inlinés au moment du
build** : ils doivent être fournis comme **build-args** à `docker build`, pas comme
variables d'environnement du conteneur — une `PUBLIC_*` posée au runtime serait
**ignorée**, le bundle étant déjà figé. À l'inverse, les valeurs **privées** (clés
d'API, tokens, secrets) sont lues à l'**exécution** par l'adapter Node et arrivent
via les `Secret`/`environment:` du pod — **jamais** dans l'image, donc jamais dans
une couche poussée au registry.

### Garde-fous (en plus de ceux ci-dessus)

- [`apps/sillage/Dockerfile`](https://github.com/univ-lehavre/atlas/blob/main/apps/sillage/Dockerfile)
  est la **référence recopiable** : toute nouvelle unité déployable repart de ce
  patron (multi-stage, `pnpm deploy`, `USER node`, healthcheck) plutôt que d'un
  `Dockerfile` ad hoc. Une divergence de forme entre images est traitée comme une
  dette à résorber vers le patron, pas comme une variation légitime.
- Le **contexte de build est la racine du monorepo** (le lockfile et les
  `package.json` workspace y vivent) ; le `Dockerfile` se passe via `-f`.
- Une `PUBLIC_*` qui doit varier par instance se passe en **build-arg** au moment de
  fabriquer l'image de cette instance ; une valeur **secrète** ne transite **jamais**
  par un `ARG`/`ENV` du `builder` (elle resterait dans l'historique des couches).
- Le **bump de version Node** se fait à `.nvmrc` **et** `ARG NODE_VERSION` dans la
  même PR ; les deux ne doivent pas diverger. `.nvmrc` est figé **au patch**
  (p. ex. `24.15.0`) pour une parité dev/prod exacte (facteur X), tandis que
  `engines.node` reste un **plancher de compatibilité** (`^24`) pour ne pas
  bloquer l'install — `engine-strict=true` — sur un patch 24.x différent.
- Les unités dont la config est runtime/publique (`atlas-dashboard`,
  `crf-dashboard`, service) ont une image sur ce patron, **construite et fumée en
  CI** puis **publiée sur GHCR** (tag SHA immuable + version, jamais `latest` en
  déploiement) — voir [ADR 0043](/atlas/decisions/0043-publication-images-ghcr/).
  Les apps qui lisent des secrets via `$env/static/private` (`amarre`, `ecrin`,
  `find-an-expert`, `sillage`) restent à migrer vers `$env/dynamic/private` avant
  d'être imageables ([#324](https://github.com/univ-lehavre/atlas/issues/324)) —
  `static/private` fige les valeurs au build, ce qui violerait la règle « aucun
  secret dans une image ».

## Évolution (2026-06-15) — Suivi de modèles (MLflow)

Le passage du MLOps au niveau 2 ([ADR 0062](/atlas/decisions/0062-mlops-niveau-2-tracking-drift-ct/))
ajoute un point de contact **Suivi de modèles** : un serveur **MLflow** déployé
**côté `cluster`** (ADR `cluster` séparé, sur le patron Dagster/Marquez), joignable
par l'application via `MLFLOW_TRACKING_URI`, avec **backend store CloudNativePG** et
**artefact store** sur le bucket S3 (convention `citation`). L'application — assets
Dagster de `dataops/` — **logue** ses runs d'embedding et **enregistre** le modèle au
registre ; l'instrumentation **dégrade proprement** (no-op) si `MLFLOW_TRACKING_URI`
est absent, comme le lineage sans `OPENLINEAGE_URL`. Cet ajout **ne modifie aucun point
de contact existant** : il en **crée un nouveau**, sur le même partage que Dagster
(orchestrateur côté cluster, code-location côté `atlas`).

## Évolution (2026-06-29) — Cache de flux (CNPG)

Le cache applicatif des flux ([ADR 0040](/atlas/decisions/0040-caches-flux-backing-service-vs-fichier/))
acquiert son back-end réel : un point de contact **Cache de flux** (ligne ajoutée au
tableau ci-dessus), servi par une **base logique `cache` sur le CloudNativePG existant**
— pas de nouvelle brique ([ADR cluster 0093](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0093-cache-flux-cnpg.md)).
Le cluster fournit base, rôle, Secret `pg-role-cache` et les variables `POSTGRES_CACHE_*`
(endpoint `postgres-cache`, déjà publié de son côté) ; l'application fournit
l'**adaptateur** (table clé-valeur + UPSERT + `pg_advisory_lock`,
[ADR 0085](/atlas/decisions/0085-cache-flux-postgres-package-partage/)). Le DSN utilise le
**nom court** `pg-rw.postgres` (le FQDN `*.svc.cluster.local` _timeout_ en prod). Cet ajout
**ne modifie aucun point de contact existant** : il en **crée un nouveau**, sur le même
CloudNativePG que `pgvector`.

## Évolution (2026-07-01) — Plancher `dbt-core` de la chaîne dbt (deepdiff)

La chaîne dbt des code-locations (`dagster-dbt==0.29.7`) tire `deepdiff` en
transitif via `dbt-common`. Une résolution ancienne figeait `citation-dagster`
sur `dbt-common 1.27.1` (`deepdiff<8` → GHSA-mw26-5g2v-hqw3 _critical_ /
GHSA-54jj-px8x-5w5q _high_), neutralisées par un override `deepdiff>=8,<9`
**porteur** ; `mediawatch-dagster` résolvait déjà `dbt-common 1.38.0`
(`deepdiff<9`), override **no-op**.

Le côté cluster a tranché le point d'interface ([ADR cluster
0006](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0006-matrice-de-versions-et-politique-de-bump.md),
[cluster#536](https://github.com/univ-lehavre/cluster/pull/536)) : **l'image
Dagster du cluster n'installe aucun dbt** — la chaîne vit entièrement côté
`atlas`. Le levier est donc le **plancher `dbt-core`**, pas l'image. Contrainte
figée : `dbt-common ≥ 1.34.2` (accepte `deepdiff<9`), obtenu via `dbt-core ≥
1.10.22` — **sans casser la parité `dagster-dbt 0.29.7 ↔ dagster 1.13.7`**
(inchangée) ni sortir de Python 3.10. `dbt-common 2.0.0` **interdit** (ré-épingle
`deepdiff<8`).

Application côté `atlas` (cette PR, garde-fou « même PR ») : `citation-dagster`
déclare un plancher **`dbt-core>=1.10.22`** explicite → re-lock en `dbt-core
1.11.11` / `dbt-common 1.38.0` / `deepdiff 8.6.2`, **aligné sur
`mediawatch-dagster`**. L'override `deepdiff>=8,<9` y devient un **no-op
défensif** (borne anti-`2.0.0`), conservé, symétrique des deux code-locations.
Aucun point de contact du contrat n'est modifié — c'est une **contrainte de
version d'un composant fourni**, tenue à jour ici comme l'exige le garde-fou
ci-dessus.

## Évolution (2026-07-02) — Déploiement événementiel (le push de code déclenche)

Le contrat disait, jusqu'ici, que le **déploiement réel** reste une action
_humaine_ validée sur le banc avant la prod (« Frontière de responsabilité » et
« Garde-fous » ci-dessus). Cette formulation est **amendée** : côté cluster, la
chaîne de déploiement est **événementielle** — un **push de code sur `atlas`**
est le **déclencheur automatique** (zéro geste manuel), et l'intervention
humaine se recentre sur la **revue de PR** (garde-fou GitOps en amont du merge),
plus sur un geste de déploiement.

**Ce qui ne change pas — la frontière ([ADR cluster 0094](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0094-frontiere-deploiement-applicatif.md)).**
`atlas` **déclare et fournit** (manifeste montant `code-location.manifest.yaml`,
placeholders `__CITATION_IMAGE__` / `__CITATION_IMAGE_DIGEST__` dans ses
manifestes) ; `cluster` **valide, instancie et remplit** (lit le manifeste,
build l'image, lit le digest, crée l'`Application` Argo CD). Le point « Images »
du contrat (taguées explicitement, jamais `latest`) tient toujours : le **tag
`:<revision>`** trace le lien commit→image (lisible), mais le **déploiement se
fait par digest `@sha256`** (ancre d'immuabilité — cf. les manifestes montants et
[ADR 0075](/atlas/decisions/0075-deploiement-prod-par-digest-injecte-cluster/)).

**Le « comment » vit côté cluster** ([ADR cluster 0095 §1.b](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0095-build-applicatif-evenementiel-in-cluster.md)),
qu'atlas ne duplique pas (neutralité de domaine). En bref : un `git push` sur le
repo `atlas` frappe un **webhook Gitea de build** (distinct du webhook de
déploiement qui alimente déjà Argo CD sur `cluster/apps`) → Argo Events dérive la
code-location du **chemin modifié** et la `revision` du commit → un build in-pod
pousse l'image au registry, en lit le **digest**, puis **écrit en retour** le
`@sha256` dans le repo GitOps `cluster/apps` → Argo CD réconcilie. Un filet
anti-perte d'événement compare périodiquement l'état déployé au dernier commit.

**Statut — mise en place.** Le **design** ci-dessus est le fonctionnement cible
de la chaîne ; la **preuve banc de bout en bout** (run from-scratch : push →
build → write-back digest → réconciliation) **est en cours** et n'est pas encore
établie. Cet amendement décrit l'architecture, pas un run validé. Aucun point de
contact du contrat n'est modifié — seule la **nature du déclencheur** (push
automatique vs geste humain) est corrigée, tenue à jour ici comme l'exige le
garde-fou « même PR ».
