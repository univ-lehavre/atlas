---
title: "0083 — Cache de flux : package partagé Effect adossé à Postgres (CNPG)"
---

## Contexte

L'[ADR 0040](/atlas/decisions/0040-caches-flux-backing-service-vs-fichier/) a posé la
**posture** : un cache applicatif n'est pas un fichier JSON local, c'est un _backing
service_ injecté par variable d'environnement, back-end choisi à l'exécution, fallback
fichier toléré en local mono-instance seulement. Elle a préparé les **points
d'injection** (`ATLAS_STATS_CACHE_PATH`, `CRF_LOGS_CACHE_PATH`, interface
`RefreshCoordinator`) sans embarquer d'infra, et a renvoyé le **branchement effectif**
au dépôt `cluster`.

Le cluster a livré sa part ([ADR cluster 0093](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0093-cache-flux-cnpg.md)) :
le cache n'est **pas** une nouvelle brique Redis mais une **base logique `cache` sur le
CloudNativePG existant** (sobriété) — base, rôle `cache`, Secret `pg-role-cache`,
endpoint `postgres-cache` au contrat, et les variables `POSTGRES_CACHE_*`
(`HOST=pg-rw.postgres`, `PORT`, `DB=cache`, `USER`, `PASSWORD`). L'ADR cluster 0093 note
explicitement que **l'adaptateur (table clé-valeur + UPSERT + `pg_advisory_lock`) vit
côté `atlas`**, et que `atlas` doit ajouter le point de contact `cache` à _son_ contrat —
tracé en [#443](https://github.com/univ-lehavre/atlas/issues/443) (et #150).

Trois faits, vérifiés dans le code, cadrent la décision :

- **L'interface de cache existe en double, non factorisée.** `atlas-stats`
  (`{savedAt, releases, packages, downloads}`) et `crf-logs` (`{savedAt, logs}`) ont
  chacune leur `readCache` / `writeCache` / `isCacheStale` — copies parallèles de
  `parseCache` / `isValidCache` / `resolveCachePath`, toutes **en fichier JSON**, TTL 24 h
  **calculé côté JS**.
- **Ces deux paquets sont aujourd'hui hors du socle Effect.** Ils n'ont **aucune
  dépendance `effect`** ; l'audit socle Effect du 2026-06-04 les classait même en
  **anti-objectif** (ne pas y faire entrer Effect « par principe »). Or fermer #443
  proprement — un cache distribué sûr en concurrence — demande un service injectable :
  exactement le rôle d'un `Context.Tag` + `Layer`. La posture anti-objectif, écrite avant
  que le cache ait un back-end réel, est **révisée ici** pour cette brique précise.
- **Le patron Postgres existe déjà.** `packages/citation/src/pg/` enveloppe `postgres.js`
  (~3.4.9) en Effect, avec migrations idempotentes et test d'intégration hermétique
  (image `@digest`, _self-skip_ sans Docker, [ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)).
  Le SQL attendu (table `cache(key, value JSONB, saved_at)`, UPSERT `ON CONFLICT`,
  `pg_advisory_lock`) est du Postgres standard, déjà spécifié par l'ADR cluster 0093.

## Décision

> **Le cache de flux est servi par un paquet partagé `@univ-lehavre/atlas-cache`,
> écrit en Effect (`Context.Tag` + `Layer`), offrant deux back-ends derrière une seule
> interface : fichier (fallback local mono-instance) et Postgres (CNPG du cluster). Les
> paquets `atlas-stats` et `crf-logs` cessent d'avoir leur propre implémentation : ils
> consomment ce paquet, et entrent donc dans le socle Effect — révision assumée de
> l'anti-objectif de l'audit. La sélection du back-end est explicite (un DSN
> `postgres://…` reconnu dans la variable d'environnement → Postgres ; sinon fichier),
> jamais une détection magique.**

### Un paquet partagé plutôt que deux copies

`atlas-stats` et `crf-logs` dupliquent aujourd'hui la même mécanique. On extrait un
paquet `packages/cache` (`@univ-lehavre/atlas-cache`) portant un type générique
`Cache<T> = { savedAt: number; data: T }`, l'interface de service `CacheStore`
(`Context.Tag`), et **un seul** cœur SQL à tester hermétiquement. Les deux consommateurs
ne fournissent que leur type de payload (`AtlasStatsCache`, `CacheFile`) et la clé sous
laquelle ils stockent. La divergence (copies de `parseCache`/`isValidCache`) disparaît,
et la surface de test Postgres n'est écrite **qu'une fois**.

### Effect, et la révision de l'anti-objectif

Un cache distribué sûr en concurrence est précisément un **service à dépendances
injectées** (connexion, horloge, verrou) : le modèle `Context.Tag`/`Layer` du socle
([ADR 0045](/atlas/decisions/0045-runtime-central-effect/)) lui va, et réutilise le
runtime central et le wrapper `postgres.js` de `citation/pg`. L'audit socle Effect
écartait `atlas-stats`/`crf-logs` quand ils n'étaient que de la lecture/écriture de
fichier — un anti-objectif **par valeur**, légitime à l'époque. Le besoin a changé : ces
paquets acquièrent un back-end réseau concurrent. On **révise** donc cet anti-objectif
**pour la seule brique cache**, sans rouvrir le reste (le bundle client reste sans
`effect` ; `atlas-errors` n'est pas touché). L'interface publique des consommateurs reste
en `Promise` : l'Effect vit dans le paquet, exposé via `Effect.runPromise` à la
frontière — les ~12 sites appelant `readCache`/`writeCache` ne changent pas de signature.

### Sélection explicite, jamais magique

Conformément à l'[ADR 0040](/atlas/decisions/0040-caches-flux-backing-service-vs-fichier/)
(« pas de détection magique »), le back-end se choisit sur la **valeur** de la variable
d'environnement : si elle correspond à `postgres://…` (ou `postgresql://…`), le back-end
Postgres est armé ; sinon, c'est un chemin de fichier, comportement actuel **strictement
inchangé**. Un environnement non configuré retombe sur fichier/in-memory, **jamais
silencieusement** sur un cache partagé. Le DSN se compose des `POSTGRES_CACHE_*` à la
convention du dépôt (`postgres://${user}:${password}@${host}:${port}/${db}`), avec le
**nom court `pg-rw.postgres`** — jamais le FQDN `*.svc.cluster.local`, qui _timeout_ en
prod (ADR cluster 0093).

### Le TTL et le bridage portés par `saved_at`, une seule source

Le back-end stocke `saved_at` ; `isCacheStale` reste en JS mais juge **sur le `saved_at`
relu du back-end**, jamais sur une horloge locale parallèle — pas de double-vérité. Le
bridage de cadence (`RefreshCoordinator`) place sa clé `lastRefreshAt` dans la **même
table** sous `pg_advisory_lock`, fermant la déduplication d'actualisation en vol en
multi-instance.

### Frontière cluster honorée dans la même PR

Le point de contact `cache` est ajouté au contrat
[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) **dans la même PR** (garde-fou
« même PR »), miroir exact de l'endpoint `postgres-cache` déjà publié côté cluster.
L'infra (base, rôle, Secret, NetworkPolicy) **n'est pas recréée** dans `atlas` : elle
relève du cluster (frontière [ADR 0077](/atlas/decisions/0077-topologie-deux-depots-cluster-atlas/)).

## Alternatives écartées

- **Dupliquer l'adaptateur dans chaque paquet** (statu quo des deux copies). Écartée :
  perpétue la divergence et **double** la surface de test hermétique Postgres, pour un SQL
  identique.
- **Garder `atlas-stats`/`crf-logs` en Promise pur, adaptateur Postgres sans Effect.**
  Écartée : on réécrirait un wrapper `postgres.js` + gestion de pool + erreurs typées que
  `citation/pg` fournit déjà en Effect ; un cache concurrent est un service injectable, le
  cas d'usage canonique de `Context.Tag`/`Layer`.
- **Tout migrer `atlas-stats`/`crf-logs` et leurs consommateurs en Effect de bout en
  bout.** Écartée à ce stade : ouvrirait un chantier de l'ampleur du socle sur les ~12
  sites consommateurs sans bénéfice pour #443 ; la façade `Promise` suffit. Le cœur est
  Effect, la frontière reste Promise.
- **Une nouvelle brique Redis.** Écartée par l'ADR cluster 0093 (sobriété : réutiliser le
  CloudNativePG existant).

## Statut

Accepted (2026-06-29). **Exécute** l'[ADR 0040](/atlas/decisions/0040-caches-flux-backing-service-vs-fichier/)
(le back-end Postgres réel derrière l'interface) et **révise** l'anti-objectif de l'audit
socle Effect du 2026-06-04 pour la seule brique cache (`atlas-stats`/`crf-logs` y entrent
via `@univ-lehavre/atlas-cache`). **S'appuie sur** l'[ADR cluster 0093](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0093-cache-flux-cnpg.md)
(infra CNPG fournie), l'[ADR 0045](/atlas/decisions/0045-runtime-central-effect/) (runtime
central), l'[ADR 0057](/atlas/decisions/0057-reproductibilite-tests-hermetiques/)
(hermétisme du test pg). **Met à jour** le contrat
[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) (point de contact `cache`)
dans la même PR. Porte [#443](https://github.com/univ-lehavre/atlas/issues/443).

## Conséquences

**Bénéfices.** Le cache de flux devient un **backing service partagé, atomique et sûr en
concurrence** (UPSERT + advisory lock), fermant l'écart VIII pour de bon. La duplication
`atlas-stats`/`crf-logs` est **résorbée** en un paquet unique. Le SQL Postgres n'est testé
**qu'une fois**, hermétiquement.

**Prix à payer.** Un **nouveau paquet** à maintenir (`packages/cache`) et une dépendance
`postgres.js` ajoutée. Une **brique de plus entre dans Effect** (révision d'anti-objectif
assumée) — bornée au cache, frontière publique tenue en Promise pour ne pas contaminer les
consommateurs. Un **back-end de plus** derrière l'interface (fichier + Postgres).

**Garde-fous.** **Sélection explicite** par DSN (jamais de détection magique, ADR 0040).
**Fallback fichier** strictement inchangé en local mono-instance — les tests existants
restent verts sans configuration. **TTL à source unique** (`saved_at` du back-end).
**Nom court** `pg-rw.postgres` obligatoire (timeout FQDN en prod). **Test hermétique**
image `@digest` + _self-skip_ sans Docker (ADR 0057), jamais un vrai serveur en CI.
**Contrat répercuté dans la même PR** (ADR 0033). L'infra reste **hors `atlas`** (frontière
ADR 0077).
