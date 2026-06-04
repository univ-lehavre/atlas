---
title: Plan de résorption — audit cloud-native 2026-06-04
---

> Date du plan : 2026-06-04. Audit de référence : [Audit cloud-native 2026-06-04](/atlas/audit/2026-06-04-cloud-native/). Écarts tracés en issues GitHub #304 à #309 (milestone _Transverse — Qualité applicative_).

## Introduction

### Périmètre

- Les **6 écarts actionnables** de l'audit cloud-native du 2026-06-04, classés sur les 12 facteurs de Twelve-Factor et leurs extensions modernes :
  - #304 — arrêt propre du service Hono (SIGTERM/SIGINT) — facteur **IX Disposability**.
  - #305 — logs en flux stdout plutôt qu'en fichiers (`crf-logs`) — facteur **XI Logs**.
  - #306 — caches non sûrs en multi-instance (dashboards) — facteur **VIII Concurrency**.
  - #307 — middleware d'authentification du service CRF — extension **Sécurité**.
  - #308 — images de déploiement (5 apps + service) — facteurs **V / VII / X**.
  - #309 — généralisation de la télémétrie et de l'error-tracking — extension **Observabilité**.
- **Hors périmètre** : l'infrastructure du cluster (dépôt `cluster` : Ansible, addons, manifestes Argo CD). Ce plan reste dans le **dépôt de code** `atlas` : code applicatif, Dockerfiles, ADR. Le contrat avec le cluster est tenu par [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/).
- **Non bloquant en l'état** : l'audit conclut qu'aucun écart ne bloque l'usage actuel (développement sur fixtures). Le plan cadre le **durcissement avant un déploiement multi-instance**.

### Principes directeurs

- **Non-régression** : à chaque étape, `pnpm ci:checks && pnpm ci:audit && pnpm docs:build` doit rester vert.
- **Filet d'abord** : rendre les services **stateless et arrêtables proprement AVANT de les containeriser** ; cadrer les décisions structurantes par **ADR AVANT d'écrire le code** qu'elles gouvernent. On ne containerise pas une app qui écrit encore un cache fichier local non synchronisé.
- **Agentique-ready** : chaque étape est exécutable par un agent Claude sans question à l'utilisateur. En cas d'ambiguïté irréductible : stop avec rapport de blocage (issue `blocker:`), sans deviner.
- **Idempotence** : relancer une étape déjà faite est un no-op observable (vérifier l'état cible — lecture, `grep` — avant d'écrire).
- **Une PR par phase** (sauf découpage explicitement prévu pour les phases volumineuses).
- **Commits** : Conventional Commits, scope ∈ allowed-scopes de `commitlint.config.js` (vérifier la liste avant chaque commit : `grep -A 200 'scope-enum' commitlint.config.js`). **Attention** : `atlas-dashboard` **n'est pas** un scope valide — pour ses changements de cache, utiliser le scope `infra` (paquet de cache) ou `infra` (état module de l'app), conformément à l'usage historique. **Pas de `Co-Authored-By`**.
- **Hooks lefthook JAMAIS bypassés** : pas de `--no-verify`, `LEFTHOOK=0`, `--no-gpg-sign`. Si un hook bloque, fixer la cause en racine.

### Vue d'ensemble des phases

