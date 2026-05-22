# TODO — atlas

État courant des chantiers actifs sur le monorepo atlas : passage progressif à **DevSecOps** (couche "Sec" sur le pipeline CI/CD existant — GitHub Actions + Appwrite Sites pour amarre/ecrin) et travaux **hors DevSecOps** (sandbox amarre, composants UI partagés, etc.).

Avancement DevSecOps : Sprint 1 + une grosse partie du Sprint 2/3 livrés via PR #127. Phase 1.1 CodeQL ajoutée via PR #156. Restent les workflows complémentaires (provenance OIDC, SBOM, ZAP), le durcissement runtime Appwrite (headers HTTP, rate limit) et la gouvernance UI GitHub (branch protection, Secret Scanning).

---

## Prochaines actions

Items concrets, immédiatement actionnables, sans dépendance d'arbitrage préalable :

- [x] Après merge [PR #156](https://github.com/univ-lehavre/atlas/pull/156) — alertes CodeQL remontent dans l'onglet **Security → Code scanning** (30 alertes ouvertes, analyse `2026-05-19T14:00:10Z` sur `refs/heads/main` avec 37 résultats)
- [x] Vérifier qu'aucun build n'est cassé par les bumps majors Dependabot du 2026-05-19 (notamment `@napi-rs/canvas` 0.x→1.x via #137) — API `createCanvas`/`getContext`/`toBuffer` validée à l'exécution, tests + build OK
- [x] Vérifier le nouveau wording RGPD du modal [CreateRequest.svelte](apps/amarre/src/lib/ui/CreateRequest.svelte) (porté via [PR #155](https://github.com/univ-lehavre/atlas/pull/155)) — code-side : diff conforme à l'upstream `b035655` (titre, lien `target=_blank rel=noopener`). Vérif visuelle finale à faire côté dev par toi si souhaitée.
- [x] Vérifier la logique de signature composante/labo selon `invitation_type` dans amarre (`1`=Recherche, `2`=Enseignement, `3`=Les deux) — table de vérité conforme au spec ; 3 points cosmétiques à noter ([Request.svelte:13](apps/amarre/src/lib/ui/Request.svelte#L13) dead code commenté, asymétrie `isInvitation` préservée de l'upstream, pas de test unitaire sur `Request.svelte`)
- [x] [Actions UI GitHub](#actions-manuelles-ui-github) — Secret Scanning + Push Protection + Dependabot security updates + branch protection sur `main` activés via API GitHub le 2026-05-19
- [x] Fix logos `vite-plugin-static-copy` → script `prepare` (3 apps) — livré et mergé via [PR #157](https://github.com/univ-lehavre/atlas/pull/157)
- [x] Nettoyer `knip.json` : retirer `@univ-lehavre/atlas-logos` de `ignoreDependencies` des 3 apps — livré via [PR #160](https://github.com/univ-lehavre/atlas/pull/160)
- [ ] Examiner les 7 alertes Dependabot remontées suite à l'activation du Dependency graph le 2026-05-19 (6 moderate, 1 low — toutes sous le seuil `high` du workflow `dependency-review`). Triage via Settings → Security → Dependabot. Lié à [Phase 3.3](#33-renforcement-de-pnpm-audit) (durcissement `--audit-level=moderate`).
- [ ] **Trier les 25 warnings + 4 notes CodeQL restants** (post-[PR #194](https://github.com/univ-lehavre/atlas/pull/194), qui a fermé l'erreur critique `js/command-line-injection` + 1 warning) :
  - `js/file-access-to-http` × 13 — test helpers sandbox/crf-sandbox (REDCap test code lisant un path d'env puis fetchant `localhost:8888`). Acceptable pour des tests sandbox-only ; envisager `// codeql[js/file-access-to-http]` ligne-à-ligne pour silencer.
  - `js/incomplete-url-substring-sanitization` × ~3 restants — vérifier si chaque match est un placeholder check (comme `appwrite.ts` fixé en #194) ou un vrai gap.
  - `js/comparison-between-incompatible-types` × 1 — [apps/crf-dashboard/src/routes/api/logs/+server.ts](apps/crf-dashboard/src/routes/api/logs/+server.ts). Pre-existing.
  - `js/unused-local-variable` × 4 — `note` severity, simple dead-let pruning dans `packages/crf-core/src/validation/`, `packages/citation-validate/`, `apps/ecrin/src/lib/transformers/build-name.ts`.
  - Pour chaque alerte non corrigeable : décider entre **dismiss** (Settings → Security → Code scanning → Dismiss as `won't fix` / `false positive` avec justification) et **fix code**.

---

## Backlog d'issues à créer

Items différés (issus de la PR #127, trop volumineux pour y être inclus — chacun mérite sa propre PR/issue) :

**Hors DevSecOps**

- [ ] `packages/crf-project-template/` (trame déclarative avec Effect Schema)
- [ ] Helper TS pour parser le CSV REDCap + générer des fake records
- [ ] Abstraction CLI partagée (réduire le boilerplate des 3 CLIs citation-like)
- [ ] Tests `bin/` pour `cli/crf` (couverture 22.7% → 50%+)
- [x] Déplacement des composants UI des apps vers un package partagé — livré via [PR #190](https://github.com/univ-lehavre/atlas/pull/190) : les 15 composants Svelte de `apps/amarre/src/lib/ui/` sont dans `ui/atlas-ui/` (package `@univ-lehavre/atlas-ui`), prévisualisés via Storybook 10. Bootstrap centralisé dans le package (plus de CDN). Brand identity injectée via props (logos, alt-text, platformName) — cf. [PR #192](https://github.com/univ-lehavre/atlas/pull/192).
- [ ] **`atlas-ui` : système de theming optionnel** — exposer des points d'extension pour : palettes de couleurs (variants Bootstrap custom : `--bs-primary` etc.), familles de fontes (au-delà de Gambetta hardcodée dans amarre), tailles de base (rem-scale, line-height, spacing). Cibles : autres apps du monorepo qui consommeraient atlas-ui avec leur propre identité visuelle, sans forker les composants. Pistes à cadrer :
  - Variables CSS custom exposées par `@univ-lehavre/atlas-ui/client` (override au niveau consumer)
  - Ou prop `theme` sur un composant racine (Provider pattern)
  - Ou export de SCSS sources pour rebuild Bootstrap (`atlas-ui/scss`)
  - Storybook : ajouter un addon `@storybook/addon-themes` ou switcher manuel pour prévisualiser chaque palette
  - Décider si l'identité amarre reste hardcodée dans `apps/amarre/static/` ou si elle remonte dans un thème nommé.
- [ ] **Dispatcher les tests entre les 5 niveaux et `atlas-ui`** — après l'extraction des composants vers `ui/atlas-ui/`, les tests level-1 UI actuellement dans [apps/amarre/tests/ui/](apps/amarre/tests/ui/) testent en réalité des composants qui ne vivent plus dans amarre. À migrer vers `ui/atlas-ui/tests/ui/` (avec les fixtures correspondantes). amarre garde uniquement les tests de routes / services / `+page.svelte` / `hooks.server.ts`. Les niveaux 2 à 5 restent en place (contract dans `sandbox/crf-sandbox/`, intégration dans `apps/amarre/tests/integration/`, E2E dans `sandbox/amarre-sandbox/`). En bonus : stories Storybook et tests level-1 partageraient les mêmes fixtures (cf. discussion archi initiale). Cf. [apps/amarre/tests/README.md](apps/amarre/tests/README.md) pour la pyramide actuelle.
- [ ] **Brancher les niveaux 2 à 5 d'amarre sur pre-push (et CI)** — aujourd'hui seul le niveau 1 protège réellement les PRs. `pnpm test:coverage` du `lefthook` pre-push et du job `test` de [`.github/workflows/ci.yml`](.github/workflows/ci.yml) tourne via turbo, mais : N2 est exclu par config dans [sandbox/crf-sandbox/vitest.config.ts](sandbox/crf-sandbox/vitest.config.ts), N3/N4 sont `describe.skipIf(!reachable)` (pas de docker ni dans le hook ni dans le runner CI), N5 (Playwright) n'est dans aucun pipeline. Pistes : (a) job CI dédié `services:` Postgres/Redis/MariaDB + démarrage Appwrite/REDCap via docker compose puis `pnpm -F atlas-crf-sandbox test:contract:amarre && pnpm -F amarre test:integration && pnpm -F amarre-sandbox test:smoke` ; (b) variante pre-push allégée qui exige la stack `pnpm -F amarre-sandbox start` à jour avant de pousser, ou skip propre sinon. Trade-off : temps de CI (~5 min ajoutés pour la stack docker) vs couverture réelle de la pyramide. Cf. [apps/amarre/tests/RUNBOOK.md](apps/amarre/tests/RUNBOOK.md) → "Intégration des 5 niveaux dans pre-commit / pre-push / CI".
- [ ] **Dockeriser sillage-app dans sillage-sandbox** — `apps/sillage` est lancée hors du compose (`pnpm -F atlas-sillage dev` sur le host). Pour anticiper les dépendances R (project-graph-shiny) et Python (ecrin.py / cahier-reports), il faut un service `app` dans `sandbox/sillage-sandbox/docker-compose.yaml` qui run sillage build-once et expose :5173. Étapes : (a) `apps/sillage/Dockerfile` multi-stage (node:24-alpine builder + adapter-node runtime), (b) service `app` dans le compose avec port mapping 5173:3000 et env vars depuis `.env.local` généré, (c) update `write-sillage-env.sh` pour pointer Appwrite/REDCap via le DNS interne docker (genre `http://baas:80/v1`) au lieu de `localhost`, (d) README qui documente `pnpm dev` (HMR rapide, host) vs `docker compose up` (prod-like, full stack incluant l'app). Pré-requis pour la phase qui ajoute les services R/Python.
- [ ] **Sandbox sillage : volumes volatils par défaut** — actuellement `sillage-sandbox/docker-compose.yaml` déclare des volumes nommés persistants (`baas-uploads`, `baas-cache`, `baas-config`, `baas-certificates`, `baas-mongodb-data`). L'état survit donc à `docker compose down` mais en pratique on rebootstrappe systématiquement et le drift d'état (cf. l'item suivant) cause plus de bug que de bénéfice. Convertir en volumes anonymes / tmpfs pour que chaque `pnpm start` parte d'un état fresh — évite aussi les conflits d'état entre les sandboxes amarre/sillage qui partagent le projet REDCap id=1. Implique d'accepter un cold-bootstrap (~30-60s) à chaque relance.
- [ ] **Bug d'idempotence Appwrite après `docker compose down`/`up`** — observé dans la session du 2026-05-21 : un cycle `docker compose down` (sans `-v`) suivi d'`up -d` perd l'état applicatif Appwrite (le projet `amarre` n'existe plus, retour `project_not_found` sur `/v1/...`). Pourtant le volume `baas-mongodb-data` est nommé et préservé. Hypothèses : Appwrite ne lit pas son state au cold-restart, ou MongoDB perd l'auth (root password drift). Workaround actuel : rejouer `pnpm bootstrap:baas` qui est idempotent. À creuser : pourquoi le state Appwrite ne survit pas à un down/up alors que les volumes sont là — diagnostiquer via `docker volume inspect amarre-sandbox_baas-mongodb-data` et `mongosh` direct dans le conteneur.
- [ ] **Aligner `node-appwrite` (SDK 25.x = Appwrite 1.9.5) avec le server (`appwrite/appwrite:1.9.0`)** — 5 packages tirent `node-appwrite@^25.0.0` (`packages/auth`, `packages/baas`, `apps/amarre`, `apps/find-an-expert`, `apps/ecrin`) + un `appwrite@^25.1.1` (browser SDK) dans `apps/ecrin`. Le SDK 25.x annonce viser Appwrite 1.9.5 (header `X-Appwrite-Response-Format: 1.9.5`) alors que la dernière image stable côté server est `1.9.0`. Spam de warnings au démarrage du dev server + smoke. Options : (a) downgrade SDK vers `^23.1.0` (cible exact 1.9.0, mais 2 majors de retard et possibles breaking changes via le store features 1.9.x non disponibles) ; (b) downgrade vers `^24.1.0` (cible 1.9.4, plus proche, moins de breaking) ; (c) attendre que `appwrite/appwrite:1.9.5` sorte. Option (b) est probablement le bon compromis si elle ne casse rien. Tester via build + lint + typecheck + smoke avant merge.
- [ ] **Parité visuelle amarre prod vs local (atlas-amarre)** — la prod sur https://amarre.univ-lehavre.fr et le local servi par `pnpm -F amarre dev` ont des couleurs de background différentes (et possiblement d'autres divergences visuelles). Cause probable : depuis l'extraction des composants vers `@univ-lehavre/atlas-ui` ([PR #190](https://github.com/univ-lehavre/atlas/pull/190)), certaines variables CSS ou rules SCSS Bootstrap custom de la prod ne remontent plus jusqu'au local. Investigation : (a) extraire le HTML/CSS rendu côté prod et le diff avec le rendu local ; (b) vérifier que `@univ-lehavre/atlas-ui/client` charge bien la même version de Bootstrap CSS + tous les overrides custom ; (c) cf. l'item « atlas-ui : système de theming optionnel » qui couvre une partie du problème.
- [ ] **Réviser le workflow UI d'amarre — drift vs `univ-lehavre/amarre` standalone** — l'app dans atlas/apps/amarre/ et le dépôt standalone https://github.com/univ-lehavre/amarre ont divergé (le standalone n'a pas reçu les évolutions atlas, et inversement certains patterns du standalone manquent ici). Audit nécessaire : (a) diff structurel apps/amarre/ vs univ-lehavre/amarre, (b) identifier les divergences fonctionnelles (routes, hooks, UI) vs cosmétiques, (c) statuer sur ce qui doit être porté dans atlas (atlas reste la source canonique per décision 2026-05-19, cf [À arbitrer](#sort-du-dépôt-standalone-univ-lehavreamarre)). Lié à l'item Parité visuelle ci-dessus.
- [ ] **Publier les 7 CLIs sur GitHub Packages** (`atlas-citation-cli`, `atlas-net-cli`, `atlas-stats-cli`, `atlas-crf-stats-cli`, `atlas-researcher-profiles-cli`, `atlas-crf-cli`, `atlas-crf-openapi`) — n'ont jamais déclenché de release, pas `private` mais absents du registry. Vérifier que les changesets les détectent, créer un premier changeset par package, vérifier que `pnpm release` les pousse bien sur `npm.pkg.github.com`. Documenter l'install côté consommateur (auth GH requis).
- [ ] **Marquer 3 packages comme `"private": true`** pour éviter une publication accidentelle :
  - `apps/atlas-dashboard/package.json` (app SvelteKit, déployée via Appwrite Sites)
  - `apps/crf-dashboard/package.json` (idem)
  - `sandbox/crf-sandbox/package.json` (sandbox Docker local, pas un package npm distribuable)
- [x] `sandbox/amarre-sandbox/` (environnement Docker local Amarre + Appwrite + REDCap) — squelette livré (cf. [§Sandbox Amarre](#sandbox-amarre--appwrite--crf-en-local)) ; reste l'export du dictionnaire CRF minimum à automatiser

**DevSecOps (renvoient aux phases ci-dessous)**

- [x] Phase 1 — CodeQL workflow (voir [§1.1](#11-codeql)) — workflow livré via PR #156, reste vérif Security tab + nomination security champion
- [ ] Phase 4.3 — npm provenance via OIDC (voir [§4.3](#43-npm-provenance-via-oidc))
- [ ] Phase 4.4 — SBOM CycloneDX (voir [§4.4](#44-sbom-software-bill-of-materials))
- [x] Phase 5.3 — branch protection sur `main` activée via API le 2026-05-19 (voir [§5.3](#53-branch-protection-sur-main))
- [x] Phase 6.3 — HTTP headers de sécurité livrés (CSP via `kit.csp` + 5 headers via `hooks.server.ts`, sur amarre + ecrin + find-an-expert). Reste à tightener `connect-src` (wildcard pour v1).
- [ ] Phase 6.5 — rate limiting sur les endpoints publics (voir [§6.5](#65-rate-limiting))
- [ ] Phase 7 — OWASP ZAP baseline (voir [§7.1](#71-owasp-zap-baseline))
- [ ] Phase 8 — observabilité + runbook incident (voir [§8](#phase-8--observabilité-et-réponse-aux-incidents))

---

## À arbitrer

Items qui demandent une décision avant action.

### RGPD / PRIVACY.md

Initialement retiré du périmètre de la PR #127 (_"le repo est du code, pas une politique RGPD"_). À reprendre comme item indépendant, en se posant d'abord la question du **cadrage** :

- [ ] Cadrer le périmètre : ce repo héberge du **code source**, pas des données personnelles. Mais des considérations indirectes existent — à trancher pour chacune :
  - Métadonnées des commits (email des contributeurs externes) : suffit-il d'un renvoi vers la politique GitHub ?
  - Données collectées par les apps déployées (amarre, ecrin, find-an-expert) : relève des **apps** elles-mêmes, pas du repo — où documenter ?
  - Dépendances tierces appelant des services externes (OpenAlex, Appwrite, Sentry si activé…) : à inventorier
  - Logs côté Appwrite (IP, user-agent…) : qui est responsable de traitement ?
- [ ] Décider : un seul `PRIVACY.md` à la racine ? Une politique par app dans `apps/*/PRIVACY.md` ? Ou renvoi vers une politique ULHN existante ?
- [ ] Identifier le **responsable de traitement** (probablement l'Université Le Havre Normandie / DSI, pas le repo lui-même)
- [ ] Rédiger le contenu une fois le cadrage figé (sortir du périmètre TODO si délégué à la DSI)

### Sort du dépôt standalone `univ-lehavre/amarre`

- [x] **Décision 2026-05-19** : le dépôt standalone reste **en l'état** (dernier commit 2026-02-06), gardé tel quel comme historique. atlas est la source canonique pour les futurs développements (sync via [PR #155](https://github.com/univ-lehavre/atlas/pull/155)).

### Security champion CodeQL

- [ ] Nommer un _security champion_ responsable du triage des alertes CodeQL (cf. [§1.1](#11-codeql)). Idéalement un second mainteneur pour le bus-factor (cf. [§5.2](#52-codeowners)).
- [ ] Limitation Svelte de CodeQL : l'extracteur JS/TS ne couvre pas les `.svelte` (les `<script>` sont hors analyse). Définir un complément (lint Svelte strict, revues manuelles ciblées).

---

## Actions manuelles UI GitHub

À faire dans les Settings du dépôt (hors code, mais nécessaires pour la gouvernance) :

- [x] Activer **Secret Scanning** + **Push Protection** (activés via API le 2026-05-19)
- [x] Activer **branch protection** sur `main` (activée via API le 2026-05-19, voir [§5.3](#53-branch-protection-sur-main) pour le détail)
- [ ] Annoncer `brew install gitleaks` aux contributeurs pour le pre-commit local

---

## Sandbox Amarre + Appwrite + CRF en local

Objectif : un environnement Docker reproductible pour faire tourner [apps/amarre/](apps/amarre/) bout-en-bout en local, avec une instance Appwrite self-hosted et une instance CRF (REDCap) — pour itérer sur l'app sans dépendre des instances de prod.

**Localisation** : nouveau package `sandbox/amarre-sandbox/` à côté de [sandbox/crf-sandbox/](sandbox/crf-sandbox/) (qui reste dédié à la validation contract/security de l'API CRF). Le nouveau package réutilise la stack CRF existante via la directive `include:` de Docker Compose v2.20+ et ajoute Appwrite + le wiring Amarre.

### Périmètre

- [x] Squelette `sandbox/amarre-sandbox/` : `docker-compose.yaml` (avec `include:` de `../crf-sandbox/docker/docker-compose.yml`), `README.md`, `package.json`, scripts, `.env.example`, `.gitignore`
- [x] Stack BaaS (Appwrite) self-hosted **minimale** ajoutée au compose (3 conteneurs : `baas`, `baas-mariadb`, `baas-redis` ; sans traefik ni workers — suffisant pour Account/Users/Database utilisés par amarre)
- [x] Script `bootstrap-baas.sh` (renommé sans la marque) : valide les credentials du projet contre `/v1/users`. La création initiale projet + clé reste **semi-manuelle** via la console web Appwrite (limitation API admin documentée dans le README)
- [x] Script `bootstrap-crf.sh` : délègue à `pnpm -F crf-sandbox docker:install`, récupère le token écrit dans `crf-sandbox/docker/config/.env.test`, l'inscrit dans `.env`. Création du projet REDCap + dictionnaire reste manuelle (cf. ligne dictionnaire ci-dessous)
- [x] Script `bootstrap.sh` orchestrateur : `wait-for` healthcheck BaaS, enchaîne baas → crf → écrit `apps/amarre/.env.local` via `write-amarre-env.sh`
- [x] Décision : Amarre tourne en `pnpm -F amarre dev` sur l'hôte (rapide à itérer) ; conteneurisation pas dans ce premier livrable
- [ ] **Reste à faire** : exporter le dictionnaire CRF minimum (champs `record_id`, `created_at`, `demandeur_statut`, `mobilite_type`, `invitation_type`, `invite_nom`, `mobilite_universite_*`, `*_complete`, `avis_*_position`) dans `sandbox/amarre-sandbox/fixtures/` + script d'import REDCap, pour automatiser entièrement le `bootstrap-crf.sh`

### Points d'attention

- Bootstrap Appwrite par API n'est pas trivial : la création initiale du projet/clé passe traditionnellement par la console web. Évaluer si l'API admin Appwrite suffit, sinon documenter les étapes manuelles
- Couplage léger avec `crf-sandbox` (noms de services, ports) — si le compose de `crf-sandbox` change, amarre-sandbox casse. Acceptable tant que la convention est explicitée dans le README
- L'allowlist email d'Amarre (`ALLOWED_DOMAINS_REGEXP`) doit autoriser un domaine de test (ex. `@example\.org`) pour les comptes locaux
- Pas de noms de marques dans le code/identifiants (cf. convention repo) : `amarre-sandbox`, pas `redcap-sandbox` ; variables `CRF_*` plutôt que `REDCAP_*` côté scripts

---

## Phase 0 — Vérifications préalables (à faire en premier)

### 0.1 Audit du token REDCap à la racine

- [x] Vérifier que `redcap-token.csv` est bien dans `.gitignore` — couvert par le pattern `*-token.csv` (ligne 59)
- [x] Vérifier qu'il n'a jamais été commité : `git log --all --full-history -- redcap-token.csv` — aucun historique
- [ ] Si commité un jour : rotation immédiate du token côté REDCap + purge de l'historique (`git filter-repo`) + force-push coordonné avec l'équipe — N/A
- [ ] Déplacer le fichier hors du dépôt (ex : `~/.config/atlas/redcap-token.csv`) et adapter le chargement applicatif

### 0.2 Inventaire des secrets en circulation

- [x] Lister tous les secrets attendus — voir [docs/security/secrets.md](docs/security/secrets.md) : TURBO_TOKEN, PAT_TOKEN, NPM_TOKEN, GITHUB_TOKEN (GH Actions) ; APPWRITE_KEY + IDs + ALLOWED_DOMAINS_REGEXP + REDCAP_API_TOKEN + OPENALEX_API_TOKEN (Appwrite Console) ; tokens.csv + GITHUB_TOKEN local (dashboards)
- [x] Pour chacun : emplacement de stockage (GH Secrets, Appwrite Console, fichier `.env` local) + owner + procédure de rotation — documenté dans [docs/security/secrets.md](docs/security/secrets.md)
- [x] Documenter la procédure de rotation — section "Procédure de rotation générique" + "Procédure d'urgence" dans [docs/security/secrets.md](docs/security/secrets.md)

### 0.3 Cartographie des surfaces exposées

- [ ] URLs Appwrite Sites prod (amarre, ecrin, find-an-expert) et previews — structure documentée dans [docs/security/surfaces.md](docs/security/surfaces.md), URLs concrètes _à compléter par l'admin Appwrite_
- [x] Lister les endpoints API publics — [docs/security/surfaces.md](docs/security/surfaces.md) couvre les 3 apps déployées (amarre, ecrin, find-an-expert) + les 2 dashboards locaux
- [x] Identifier les routes nécessitant authentification vs publiques — classification `🌐 PUBLIC` / `🔒 AUTH` / `🏠 LOCAL` pour chaque endpoint. 3 points d'attention identifiés : `ecrin /graphs`, `find-an-expert /institutions/search`, `find-an-expert /repositories/[id]` sont publics — à arbitrer (gate auth ou rate limit, cf. Phase 6.5)

---

## Phase 1 — Sécurité du code (SAST)

### 1.1 CodeQL

- [x] Créer `.github/workflows/codeql.yml` avec langages `javascript-typescript` (via [PR #156](https://github.com/univ-lehavre/atlas/pull/156))
- [x] Déclencheurs : `push` sur main, `pull_request` sur main, `schedule` hebdomadaire (lundi 03:17 UTC) + `workflow_dispatch`
- [x] Activer les query suites `security-extended` et `security-and-quality`
- [ ] Vérifier après premier run que les alertes remontent dans l'onglet Security du dépôt GitHub
- [ ] Définir un _security champion_ responsable du triage des alertes (cf. [À arbitrer](#à-arbitrer))
- [ ] Limitation Svelte : l'extracteur JS/TS de CodeQL ne parse pas les `.svelte` (les `<script>` sont hors couverture). À documenter et compléter par des revues + lint Svelte.

### 1.2 Semgrep (optionnel, complémentaire)

- [ ] Évaluer Semgrep avec les règles `p/typescript`, `p/svelte`, `p/owasp-top-ten`
- [ ] Si retenu : workflow `.github/workflows/semgrep.yml` sur PR uniquement (pas en push pour limiter le bruit)

### 1.3 Politique de triage

- [ ] Définir un SLA de remédiation par sévérité (critical : 7j, high : 30j, medium : trimestre)
- [ ] Documenter dans `SECURITY.md` (voir phase 5)

---

## Phase 2 — Secrets

### 2.1 GitHub natif

- [x] Activer **Secret Scanning** — activé via API le 2026-05-19
- [x] Activer **Push Protection** — activé via API le 2026-05-19 (bloque les push contenant des secrets détectés)
- [x] Activer **Dependabot alerts** et **security updates** — activés le 2026-05-19 (7 alertes existantes remontées : 6 moderate + 1 low, à triager)

### 2.2 Gitleaks en CI et pre-commit

- [x] Ajouter `gitleaks` au pre-commit lefthook (workflow rapide sur fichiers staged) — `lefthook.yml`, tolérant à l'absence locale du binaire
- [x] Workflow `.github/workflows/gitleaks.yml` sur PR (scan complet de l'historique des commits de la PR) — via `gitleaks-action@v2.3.9` épinglé SHA
- [x] Créer `.gitleaks.toml` avec règles custom pour les patterns REDCap (token 32 char hex) et Appwrite — règles custom + allowlist

### 2.3 Audit historique

- [x] Lancer `gitleaks detect --source . --log-opts="--all"` une fois pour scanner tout l'historique — fait via `workflow_dispatch`, 18 findings cartographiés (cf. [archive](#2026-05-19--faux-positifs-gitleaks))
- [x] Traiter chaque finding : rotation, purge si nécessaire, ajout en whitelist sinon — tous identifiés comme faux positifs, allowlist ciblée via #145

---

## Phase 3 — Dépendances (SCA)

### 3.1 Dependabot

- [x] Créer `.github/dependabot.yml` avec écosystèmes : `npm` (groupé par workspace), `github-actions` — schedule lundi 6h Europe/Paris
- [x] Stratégie : groupage des minors/patches, PRs séparées pour les majors
- [x] Auto-merge des patches après CI verte — [.github/workflows/dependabot-auto-merge.yml](.github/workflows/dependabot-auto-merge.yml) ; couvre patches partout + minors sur devDeps. Validé en prod via auto-merge de PR #149 le 2026-05-19. Prérequis Settings : _Allow auto-merge_ à activer côté UI.

### 3.2 Dependency Review Action

- [x] Workflow [.github/workflows/dependency-review.yml](.github/workflows/dependency-review.yml) déclenché sur `pull_request` — livré via [PR #161](https://github.com/univ-lehavre/atlas/pull/161)
- [x] Bloquer les vulnérabilités `high` et au-dessus (`fail-on-severity: high`)
- [x] Bloquer les licences non listées dans l'allowlist — `MIT, MIT-0, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Unlicense, CC0-1.0, CC-BY-4.0, Python-2.0, MPL-2.0, BlueOak-1.0.0, Zlib, WTFPL` (SPDX canoniques, aligné sur `scripts/audit/licenses.mjs`)
- [x] Prérequis Settings : Dependency graph activé (2026-05-19) — débloque aussi les Dependabot alerts (7 vulnérabilités remontées le 2026-05-19 : 6 moderate + 1 low, à examiner — cf. [Prochaines actions](#prochaines-actions))

### 3.3 Renforcement de `pnpm audit`

- [ ] Passer `audit:security` de `--audit-level=high` à `--audit-level=moderate`
- [ ] Garder le pre-push hook mais ajouter une exception documentée pour les alertes acceptées (`pnpm audit --ignore`)

---

## Phase 4 — Durcissement de la supply chain

### 4.1 Épingler les GitHub Actions par SHA

- [x] Remplacer `actions/checkout@v6` → `actions/checkout@<sha> # v6.x.x`
- [x] Idem pour `pnpm/action-setup@v5`, `actions/setup-node@v6`, `actions/cache@v5` (10 occurrences pinées dans la PR #127)
- [x] Intégrer dans Dependabot (`github-actions` ecosystem) — fait via `.github/dependabot.yml`
- [x] Concerne : [.github/workflows/ci.yml](.github/workflows/ci.yml), [.github/workflows/docs.yml](.github/workflows/docs.yml), [.github/workflows/release.yml](.github/workflows/release.yml), [.github/workflows/gitleaks.yml](.github/workflows/gitleaks.yml), [.github/workflows/codeql.yml](.github/workflows/codeql.yml)

### 4.2 Permissions minimales par job

- [x] Actuellement `permissions: contents: read` au top de ci.yml
- [x] `permissions:` explicites présents dans `release.yml`, `docs.yml`, `gitleaks.yml`, `codeql.yml`
- [ ] Pour `release.yml` : `id-token: write` requis pour OIDC/provenance — à ajouter quand on activera Phase 4.3

### 4.3 npm provenance via OIDC

- [ ] Dans le script `release` racine, ajouter `--provenance` à `npm publish` (ou via `changeset publish` avec la bonne config)
- [ ] Vérifier que le workflow `release.yml` a `id-token: write`
- [ ] Documenter la vérification côté consommateur : `npm audit signatures`

### 4.4 SBOM (Software Bill of Materials)

- [ ] Générer un SBOM CycloneDX à chaque build : `cdxgen` ou `@cyclonedx/cdxgen`
- [ ] Publier le SBOM en artefact GitHub Actions sur chaque release
- [ ] Stocker un SBOM agrégé dans `docs/security/sbom/` ou à côté des artefacts de release

---

## Phase 5 — Politique et gouvernance

### 5.1 SECURITY.md

- [x] Créer `SECURITY.md` à la racine
- [x] Contenu : versions supportées, contact, procédure de divulgation responsable, SLA (accusé 72h, évaluation 7j, correctif haute 30j / moyenne 90j, divulgation publique +30j après correctif)
- [ ] Mention RGPD et données REDCap (sensibles santé selon usage) — à enrichir si besoin
- [ ] Référencer la politique sécurité de l'Université Le Havre Normandie si elle existe

### 5.2 CODEOWNERS

- [x] Créer `.github/CODEOWNERS`
- [x] Owners sur : `packages/auth/`, `packages/baas/`, `packages/crf-client/`, `packages/crf-core/`, `services/crf/`, `.github/workflows/`, root config
- [ ] Au minimum : `@pierre-olivier.chasset`, idéalement un second mainteneur pour le bus-factor

### 5.3 Branch protection sur `main`

Activée via API le 2026-05-19. Configuration appliquée :

- [x] Règle créée pour `main`
- [x] Required PR (0 approbation requise, vu bus-factor=1 ; status checks gardent la sécurité)
- [x] Required status checks : `Lint`, `Typecheck`, `Test`, `Build`, `Audit`, `Documentation`, `Scan for secrets` (gitleaks), `Analyze (javascript-typescript)` (CodeQL), `Review dependencies`
- [ ] Required signed commits — **désactivé pour l'instant** (commits locaux non signés ; à réactiver une fois GPG/SSH signing configuré localement)
- [x] Block force-push
- [ ] Inclure les administrateurs dans les règles — **désactivé** (admins bypass, pour hotfix solo bus-factor=1)
- [ ] Codeowners review obligatoire — désactivé (à activer quand un second mainteneur sera ajouté, cf. [§5.2](#52-codeowners))

### 5.4 Politique de contribution

- [x] Mettre à jour [CONTRIBUTING.md](CONTRIBUTING.md) avec la section "Security", Code of Conduct (Contributor Covenant 2.1) et CLA léger

---

## Phase 6 — Spécificités Appwrite Sites (amarre, ecrin)

### 6.1 Séparation des environnements

- [ ] Vérifier qu'Appwrite Sites déploie depuis `main` uniquement (pas `dev` ou branches arbitraires)
- [ ] Configurer un environnement **preview** par PR si Appwrite Sites le supporte
- [ ] Sinon : un site Appwrite "staging" déployé depuis une branche `staging` protégée

### 6.2 Variables d'environnement

- [ ] Audit côté console Appwrite : tous les secrets runtime y sont, rien dans le repo
- [ ] Vérifier la discipline `PUBLIC_*` vs privé dans SvelteKit (les `PUBLIC_*` sont exposés au navigateur — aucune clé sensible)
- [ ] Documenter dans `docs/security/env-vars.md` la liste exhaustive et le ownership

### 6.3 En-têtes HTTP de sécurité

Configurés via `kit.csp` (svelte.config.js, avec nonces auto pour les scripts d'hydration) + `hooks.server.ts` (HSTS gated sur HTTPS, autres headers toujours). Couvre les 3 apps SvelteKit (amarre, ecrin, find-an-expert).

- [x] `Content-Security-Policy` — strict (default/script/font/img/object/frame-ancestors/form-action/base-uri) ; `style-src 'unsafe-inline'` conservé pour les `style=` inline Svelte et Bootstrap
- [x] `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — uniquement quand `event.url.protocol === 'https:'`
- [x] `X-Content-Type-Options: nosniff`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- [x] `X-Frame-Options: DENY` (defense-in-depth, redondant avec CSP `frame-ancestors 'none'`)
- [ ] **À tightener** : `connect-src 'self' https:` est volontairement wildcard pour ne pas bloquer Appwrite/REDCap/OpenAlex selon l'environnement de déploiement. Iteration suivante : remplacer par les domaines exacts (`appwrite-dev.univ-lehavre.fr`, `backend.chasset.net`, `redcap.univ-lehavre.fr`, `api.openalex.org`) via env var lue au build ou hardcodée par environnement.
- [x] **Dette test résolue** : tests handler ajoutés en Phase 7.2 pour les 6 endpoints rate-limités, **plus tests `hooks.server.ts`** sur les 3 apps (3 cas chacun : headers statiques, HSTS gated HTTPS, population de `event.locals.userId` quand session valide). Seuils ajustés : amarre 42/52/36/43 et ecrin 28/18/27/28 restaurés à leur valeur d'origine. **find-an-expert baissé temporairement** à 58/41/40/58 après dédup validators (les branches de validation ont migré dans `@univ-lehavre/atlas-auth`, hors périmètre de coverage local) — à remonter en migrant aussi les tests des validators dans le package.
- [ ] Valider avec [securityheaders.com](https://securityheaders.com) — objectif : note A minimum (après déploiement)
- [ ] Tester aussi avec [Mozilla Observatory](https://observatory.mozilla.org)

### 6.4 Authentification et sessions

- [x] Cookies de session : `httpOnly: true` (rendu explicite — était implicite via le default SvelteKit), `secure: true`, `sameSite: 'strict'` (plus strict que minimum Lax), `path: '/'`, `expires` — appliqué dans les 4 setters (`packages/auth/src/index.ts` + services des 3 apps).
- [x] Vérifier les flux d'auth — aucun `localStorage` ni `sessionStorage` dans tout le repo (audit `grep -rn` sur apps + packages clean). Cookies UI find-an-expert (theme, font, dark-mode, locale) en `SameSite=Lax`, sans `Secure` — non sensible, lus côté client par design.
- [x] Protection CSRF — SvelteKit `csrf: { checkOrigin: true }` actif par défaut (aucun override dans les `svelte.config.js`). Confirmé par audit.
- [x] **Dédup session/auth** : les 3 services par-app sont désormais des thin wrappers (~30 lignes) autour de `createAuthService` du package partagé. La logique cookie + admin/session client + validation est centralisée dans `packages/auth/src/index.ts`. ecrin garde `deleteUser`, amarre/ecrin gardent le câblage `resolveUserId` (REDCap `fetchUserId`), find-an-expert utilise le factory tel quel (no resolveUserId).
- [x] **Dédup baas client** : amarre + find-an-expert ont leur `$lib/server/baas/index.ts` réécrit en thin wrapper (~25 lignes) autour de `createAdminClient` / `createSessionClient` du package partagé `@univ-lehavre/atlas-baas`. La signature locale (sans config, qui est dérivée de l'env de l'app) reste identique pour ne pas toucher les consumers (hooks.server.ts, services). **ecrin volontairement laissé en local** : utilise `TablesDB` (API typée récente d'Appwrite) que le package partagé n'expose pas (il fournit `Databases`). À uniformiser en étendant le package quand `TablesDB` deviendra le standard partagé.
- [x] **Dédup userRepository** : amarre `$lib/server/baas/userRepository.ts` + find-an-expert `$lib/server/user/repository.ts` sont des thin subclasses (~10 lignes) qui étendent `BaasUserRepository` du package partagé en injectant `adminConfig` local. L'API à constructeur sans argument est préservée — consumers (`new BaasUserRepository()`) inchangés.
- [x] **Dédup validators auth** : amarre + find-an-expert ont leur `validators/auth.ts` réécrit en re-exports du package `@univ-lehavre/atlas-auth` (`validateMagicUrlLogin`, `validateUserId`, `checkRequestBody`) et `@univ-lehavre/atlas-validators` (`ensureJsonContentType`, `parseJsonBody`). `validateSignupEmail` est wrappé pour injecter `ALLOWED_DOMAINS_REGEXP` depuis l'env. **ecrin volontairement gardé local** sur `validateSignupEmail` : utilise une lookup async `isAlliance` (lecture base Appwrite) au lieu d'une regex statique, et lève `NotPartOfAllianceError` au lieu de `NotAnEmailError`. Le reste est re-exporté du package.

### 6.5 Rate limiting

Implémentation : utilitaire `createRateLimiter` dans [packages/auth/src/rate-limit.ts](packages/auth/src/rate-limit.ts) — fenêtre fixe par-clé (IP), in-memory, ~80 lignes. API : `check(key)` retourne `{ ok, remaining, resetAt }` ; helper `rateLimitHeaders(result, limit)` pour les headers `X-RateLimit-*` + `Retry-After` quand refusé.

- [x] Rate-limit sur les 3 endpoints publics flagués dans [docs/security/surfaces.md](docs/security/surfaces.md) :
  - `ecrin /graphs` — 30 req/min/IP (atténue l'énumération brute de `record_id`)
  - `find-an-expert /institutions/search` — 30 req/min/IP (protège `OPENALEX_API_TOKEN` de l'abus de quota)
  - `find-an-expert /repositories/[id]` — 60 req/min/IP (lightweight)
- [x] Rate-limit anti-spam sur les 3 endpoints `/auth/signup` (amarre + ecrin + find-an-expert) — 5 req/min/IP (déclenche un envoi d'email)
- [ ] **Limitations connues** (à arbitrer plus tard) :
  - In-memory : multi-instance (load balancer) → chaque instance compte séparément. OK en single-instance adapter-node, à migrer vers Redis/Upstash si scale-out
  - Fenêtre fixe (pas glissante) : burst possible en fin de fenêtre
  - Pas de rate-limit sur `/auth/login` (magic URL secret haute entropie) ni sur `/health` (lightweight) — à considérer si besoin

---

## Phase 7 — DAST et tests de sécurité dynamiques

### 7.1 OWASP ZAP baseline

- [ ] Workflow `.github/workflows/zap-baseline.yml`
- [ ] Déclencheur : nightly sur prod, ou sur les URLs de preview après déploiement Appwrite
- [ ] Action : `zaproxy/action-baseline@<sha>` avec l'URL cible
- [ ] Remonter le rapport dans les artefacts GitHub Actions
- [ ] Définir le seuil d'échec (faux positifs gérés via `.zap/rules.tsv`)

### 7.2 Tests de sécurité applicatifs

Premier lot livré : tests Vitest pour les 6 endpoints rate-limités (Phase 6.5). Couvrent les chemins succès / 400 (paramètre manquant) / 429 (saturation rate-limit) / isolation par-IP, plus la présence des headers `X-RateLimit-*` et `Retry-After`. A remonté la couverture globale, permettant la restauration des seuils baissés en Phase 6.3/6.5.

- [x] Tests handler `ecrin /graphs` — 4 cas (200, 400 missing param, 429 saturation, isolation par IP)
- [x] Tests handler `find-an-expert /institutions/search` — 2 cas (200 + headers, 429)
- [x] Tests handler `find-an-expert /repositories/[id]` — 2 cas (200, 429)
- [x] Tests handlers `/auth/signup` × 3 apps — 2 cas chacun (200, 429 anti-spam)
- [ ] **Étendre** : ajouter tests pour les autres catégories listées initialement — payloads malformés (cas explicites), 401 sur endpoints AUTH sans session (déjà partiellement testé sur amarre /surveys/new), anti-XSS basique (vérifier que les inputs ne sont pas réfléchis tels quels)
- [x] Test handler `hooks.server.ts` × 3 apps qui mocke `createSessionClient` et vérifie les 5 headers de sécurité (Phase 6.3)

### 7.3 Revue de sécurité périodique

- [ ] Planifier une revue trimestrielle (utiliser `/schedule` ou un rappel calendrier)
- [ ] Checklist : alertes CodeQL, dépendances obsolètes, en-têtes HTTP, logs Appwrite, accès aux secrets

---

## Phase 8 — Observabilité et réponse aux incidents

### 8.1 Logs et alerting

- [ ] Identifier qui consulte les logs Appwrite et à quelle fréquence
- [ ] Alerte basique sur 5xx > seuil et latence p95 anormale (via Appwrite si supporté, sinon export vers un outil tiers)
- [ ] Logs d'auth : tentatives échouées, suspicions de brute-force

### 8.2 Runbook incident

- [ ] Créer `docs/security/incident-response.md`
- [ ] Étapes : détection, confinement (couper l'accès, rotation), éradication, récupération, post-mortem
- [ ] Liste des contacts : Université Le Havre Normandie DSI, contact CNIL si fuite de données personnelles

### 8.3 Sauvegardes et restauration

- [ ] Vérifier la politique de sauvegarde Appwrite (instance auto-hébergée ? Appwrite Cloud ?)
- [ ] Documenter le RPO/RTO attendus
- [ ] Tester une restauration au moins une fois par an

---

## Ordre de priorité recommandé

État au 2026-05-19 : Sprints 1–4 majoritairement bouclés, restent surtout les workflows DAST/supply-chain (Phase 4.3/4.4/7.1) et l'observabilité (Phase 8).

**Sprint 1 (bloquants sécurité)**

- [x] Phase 0.1 (audit token REDCap) ; Phase 0.2/0.3 ✅ livrés via [PR #171](https://github.com/univ-lehavre/atlas/pull/171) (`docs/security/secrets.md` + `surfaces.md`)
- [x] Phase 2.1 (Secret Scanning + Push Protection + Dependabot alerts) — activés via API GitHub le 2026-05-19
- [x] Phase 5.1 (SECURITY.md) ✅ livré via PR #127
- [x] Phase 5.3 (branch protection main) — activée via API le 2026-05-19

**Sprint 2 (fondations)**

- [x] Phase 1.1 (CodeQL) ✅ livré via [PR #156](https://github.com/univ-lehavre/atlas/pull/156)
- [x] Phase 3.1 (Dependabot) ✅ livré + auto-merge patches via `.github/workflows/dependabot-auto-merge.yml`
- [x] Phase 3.2 (Dependency Review Action) ✅ livré via [PR #161](https://github.com/univ-lehavre/atlas/pull/161)
- [x] Phase 4.1 (pin actions SHA) ✅ livré via PR #127 (+ #156, #161)
- [x] Phase 4.2 (permissions minimales par job) ✅ — id-token reste à ajouter avec Phase 4.3

**Sprint 3 (supply chain et Appwrite)**

- [ ] Phase 4.3 (npm provenance via OIDC) — à faire
- [ ] Phase 4.4 (SBOM CycloneDX) — à faire
- [x] Phase 6.3 (headers HTTP de sécurité) ✅ livré via PR #171 ; tightener `connect-src` ouvert
- [x] Phase 6.4 (cookies session hardening + audit localStorage + CSRF) ✅ livré via PR #171
- [x] Phase 2.2 (gitleaks) ✅ livré via PR #127 + stabilisation #141/#143/#144/#145

**Sprint 4 (finalisation)**

- [ ] Phase 7.1 (OWASP ZAP baseline) — à faire
- [x] Phase 6.5 (rate limiting) ✅ livré en local (branche `devsecops/rate-limiting-phase-6-5`) — pas encore mergé
- [x] Phase 7.2 (tests sécurité applicatifs) ✅ : handlers rate-limités + hooks.server.ts × 3 apps livrés ; reste à étendre sur anti-XSS et payloads malformés explicites
- [ ] Phase 8 (observabilité, runbook incident) — à faire
- [x] Phase 5.2 (CODEOWNERS) ✅ livré via PR #127 ; nomination d'un second mainteneur ouverte
- [x] Phase 5.4 (CONTRIBUTING) ✅ livré via PR #127

**Hors plan initial mais réalisé en session 2026-05-19**

- [x] Dédup `authService` × 3 apps via `createAuthService` (packages/auth) — ~150 lignes supprimées
- [x] Dédup baas client × 2 apps (amarre + find-an-expert ; ecrin gardé pour TablesDB) — ~80 lignes supprimées
- [x] Dédup `BaasUserRepository` × 2 apps via subclass thin de `packages/baas`
- [x] Fix logos `vite-plugin-static-copy` v3→v4 régression via prepare script (PR #157)
- [x] Décision standalone `univ-lehavre/amarre` (gardé en l'état)
- [x] Bump amarre/ecrin/find-an-expert : white background header/footer (PR #159)
- [x] Dependabot — reduce PR noise (1 PR groupée/écosystème, max 1 ouverte simultanée)
- [x] Cleanup `knip.json` (PR #160) + dette cosmétique (`<span class="">` vide, dead code commenté)

À l'issue de ce backlog, le dépôt satisfait honnêtement le qualificatif **DevSecOps** pour la partie développement _et_ déploiement (amarre, ecrin, find-an-expert).

---

## Archive

Historique des chantiers closés, gardé pour traçabilité.

### 2026-05-19 — Workflows post-merge PR #127

- [x] CI : success
- [x] Deploy Documentation : success (fix VitePress validé)
- [x] Release : success
- [x] Gitleaks : 3 itérations nécessaires (cf. ci-dessous), résolu en passant le scan main en mode diff-only via PR #144

### 2026-05-19 — Faux positifs Gitleaks

Saga close après cinq PRs ✅. L'historique du repo (migration trademark #125 + renames antérieurs) contenait de nombreux fichiers aux paths obsolètes qui matchaient les règles gitleaks.

| # PR                                | Findings | Sources                                                                                                        | Correction                                                                                                         |
| ----------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| #141                                | 41       | JSDoc `RedcapToken('A1B2…')` + doc `.md` exemples                                                              | Règle `redcap-api-token` durcie (contexte d'affectation requis) + allowlist `\.md$` + patterns fixtures            |
| #143                                | 26       | `packages/redcap/tests/fixtures/projects.json` (path historique d'avant migration trademark)                   | Allowlist path élargie de `sandbox/crf-sandbox/tests/fixtures/.*` → `(?:^\|/)tests/fixtures/`                      |
| #144                                | 18       | `packages/amarre/scripts/`, `packages/redcap-sandbox/.env.test` (autres paths historiques)                     | **Changement de stratégie** : scan push main en mode diff (`before..after`) au lieu de l'historique complet        |
| Audit `workflow_dispatch` post-#144 | 18       | Inventaire complet : 3 fichiers obsolètes (sandbox `.env.test`, amarre `generate-openapi.ts` + `openapi.json`) | Inspection des contenus : 100% faux positifs (fixtures localhost + exemples doc OpenAPI), aucun vrai secret oublié |
| #145                                | 18 → 0   | Les 3 paths historiques ci-dessus                                                                              | Allowlist ciblée des paths historiques (préféré à un `git filter-repo` jugé disproportionné pour des fixtures)     |

**Stratégie finale**, documentée dans [.github/workflows/gitleaks.yml](.github/workflows/gitleaks.yml) et [.gitleaks.toml](.gitleaks.toml) :

- Sur **PR** : scan du diff de la PR (`base.sha..head.sha`)
- Sur **push main** : scan uniquement les nouveaux commits du push (`before..after`)
- Sur **workflow_dispatch** : scan complet de l'historique, à lancer manuellement pour audit ponctuel (renvoie maintenant **0 finding**)

Garanties préservées : tout nouveau secret est détecté soit par le scan PR, soit par le scan push main (les deux en mode diff).

### 2026-05-19 — Dependabot : premier passage

8 PRs ouvertes par le premier run de `.github/dependabot.yml`, toutes mergées le 2026-05-19 :

**GitHub Actions (3 PRs)** : `actions/upload-pages-artifact` 4 → 5 (#130), `pnpm/action-setup` digest bump (#129), `actions/deploy-pages` 4 → 5 (#128).

**npm groupes (5 PRs)** : `eslint-prettier` (#138 — `eslint-plugin-n` 17→18), `typescript-tooling` (#137 — `@napi-rs/canvas` 0.1.100→1.0.0), `vitest`, `sveltekit`, `node-appwrite` 24→25 (#140) + `@commitlint/cli` 20.5.2→21.0.1 (#136) + `@commitlint/config-conventional` 20.5.0→21.0.1 (#139).

Suivi actif déplacé dans [Prochaines actions](#prochaines-actions) (vérif bumps majors + auto-merge patches).

### 2026-05-19 — Sync amarre upstream (PR #155)

L'app `amarre` dans atlas avait été importée le 2026-01-27 depuis `univ-lehavre/amarre`. Le dépôt standalone a ensuite reçu 3 commits le 2026-02-06 qui n'avaient pas été reportés. Synchronisation faite via PR #155.

- [x] Port `1db30df` — composante/labo signing requirements basés sur `invitation_type`
- [x] Port `8486e79` — mock test survey list avec `invitation_type`
- [x] Port `b035655` — wording du modal RGPD `CreateRequest.svelte` + lien vers formulaire

Suivi actif déplacé dans [Prochaines actions](#prochaines-actions) (vérifs dev) et [À arbitrer](#sort-du-dépôt-standalone-univ-lehavreamarre) (sort du standalone).
