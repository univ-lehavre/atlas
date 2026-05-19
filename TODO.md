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

---

## Backlog d'issues à créer

Items différés (issus de la PR #127, trop volumineux pour y être inclus — chacun mérite sa propre PR/issue) :

**Hors DevSecOps**

- [ ] `packages/crf-project-template/` (trame déclarative avec Effect Schema)
- [ ] Helper TS pour parser le CSV REDCap + générer des fake records
- [ ] Abstraction CLI partagée (réduire le boilerplate des 3 CLIs citation-like)
- [ ] Tests `bin/` pour `cli/crf` (couverture 22.7% → 50%+)
- [ ] Déplacement des composants UI des apps vers un package partagé (extraire les composants Svelte communs hors de `apps/*/src/lib/components/` vers un `packages/ui/` ou équivalent — à cadrer : périmètre, conventions de styling/theming, gestion des dépendances Svelte/SvelteKit)
- [ ] `sandbox/amarre-sandbox/` (environnement Docker local Amarre + Appwrite + REDCap, voir [§Sandbox Amarre](#sandbox-amarre--appwrite--crf-en-local))

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

- [ ] Squelette `sandbox/amarre-sandbox/` : `docker-compose.yaml` (avec `include:` de `../crf-sandbox/docker-compose.yaml`), `README.md`, `package.json`, scripts
- [ ] Stack Appwrite self-hosted ajoutée au compose (image officielle, ~10 conteneurs : mariadb, redis, traefik, workers) — vérifier l'empreinte RAM et documenter le `docker compose up` initial (1-2 min)
- [ ] Script `bootstrap-appwrite.sh` : crée le projet Appwrite, la clé API serveur, configure le domaine autorisé (`localhost:5173`), écrit `PUBLIC_APPWRITE_ENDPOINT` / `PUBLIC_APPWRITE_PROJECT` / `APPWRITE_KEY` dans `apps/amarre/.env.local`
- [ ] Script `bootstrap-crf.sh` : réutilise `pnpm -F crf-sandbox docker:install`, crée un projet de test avec le bon dictionnaire de données Amarre, génère le token, écrit `PUBLIC_REDCAP_URL` / `REDCAP_API_TOKEN` dans `apps/amarre/.env.local`
- [ ] Script `bootstrap.sh` orchestrateur : up de la stack, attente healthchecks, bootstrap Appwrite + CRF, affichage des credentials
- [ ] Décider si Amarre tourne en `pnpm -F amarre dev` sur l'hôte (rapide à itérer) ou dans un conteneur (plus reproductible) — recommandation par défaut : sur l'hôte, conteneurisation optionnelle plus tard
- [ ] Documentation du dictionnaire de données minimal côté CRF pour qu'Amarre fonctionne (champs attendus par les API routes `apps/amarre/src/routes/api/v1/`)

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
- [x] Auto-merge des patches après CI verte — [.github/workflows/dependabot-auto-merge.yml](.github/workflows/dependabot-auto-merge.yml) ; couvre patches partout + minors sur devDeps. Validé en prod via auto-merge de PR #149 le 2026-05-19. Prérequis Settings : *Allow auto-merge* à activer côté UI.

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
- [x] **Dette test partiellement résolue** : tests handler ajoutés en Phase 7.2 pour les 6 endpoints rate-limités → couverture globale remontée, seuils restaurés à leur valeur d'origine (amarre 42/52/36/43, ecrin 28/18/27/28). Reste à tester `hooks.server.ts` (les 5 headers de sécurité) — cf. Phase 7.2.
- [ ] Valider avec [securityheaders.com](https://securityheaders.com) — objectif : note A minimum (après déploiement)
- [ ] Tester aussi avec [Mozilla Observatory](https://observatory.mozilla.org)

### 6.4 Authentification et sessions

- [x] Cookies de session : `httpOnly: true` (rendu explicite — était implicite via le default SvelteKit), `secure: true`, `sameSite: 'strict'` (plus strict que minimum Lax), `path: '/'`, `expires` — appliqué dans les 4 setters (`packages/auth/src/index.ts` + services des 3 apps).
- [x] Vérifier les flux d'auth — aucun `localStorage` ni `sessionStorage` dans tout le repo (audit `grep -rn` sur apps + packages clean). Cookies UI find-an-expert (theme, font, dark-mode, locale) en `SameSite=Lax`, sans `Secure` — non sensible, lus côté client par design.
- [x] Protection CSRF — SvelteKit `csrf: { checkOrigin: true }` actif par défaut (aucun override dans les `svelte.config.js`). Confirmé par audit.
- [ ] **À noter** : duplication du code de gestion de session entre `packages/auth/src/index.ts` (factory `createAuthService`) et les 3 services par app — ces derniers n'utilisent pas le factory partagé. Pas critique mais à dédupliquer dans un futur refactor pour éviter la dérive.

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
- [ ] **Étendre** : test handler `hooks.server.ts` qui mocke `createSessionClient` et vérifie les 5 headers de sécurité (Phase 6.3)

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

**Sprint 1 (1 semaine — bloquants sécurité)**

- Phase 0 complète (audit token, secrets, surfaces)
- Phase 2.1 (GitHub Secret Scanning + Push Protection)
- Phase 5.1 (SECURITY.md) et 5.3 (branch protection minimale)

**Sprint 2 (1 semaine — fondations)**

- Phase 1.1 (CodeQL) — ✅ livré via PR #156
- Phase 3.1, 3.2 (Dependabot + dependency-review)
- Phase 4.1, 4.2 (pin actions, permissions)

**Sprint 3 (1 semaine — supply chain et Appwrite)**

- Phase 4.3, 4.4 (provenance, SBOM)
- Phase 6.3, 6.4 (headers HTTP, cookies)
- Phase 2.2 (gitleaks) — ✅ livré via PR #127 + cycle de stabilisation #141/#143/#144/#145

**Sprint 4 (1 semaine — finalisation)**

- Phase 7.1 (ZAP baseline)
- Phase 6.5 (rate limiting)
- Phase 8 (observabilité, runbook)
- Phase 5.2, 5.4 (CODEOWNERS, CONTRIBUTING)

À l'issue des 4 sprints, le dépôt satisfait honnêtement le qualificatif **DevSecOps** pour la partie développement _et_ déploiement (amarre, ecrin).

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