| Phase | Titre                                                  | Issues     | Facteurs           | Décision structurante  | Risque | Effort |
| ----- | ------------------------------------------------------ | ---------- | ------------------ | ---------------------- | ------ | ------ |
| 0     | Cadrage par ADR (décisions structurantes d'abord)      | — (ADR)    | transverse         | Oui (0040, 0041, 0033) | nul    | M      |
| 1     | Arrêt propre du service CRF                            | #304       | IX                 | Non                    | faible | S      |
| 2     | Caches stateless : logs en flux + accès concurrent sûr | #305, #306 | XI, VIII, VI       | Cadré par 0040         | moyen  | L      |
| 3     | Authentification du service CRF                        | #307       | ext. Sécurité      | Cadré par 0041         | élevé  | M      |
| 4     | Images de déploiement (5 apps + service CRF)           | #308       | V / VII / X        | Cadré par 0033         | moyen  | L      |
| 5     | Généralisation de l'observabilité                      | #309       | ext. Observabilité | Non                    | moyen  | M      |

**Graphe de dépendances retenu** (filet d'abord) : `0 (ADR) → 1 (#304) → 2 (#305+#306) → 3 (#307) → 4 (#308) → 5 (#309)`. Les phases ne sont pas strictement séquentielles partout (#304 et le cadrage ADR sont indépendants), mais l'ordre ci-dessus respecte dépendance **et** risque croissant.

---

## Phase 0 — Cadrage par ADR (décisions structurantes d'abord)

**Objectif.** Trancher par ADR les trois questions d'architecture qui gouvernent les phases suivantes, **avant** d'écrire le code qu'elles cadrent. Esprit [ADR 0028](/atlas/decisions/0028-documentation-verifiable/) : décision vérifiable et datée.
**Dépendances.** Aucune.
**Issues couvertes.** Aucune directement (prépare #305, #306, #307, #308).
**Parallélisable ?** Oui — les trois ADR sont indépendantes.
**Critère de sortie de phase.** `pnpm docs:build` vert ; les ADR 0040 et 0041 existent et sont référencées dans [l'index des décisions](/atlas/decisions/) et son [parcours](/atlas/decisions/parcours/) ; la section Docker est ajoutée à l'ADR 0033.

### Étape 0.1 — ADR 0040 « Caches applicatifs : flux + backing-service vs fichier local »

- **Goal:** Décider le pattern de persistance des caches en cloud-native. Aujourd'hui `packages/crf-logs/src/cache.ts` et `packages/atlas-stats/src/cache.ts` écrivent un JSON local (`.crf-stats.json`, `.atlas-stats.json`) sans verrou — non sûr en multi-instance.
- **Files (read):** `packages/crf-logs/src/cache.ts`, `packages/atlas-stats/src/cache.ts`, `docs/src/content/docs/decisions/index.md`, `docs/src/content/docs/decisions/parcours.md`.
- **Files (write):** `docs/src/content/docs/decisions/0040-caches-flux-vs-fichier.md`, `docs/src/content/docs/decisions/index.md`, `docs/src/content/docs/decisions/parcours.md`.
- **Invariants à préserver:** ADR existants non amendés ailleurs ; numérotation ADR continue (0040 = prochain libre après 0039).
- **Validation:** `pnpm docs:build`.
- **Done criteria:** ADR 0040 acte : caches = flux d'événements + **backing-service injectable** (résolu par variable d'environnement), avec scénarios **dev** (in-memory), **test** (mock), **prod** (Redis ou PostgreSQL). L'ADR note qu'`atlas-stats` a déjà l'indirection `ATLAS_STATS_CACHE_PATH` et que `crf-logs` devra l'acquérir. Implications listées pour #305 et #306.
- **Issues cadrées:** #305, #306.
- **PR title suggéré:** `docs: cache pattern flux vs file in cloud-native (ADR 0040)`

### Étape 0.2 — ADR 0041 « Stratégie d'authentification du service CRF »

- **Goal:** Décider la stratégie d'auth du service Hono `services/crf` qui expose une API de données sensibles **sans aucun contrôle d'accès** aujourd'hui (`services/crf/src/server/app.ts` n'a que rate-limit + CORS).
- **Files (read):** `services/crf/src/server/app.ts`, `packages/auth/` (hooks SvelteKit existants), `docs/src/content/docs/decisions/0030-rgpd-profilage-collaborations.md`, `docs/src/content/docs/decisions/0033-contrat-interface-cluster.md`.
- **Files (write):** `docs/src/content/docs/decisions/0041-auth-service-crf.md`, `docs/src/content/docs/decisions/index.md`, `docs/src/content/docs/decisions/parcours.md`.
- **Invariants à préserver:** Numérotation continue (0041 après 0040).
- **Validation:** `pnpm docs:build`.
- **Done criteria:** ADR 0041 tranche entre Bearer stateless / mTLS / OAuth / session BaaS, justifie selon l'exposition cluster, et acte que **les packages auth existants (`packages/auth`) sont des hooks SvelteKit incompatibles Hono** → middleware Hono dédié à créer. Impacts multi-instance et invalidation de cache documentés.
- **Issues cadrées:** #307.
- **PR title suggéré:** `docs: CRF service authentication strategy (ADR 0041)`

### Étape 0.3 — Amender ADR 0033 avec la stratégie d'images de déploiement

- **Goal:** Formaliser **une fois** les choix d'image (recopiables sur les 6 unités) à partir du seul Dockerfile existant `apps/sillage/Dockerfile`. Ce n'est pas une ADR nouvelle : c'est une section du contrat cluster.
- **Files (read):** `apps/sillage/Dockerfile`, `.nvmrc`, `docs/src/content/docs/decisions/0033-contrat-interface-cluster.md`.
- **Files (write):** `docs/src/content/docs/decisions/0033-contrat-interface-cluster.md` (nouvelle section « Stratégie d'images de déploiement »).
- **Invariants à préserver:** Contrat existant inchangé ; ajout en bloc « Évolution » daté 2026-06-04.
- **Validation:** `pnpm docs:build`.
- **Done criteria:** Section documentant : version Node alignée `.nvmrc` (24) via `ARG NODE_VERSION`, multi-stage builder/runner, `pnpm deploy --prod`, healthcheck (probe Kubernetes), `USER node`, `PORT`/`HOST` runtime, injection `PUBLIC_*` en build-args (figés au build SvelteKit) vs `PRIVATE_*` en env runtime. Référence explicite à `apps/sillage/Dockerfile` comme patron.
- **Issues cadrées:** #308.
- **PR title suggéré:** `docs: document docker image strategy in ADR 0033`

---

## Phase 1 — Arrêt propre du service CRF

**Objectif.** Le service Hono `services/crf` capture SIGTERM/SIGINT, ferme proprement son serveur HTTP (arrête d'accepter, draine les connexions actives) avant que l'OS ne tue le processus.
**Dépendances.** Aucune (écart autonome). Cadrage ADR non requis.
**Issues couvertes.** #304 (facteur IX Disposability).
**Parallélisable ?** Indépendante de la Phase 0 ; peut démarrer en parallèle.
**Critère de sortie de phase.** Le service répond à un `SIGTERM` par un shutdown gracieux ; `pnpm test --filter=@univ-lehavre/atlas-crf` vert ; `pnpm ci:checks` vert.

### Étape 1.1 — Enregistrer les handlers SIGTERM/SIGINT sur le serveur Hono

- **Goal:** Aujourd'hui `services/crf/src/server/index.ts` appelle `serve({ fetch, port })` **sans capturer la valeur de retour** ni enregistrer de handler d'arrêt. Seul `telemetry.ts` (lignes 125-126) enregistre `process.once('SIGTERM'/'SIGINT')` pour flusher le SDK OTel. Capturer le `server` retourné par `serve()` et enregistrer `process.once('SIGTERM'/'SIGINT', …)` pour `server.close()` avant la sortie.
- **Files (read):** `services/crf/src/server/index.ts`, `services/crf/src/server/telemetry.ts` (pattern de référence du `process.once`), `services/crf/src/server/app.ts`.
- **Files (write):** `services/crf/src/server/index.ts` (et, si la logique de shutdown est extraite pour testabilité, un nouveau `services/crf/src/server/shutdown.ts` + `shutdown.test.ts`).
- **Invariants à préserver:** Le démarrage du serveur reste inchangé pour l'usage CLI (`crf-server`). L'ordre télémétrie-puis-serveur est conservé. Le flush OTel de `telemetry.ts` reste compatible (les deux handlers coexistent via `process.once`).
- **Validation:**
  - `pnpm test --filter=@univ-lehavre/atlas-crf`.
  - Test manuel reproductible : démarrer le service, lui envoyer `SIGTERM`, vérifier qu'il refuse les nouvelles connexions et se termine avec un code 0 (un test sur la fonction de shutdown extraite couvre ce comportement sans process réel).
  - `pnpm ci:checks`.
- **Done criteria:** `server` capturé depuis `serve()` ; `process.once('SIGTERM', …)` et `process.once('SIGINT', …)` appellent `server.close()` ; un test unitaire couvre l'invocation du shutdown. Comportement idempotent : un second signal ne relance pas la fermeture.
- **Issues résolues:** #304.
- **Soft-unlock:** #308 (une image se déploie sur un service arrêtable proprement), #309 (le flush OTel devient pertinent).
- **PR title suggéré:** `fix(crf): graceful shutdown on sigterm/sigint`

---

## Phase 2 — Caches stateless : logs en flux + accès concurrent sûr

**Objectif.** Rendre les dashboards **stateless** : les logs CRF sortent en flux (plus de fichier `.crf-stats.json` persistant côté app), et les caches restants sont sûrs en multi-instance (plus de fichier JSON local sans verrou, plus d'état mémoire `refreshInFlight` non partagé). C'est le filet à poser **avant** la containerisation (#308).
**Dépendances.** Phase 0 close (ADR 0040 décide le pattern flux/backing-service). #304 recommandé d'abord (un shutdown propre évite les races à l'arrêt).
**Issues couvertes.** #305 (XI Logs), #306 (VIII Concurrency, et VI Processes pour `refreshInFlight`). **Co-design** : les deux issues partagent les fichiers cache et redéfinissent ensemble l'interface du cache.
**Parallélisable ?** Non — #305 et #306 touchent les mêmes fichiers (`crf-logs/cache.ts`, `atlas-stats/cache.ts`) ; à traiter en une phase, éventuellement en deux PR ordonnées (logs flux, puis sûreté concurrente).
**Critère de sortie de phase.** Plus aucune écriture de cache fichier non synchronisée dans le périmètre dashboard ; les 4 endpoints du crf-dashboard (stats, logs, actualisation, home) fonctionnent encore ; `pnpm test --filter=@univ-lehavre/atlas-crf-dashboard --filter=@univ-lehavre/atlas-dashboard` vert ; `pnpm ci:checks` vert.

### Étape 2.1 — Refondre `crf-logs` : logs en flux + backing-service injectable

- **Goal:** Conformément à l'ADR 0040, refactorer `packages/crf-logs/src/cache.ts` pour émettre les logs en flux/événements plutôt qu'en fichier `.crf-stats.json` codé en dur (`path.resolve(process.cwd(), ".crf-stats.json")`, ligne 5), et rendre le backing-service **injectable par environnement** (à la manière d'`atlas-stats` qui lit déjà `ATLAS_STATS_CACHE_PATH`). Préserver la sémantique de cache (TTL 24 h via `isCacheStale`, fraîcheur).
- **Files (read):** `packages/crf-logs/src/cache.ts`, `packages/crf-logs/src/index.ts` (exports publics `readCache`/`writeCache`), `packages/atlas-stats/src/cache.ts` (référence d'indirection par env).
- **Files (write):** `packages/crf-logs/src/cache.ts`, tests associés ; `packages/crf-logs/src/index.ts` si l'API publique évolue.
- **Invariants à préserver:** API publique consommée par le dashboard (`readCache`, `writeCache`, `isCacheStale`) : conserver la signature ou fournir une adaptation. La sémantique TTL et la validation de fraîcheur restent identiques. `atlas-crf-logs` ne dépend d'aucun paquet (seulement devDeps) : ne pas introduire de dépendance lourde non actée par l'ADR.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-crf-logs && pnpm ci:checks`.
- **Done criteria:** Plus d'écriture de fichier JSON local par défaut dans `crf-logs` ; backing-service résolu par env (in-memory en dev, mock en test). Tests couvrant lecture/écriture/staleness via la nouvelle indirection.
- **Issues résolues:** #305 (partiel — package).
- **PR title suggéré:** `refactor(crf-logs): stream logs to stdout with injectable backing service`

### Étape 2.2 — Adapter les 4 endpoints du crf-dashboard à la nouvelle interface

- **Goal:** Mettre à jour les consommateurs de `crf-logs` dans le crf-dashboard pour la nouvelle interface flux/backing-service, sans changer le comportement observable de l'UI.
- **Files (read):** `apps/crf-dashboard/src/routes/+page.server.ts`, `apps/crf-dashboard/src/routes/api/logs/+server.ts`, `apps/crf-dashboard/src/routes/api/stats/+server.ts`, `apps/crf-dashboard/src/routes/actualisation/+page.server.ts`, `apps/crf-dashboard/src/lib/patches.ts`.
- **Files (write):** ces fichiers d'endpoints/loaders.
- **Invariants à préserver:** Sémantique des 4 routes (stats, logs, actualisation, home). Risque identifié : si la nouvelle implémentation omet un événement, `readCache()` peut renvoyer `null` au lieu d'un cache stale valide — couvert par l'étape 2.4.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-crf-dashboard && pnpm ci:checks`.
- **Done criteria:** Les 4 endpoints consomment la nouvelle interface ; aucune référence résiduelle au fichier `.crf-stats.json`.
- **Issues résolues:** #305 (finalisation dashboard).
- **PR title suggéré:** `refactor(crf-dashboard): consume streamed logs interface`

### Étape 2.3 — Sécuriser l'accès concurrent : `atlas-stats` + état `refreshInFlight`

- **Goal:** Éliminer les races multi-instance restantes côté atlas-dashboard : (a) `packages/atlas-stats/src/cache.ts` écrit `.atlas-stats.json` sans verrou (`writeCache`, lignes 24-29) ; (b) `apps/atlas-dashboard/src/routes/api/refresh/+server.ts` (ligne 9) garde `let refreshInFlight: Promise … | null = null` au niveau module — non partagé entre instances. Appliquer la décision de l'ADR 0040 (backing-service partagé) pour rendre l'état d'actualisation et le cache sûrs en multi-instance.
- **Files (read):** `packages/atlas-stats/src/cache.ts`, `apps/atlas-dashboard/src/routes/api/refresh/+server.ts`, `apps/atlas-dashboard/src/lib/cache.ts` (réexport vers atlas-stats).
- **Files (write):** `packages/atlas-stats/src/cache.ts` (synchronisation / backing-service selon ADR 0040), `apps/atlas-dashboard/src/routes/api/refresh/+server.ts` (déporter `refreshInFlight`/`lastRefreshAt` vers un mécanisme partagé), tests associés.
- **Invariants à préserver:** API publique d'`atlas-stats` (`readCache`/`writeCache`/`isCacheStale`), le throttling `MIN_REFRESH_INTERVAL_MS`, la résolution `ATLAS_STATS_CACHE_PATH` existante.
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-stats --filter=@univ-lehavre/atlas-dashboard && pnpm ci:checks`. **Scope commit** : `atlas-stats` pour le package, `infra` pour l'état de l'app atlas-dashboard (le scope `atlas-dashboard` n'existe pas dans commitlint).
- **Done criteria:** Plus d'écriture de cache non synchronisée ni d'état mémoire `refreshInFlight` non partagé dans le périmètre atlas-dashboard ; comportement de throttling préservé.
- **Issues résolues:** #306.
- **PR title suggéré:** `fix(infra): concurrency-safe cache and refresh state`

### Étape 2.4 — Filet de non-régression E2E des endpoints dashboard

- **Goal:** Garantir que stats, logs, actualisation et home continuent de servir les bonnes données après la refonte (recommandation explicite des notes de dépendance #305). Couvre le risque « `null` au lieu de cache stale ».
- **Files (read):** tests existants du crf-dashboard, `apps/crf-dashboard/src/lib/patches.test.ts`.
- **Files (write):** tests d'intégration du crf-dashboard validant les 4 endpoints (et un smoke équivalent côté atlas-dashboard pour `refresh`).
- **Invariants à préserver:** Pas de modification de code applicatif dans cette étape (tests seulement).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-crf-dashboard --filter=@univ-lehavre/atlas-dashboard` ; exécuter 3 fois pour confirmer la stabilité.
- **Done criteria:** Chaque endpoint a un test couvrant le chemin nominal et le chemin cache-stale ; suite verte 3 fois de suite.
- **Issues résolues:** clôture conjointe de #305 et #306 (filet).
- **PR title suggéré:** `test(crf-dashboard): regression suite for streamed cache endpoints`

---

## Phase 3 — Authentification du service CRF

**Objectif.** Toute route nominative de `services/crf` exige une authentification, conformément à [ADR 0030](/atlas/decisions/0030-rgpd-profilage-collaborations/) et à la stratégie actée en ADR 0041. Aujourd'hui `services/crf/src/server/app.ts` n'a que rate-limit + CORS : l'API est ouverte.
**Dépendances.** Phase 0 close (ADR 0041). #304 (le shutdown propre doit fermer les connexions authentifiées sans les couper brutalement). **Risque élevé** : exposer cette API sans auth en prod = fuite de données sensibles.
**Issues couvertes.** #307 (extension Sécurité).
**Parallélisable ?** Non — bloc cohérent.
**Critère de sortie de phase.** Les routes `/api/v1/*` renvoient 401 sans credentials valides et 200 avec ; `pnpm test --filter=@univ-lehavre/atlas-crf` vert ; `pnpm ci:checks` vert.

### Étape 3.1 — Middleware d'authentification Hono dédié

- **Goal:** Implémenter le middleware d'auth décidé par l'ADR 0041 sur `services/crf/src/server/app.ts`, appliqué aux routes sensibles (`/api/v1/project`, `/api/v1/records`, `/api/v1/users`). Les packages `packages/auth` étant des hooks SvelteKit incompatibles Hono, créer un middleware Hono natif.
- **Files (read):** `services/crf/src/server/app.ts`, `services/crf/src/server/env.ts`, `services/crf/src/server/middleware/rate-limit.ts` (patron de middleware existant), `docs/src/content/docs/decisions/0041-auth-service-crf.md`.
- **Files (write):** `services/crf/src/server/middleware/auth.ts` + `auth.test.ts`, `services/crf/src/server/app.ts` (branchement du middleware), `services/crf/src/server/env.ts` (lecture des credentials/secret selon ADR 0041), `.env*.example` du service.
- **Invariants à préserver:** `/health` reste public (probe). Le rate-limiter, le CORS, le `traceBlocker` et la gestion OpenAPI restent en place. Aucun secret en dur (lecture par env, conforme facteur III déjà appliqué).
- **Validation:** `pnpm test --filter=@univ-lehavre/atlas-crf` ; tests dédiés 401 (sans/avec credentials invalides) et 200 (credentials valides) sur chaque route nominative ; `pnpm ci:checks` ; `pnpm audit:security`.
- **Done criteria:** Toutes les routes nominatives exigent l'auth ; `/health` reste ouvert ; secrets injectés par env. ADR 0041 référencée dans le code du middleware.
- **Issues résolues:** #307.
- **Unlock:** #309 (l'observabilité pourra journaliser les échecs d'auth) ; prérequis sécurité de #308.
- **PR title suggéré:** `feat(crf): authentication middleware on hono service`

---

## Phase 4 — Images de déploiement (5 apps + service CRF)

**Objectif.** Produire les Dockerfiles manquants pour `amarre`, `atlas-dashboard`, `crf-dashboard`, `ecrin`, `find-an-expert` (le 5ᵉ Dockerfile SvelteKit, `sillage`, existe déjà) et pour le service `services/crf`, en répliquant le patron éprouvé `apps/sillage/Dockerfile`.
**Dépendances.** Phases 1, 2, 3 closes : on ne containerise qu'un service arrêtable proprement (#304), stateless (#305/#306) et authentifié (#307). Cadrage : section Docker de l'ADR 0033 (Phase 0). Aligner le runtime Node sur `.nvmrc` (24).
**Issues couvertes.** #308 (facteurs V / VII / X).
**Parallélisable ?** Les 6 Dockerfiles sont indépendants entre eux mais à traiter en PR cohérentes (1 par unité ou par lot homogène apps SvelteKit / service).
**Critère de sortie de phase.** Chaque unité a une image qui build et répond à son healthcheck ; `pnpm ci:checks` vert ; `pnpm audit:structure` vert.

### Étape 4.1 — Dockerfiles des 5 apps SvelteKit restantes

- **Goal:** Créer `Dockerfile` pour `amarre`, `atlas-dashboard`, `crf-dashboard`, `ecrin`, `find-an-expert` (5 apps SvelteKit hors sillage déjà fait), en recopiant le multi-stage de `apps/sillage/Dockerfile` (base corepack/pnpm, deps frozen-lockfile, builder + `pnpm deploy --prod`, runner Alpine, `USER node`, healthcheck, `ARG NODE_VERSION=24`). Adapter les `PUBLIC_*` (build-args) et le `PORT` de chaque app.
- **Files (read):** `apps/sillage/Dockerfile` (patron), `apps/*/package.json` (deps workspace, `PUBLIC_*` lus, port), section Docker de l'ADR 0033.
- **Files (write):** `apps/amarre/Dockerfile`, `apps/atlas-dashboard/Dockerfile`, `apps/crf-dashboard/Dockerfile`, `apps/ecrin/Dockerfile`, `apps/find-an-expert/Dockerfile` ; `.dockerignore` si absent.
- **Invariants à préserver:** Le contexte de build reste la racine du monorepo (lockfile + workspace). `PUBLIC_*` figés au build, `PRIVATE_*` injectés au runtime (jamais en dur). Pas de root dans le runner.
- **Validation:** Pour chaque app, `docker build -f apps/<app>/Dockerfile -t <app>-app .` réussit ; le conteneur démarre et le healthcheck passe. `pnpm audit:structure` vert. **Scope commit** : `amarre`, `crf-dashboard`, `ecrin`, `find-an-expert` valides ; pour atlas-dashboard utiliser `infra` (scope `atlas-dashboard` inexistant).
- **Done criteria:** 5 Dockerfiles présents et fonctionnels, cohérents avec le patron sillage et l'ADR 0033.
- **Issues résolues:** #308 (partiel — apps).
- **PR title suggéré:** `build: deployment images for remaining sveltekit apps`

### Étape 4.2 — Dockerfile du service CRF (Hono)

- **Goal:** Créer `services/crf/Dockerfile`. Particularités : service Hono pur (pas d'adapter SvelteKit), lit `PORT` via `env.ts`, doit embarquer le graceful shutdown (#304) et l'auth (#307). Probe sur `/health` (route publique).
- **Files (read):** `apps/sillage/Dockerfile` (patron multi-stage), `services/crf/src/server/env.ts` (PORT), `services/crf/package.json`.
- **Files (write):** `services/crf/Dockerfile`, `.dockerignore` du service si nécessaire.
- **Invariants à préserver:** `USER node`, secrets d'auth (#307) injectés par env au runtime jamais en build. Healthcheck sur `/health`. Node aligné `.nvmrc`.
- **Validation:** `docker build -f services/crf/Dockerfile -t crf-service .` réussit ; conteneur démarre, `/health` répond, `SIGTERM` provoque un arrêt gracieux, une requête sans credentials renvoie 401. `pnpm audit:structure` vert.
- **Done criteria:** Image CRF fonctionnelle, healthcheck `/health` vert, shutdown gracieux observé, auth active.
- **Issues résolues:** #308 (finalisation — service).
- **PR title suggéré:** `build(crf): deployment image for hono service`

---

## Phase 5 — Généralisation de l'observabilité

**Objectif.** Étendre l'observabilité au-delà de l'état actuel (OpenTelemetry sur `services/crf` ; Sentry sur 3 apps seulement : amarre, ecrin, find-an-expert) : error-tracking sur les 3 apps restantes (atlas-dashboard, crf-dashboard, sillage) et le service CRF, plus exploitation des hooks de shutdown pour un flush propre. **Pas d'ADR** : généralisation d'un pattern déjà voté.
**Dépendances.** Phase 1 close (#304 : le flush OTel n'est pertinent qu'avec un shutdown gracieux). Bénéficie de la Phase 4 (#308 : variables `OTEL_*` injectées par l'image). Peut journaliser les échecs d'auth de la Phase 3.
**Issues couvertes.** #309 (extension Observabilité).
**Parallélisable ?** Les ajouts par app sont indépendants ; le bootstrap Sentry doit être robuste (no-op si DSN absent).
**Critère de sortie de phase.** Les 6 apps et le service ont une stratégie d'error-tracking cohérente ; aucun crash de bootstrap si le collecteur/DSN est absent ; `pnpm ci:checks` vert.

### Étape 5.1 — Généraliser l'error-tracking aux 3 apps restantes et au service CRF

- **Goal:** Ajouter `@sentry/sveltekit` (init, breadcrumbs, capture) à `atlas-dashboard`, `crf-dashboard`, `sillage`, à l'image des 3 apps déjà équipées (amarre, ecrin, find-an-expert), et un error-tracking au service CRF. Init **no-op safe** si le DSN est absent ou mal formé (ne jamais casser le bootstrap).
- **Files (read):** `apps/amarre/`, `apps/ecrin/`, `apps/find-an-expert/` (intégration Sentry de référence : `package.json`, hooks), `apps/atlas-dashboard/`, `apps/crf-dashboard/`, `apps/sillage/`, `services/crf/src/server/`.
- **Files (write):** intégration Sentry des 3 apps cibles (`package.json`, hooks client/serveur), error-tracking du service CRF, `.env*.example` (DSN).
- **Invariants à préserver:** Init opt-in par env (DSN runtime), no-op si absent — risque identifié de crash du bootstrap sur DSN mal forgée. La télémétrie OTel existante du service (`telemetry.ts`, déjà testée) reste intacte ; OTel et Sentry cohabitent sans compétition.
- **Validation:** `pnpm test` des apps modifiées ; vérifier que le démarrage **sans** DSN ne lève pas ; `pnpm ci:checks`. **Scope commit** : `crf-dashboard`, `sillage`, `crf` valides ; pour atlas-dashboard utiliser `infra`. Pas de scope `observability` (inexistant).
- **Done criteria:** 6/6 apps + service avec error-tracking ; bootstrap robuste sans DSN ; documentation des variables dans `.env*.example`.
- **Issues résolues:** #309.
- **PR title suggéré:** `feat(infra): generalize error-tracking across apps and crf service`

---

## Sous-tâches manquantes à créer en issues

Les écarts #304-#309 ne couvrent pas explicitement ces tâches, identifiées en analysant le code :

1. **`chore(crf): figer .nvmrc et aligner le runtime Node`** — l'audit relève au facteur X « `.nvmrc` non figé » : à aligner explicitement `.nvmrc` ↔ `engines` ↔ `ARG NODE_VERSION` sur les 6 unités. Prérequis de parité de la Phase 4.
2. **`feat(crf-dashboard): backing-service injectable pour crf-logs`** — `crf-logs` n'a aucune indirection par env (contrairement à `atlas-stats` qui lit `ATLAS_STATS_CACHE_PATH`) ; l'amener au même niveau est supposé par #306 mais non décrit par #305.
3. **`test(crf): suite E2E de non-régression des 4 endpoints dashboard`** — filet recommandé par les notes de dépendance de #305, conditionne la fermeture conjointe de #305 et #306.
4. **`ci: job de fumée des images Docker (build + healthcheck)`** — #308 crée 6 Dockerfiles sans garde-fou continu ; cohérent avec [ADR 0034](/atlas/decisions/0034-ci-adaptative-par-chemin/) (CI adaptative par chemin) pour éviter la dérive silencieuse du seul Dockerfile sillage jamais testé en CI.

## ADR nécessaires

- **ADR 0040** — Caches applicatifs : flux + backing-service injectable vs fichier JSON local (cadre #305, #306).
- **ADR 0041** — Stratégie d'authentification du service CRF Hono (cadre #307).
- **Amendement ADR 0033** (pas une ADR nouvelle) — section « Stratégie d'images de déploiement » (cadre #308).

> Référence d'audit : [Audit cloud-native 2026-06-04](/atlas/audit/2026-06-04-cloud-native/). Suivi du plan dans [l'index des plans](/atlas/plans/).
