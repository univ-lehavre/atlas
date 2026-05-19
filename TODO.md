# TODO — Passage à DevSecOps

Plan détaillé pour ajouter la couche "Sec" au pipeline existant (CI GitHub Actions + CD Appwrite Sites pour amarre et ecrin).

État actuel : Sprint 1 + une grosse partie du Sprint 2/3 livrés via PR #127 (devsecops hardening). Restent les workflows SAST/DAST (CodeQL, ZAP), la supply chain avancée (provenance OIDC, SBOM), le durcissement runtime Appwrite (headers HTTP, rate limit) et la gouvernance UI GitHub (branch protection, Secret Scanning).

---

## Backlog d'issues à créer

Items différés (issus de la PR #127, trop volumineux pour y être inclus — chacun mérite sa propre PR/issue) :

**Hors DevSecOps**

- [ ] `packages/crf-project-template/` (trame déclarative avec Effect Schema)
- [ ] Helper TS pour parser le CSV REDCap + générer des fake records
- [ ] Abstraction CLI partagée (réduire le boilerplate des 3 CLIs citation-like)
- [ ] Tests `bin/` pour `cli/crf` (couverture 22.7% → 50%+)

**DevSecOps (renvoient aux phases ci-dessous)**

- [ ] Phase 1 — CodeQL workflow (voir [§1.1](#11-codeql))
- [ ] Phase 4.3 — npm provenance via OIDC (voir [§4.3](#43-npm-provenance-via-oidc))
- [ ] Phase 4.4 — SBOM CycloneDX (voir [§4.4](#44-sbom-software-bill-of-materials))
- [ ] Phase 5.3 — branch protection sur `main` (UI GitHub, voir [§5.3](#53-branch-protection-sur-main))
- [ ] Phase 6 — HTTP headers + rate limit (par app, voir [§6.3](#63-en-têtes-http-de-sécurité) et [§6.5](#65-rate-limiting))
- [ ] Phase 7 — OWASP ZAP baseline (voir [§7.1](#71-owasp-zap-baseline))
- [ ] Phase 8 — observabilité + runbook incident (voir [§8](#phase-8--observabilité-et-réponse-aux-incidents))

---

## Suivi immédiat post-PR #127

### Workflows du merge sur main

- [x] CI : success
- [x] Deploy Documentation : success (fix VitePress validé)
- [x] Release : success
- [ ] **Gitleaks : failure** — 41 leaks détectés sur l'historique (cf. ci-dessous)

### Faux positifs Gitleaks à traiter

Le scan trouve 41 findings sur 2 fichiers, **tous des fixtures de documentation/JSDoc** (pas de vrais secrets) :

- `packages/redcap-api/src/brands.ts:15` (commit `ab05c13`, 2026-01-22) — `RedcapToken('A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4')` dans un bloc `@example` JSDoc
- `docs/api/redcap-api.md:43` (commits `553d38c`, `160d3cf`, 2026-01-20) — `RedcapToken('ABCDEF0123456789ABCDEF0123456789')` dans un exemple de doc

Cause : la règle `redcap-api-token` dans [.gitleaks.toml](.gitleaks.toml) matche tout pattern `[A-F0-9]{32}` proche du mot-clé `redcap`, sans exiger de contexte d'affectation.

**Options de correction** (cf. discussion conversationnelle) :

| Option                                                                                       | Avantage                          | Inconvénient                                       |
| -------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------- |
| A. Allowlist regex des patterns fixture (`A1B2C3D4…`, `ABCDEF01…`) + path `\.md$`            | Ciblé, durable, couvre futurs cas | Maintenir la liste si nouveaux patterns            |
| B. Allowlist par commit fingerprints (les 41)                                                | Précis, n'élargit rien            | Ne couvre pas un dev recopiant le même exemple     |
| C. Durcir la règle : exiger un contexte d'assignation (`token\s*[:=]\s*['"]?([A-F0-9]{32})`) | Le plus propre, zéro bruit en doc | Peut louper des contextes légitimes (CSV, header…) |

**Recommandation** : A + C — allowlist patterns + path `\.md$` + durcissement de la règle pour exiger un contexte d'affectation.

- [ ] Appliquer la correction `.gitleaks.toml` (option recommandée A+C)
- [ ] Relancer `gitleaks detect --source . --log-opts="--all"` localement → vérifier 0 finding
- [ ] Commit + push → vérifier que le workflow Gitleaks passe sur main
- [ ] Documenter la décision (commentaires dans `.gitleaks.toml` ou note dans `SECURITY.md`)

### Dependabot — premier passage

8 PRs ouvertes par le premier run de `.github/dependabot.yml` :

**GitHub Actions** (3 PRs — déjà CI verte + Gitleaks vert, mergeables)

- [ ] `actions/upload-pages-artifact` 4 → 5
- [ ] `pnpm/action-setup` digest bump
- [ ] `actions/deploy-pages` 4 → 5

**npm groupes** (5 PRs)

- [ ] `eslint-prettier` (3 updates)
- [ ] `typescript-tooling` (2 updates)
- [ ] `vitest` (3 updates)
- [ ] `sveltekit` (4 updates)
- [ ] 1 PR `npm_and_yarn` supplémentaire (dependabot update encore en cours au moment du check)

### RGPD / PRIVACY.md (à arbitrer)

Initialement retiré du périmètre de la PR #127 (_"le repo est du code, pas une politique RGPD"_). À reprendre comme item indépendant, en se posant d'abord la question du **cadrage** :

- [ ] Cadrer le périmètre : ce repo héberge du **code source**, pas des données personnelles. Mais des considérations indirectes existent — à trancher pour chacune :
  - Métadonnées des commits (email des contributeurs externes) : suffit-il d'un renvoi vers la politique GitHub ?
  - Données collectées par les apps déployées (amarre, ecrin, find-an-expert) : relève des **apps** elles-mêmes, pas du repo — où documenter ?
  - Dépendances tierces appelant des services externes (OpenAlex, Appwrite, Sentry si activé…) : à inventorier
  - Logs côté Appwrite (IP, user-agent…) : qui est responsable de traitement ?
- [ ] Décider : un seul `PRIVACY.md` à la racine ? Une politique par app dans `apps/*/PRIVACY.md` ? Ou renvoi vers une politique ULHN existante ?
- [ ] Identifier le **responsable de traitement** (probablement l'Université Le Havre Normandie / DSI, pas le repo lui-même)
- [ ] Rédiger le contenu une fois le cadrage figé (sortir du périmètre TODO si délégué à la DSI)

### Actions manuelles UI GitHub à planifier

Issus du test plan de la PR #127, à faire dans Settings GitHub :

- [ ] Activer **Secret Scanning** + **Push Protection** (Settings → Code security)
- [ ] Activer **branch protection** sur `main` (Settings → Branches) avec CODEOWNERS review + status checks requis
- [ ] Annoncer `brew install gitleaks` aux contributeurs pour le pre-commit local

---

## Phase 0 — Vérifications préalables (à faire en premier)

### 0.1 Audit du token REDCap à la racine

- [x] Vérifier que `redcap-token.csv` est bien dans `.gitignore` — couvert par le pattern `*-token.csv` (ligne 59)
- [x] Vérifier qu'il n'a jamais été commité : `git log --all --full-history -- redcap-token.csv` — aucun historique
- [ ] Si commité un jour : rotation immédiate du token côté REDCap + purge de l'historique (`git filter-repo`) + force-push coordonné avec l'équipe — N/A
- [ ] Déplacer le fichier hors du dépôt (ex : `~/.config/atlas/redcap-token.csv`) et adapter le chargement applicatif

### 0.2 Inventaire des secrets en circulation

- [ ] Lister tous les secrets attendus : tokens REDCap, clés OpenAlex authentifiées, clés Appwrite, `TURBO_TOKEN`, identifiants GitHub
- [ ] Pour chacun : noter où il est stocké (Appwrite console, GitHub Secrets, fichier local) et qui y a accès
- [ ] Documenter la procédure de rotation dans `docs/security/secrets.md`

### 0.3 Cartographie des surfaces exposées

- [ ] Lister les URLs Appwrite Sites de prod (amarre, ecrin) et de preview éventuelles
- [ ] Lister les endpoints API publics dans [apps/find-an-expert/src/routes/api/](apps/find-an-expert/src/routes/api/)
- [ ] Identifier les routes nécessitant authentification vs publiques

---

## Phase 1 — Sécurité du code (SAST)

### 1.1 CodeQL

- [ ] Créer `.github/workflows/codeql.yml` avec langages `javascript-typescript`
- [ ] Déclencheurs : `push` sur main, `pull_request` sur main, `schedule` hebdomadaire
- [ ] Activer les query suites `security-extended` et `security-and-quality`
- [ ] Vérifier que les alertes remontent dans l'onglet Security du dépôt GitHub
- [ ] Définir un _security champion_ responsable du triage des alertes

### 1.2 Semgrep (optionnel, complémentaire)

- [ ] Évaluer Semgrep avec les règles `p/typescript`, `p/svelte`, `p/owasp-top-ten`
- [ ] Si retenu : workflow `.github/workflows/semgrep.yml` sur PR uniquement (pas en push pour limiter le bruit)

### 1.3 Politique de triage

- [ ] Définir un SLA de remédiation par sévérité (critical : 7j, high : 30j, medium : trimestre)
- [ ] Documenter dans `SECURITY.md` (voir phase 5)

---

## Phase 2 — Secrets

### 2.1 GitHub natif

- [ ] Activer **Secret Scanning** : Settings → Code security → Secret scanning
- [ ] Activer **Push Protection** : bloque les push contenant des secrets détectés
- [ ] Activer **Dependabot alerts** et **security updates** au passage

### 2.2 Gitleaks en CI et pre-commit

- [x] Ajouter `gitleaks` au pre-commit lefthook (workflow rapide sur fichiers staged) — `lefthook.yml`, tolérant à l'absence locale du binaire
- [x] Workflow `.github/workflows/gitleaks.yml` sur PR (scan complet de l'historique des commits de la PR) — via `gitleaks-action@v2.3.9` épinglé SHA
- [x] Créer `.gitleaks.toml` avec règles custom pour les patterns REDCap (token 32 char hex) et Appwrite — règles custom + allowlist

### 2.3 Audit historique

- [ ] Lancer `gitleaks detect --source . --log-opts="--all"` une fois pour scanner tout l'historique
- [ ] Traiter chaque finding : rotation, purge si nécessaire, ajout en whitelist sinon

---

## Phase 3 — Dépendances (SCA)

### 3.1 Dependabot

- [x] Créer `.github/dependabot.yml` avec écosystèmes : `npm` (groupé par workspace), `github-actions` — schedule lundi 6h Europe/Paris
- [x] Stratégie : groupage des minors/patches, PRs séparées pour les majors
- [ ] Auto-merge des patches après CI verte (via workflow ou GitHub native)

### 3.2 Dependency Review Action

- [ ] Workflow `.github/workflows/dependency-review.yml` déclenché sur `pull_request`
- [ ] Bloquer les vulnérabilités `high` et au-dessus
- [ ] Bloquer les licences non listées dans l'allowlist (à définir : MIT, Apache-2.0, BSD-\*, ISC, MPL-2.0…)

### 3.3 Renforcement de `pnpm audit`

- [ ] Passer `audit:security` de `--audit-level=high` à `--audit-level=moderate`
- [ ] Garder le pre-push hook mais ajouter une exception documentée pour les alertes acceptées (`pnpm audit --ignore`)

---

## Phase 4 — Durcissement de la supply chain

### 4.1 Épingler les GitHub Actions par SHA

- [x] Remplacer `actions/checkout@v6` → `actions/checkout@<sha> # v6.x.x`
- [x] Idem pour `pnpm/action-setup@v5`, `actions/setup-node@v6`, `actions/cache@v5` (10 occurrences pinées dans la PR #127)
- [x] Intégrer dans Dependabot (`github-actions` ecosystem) — fait via `.github/dependabot.yml`
- [x] Concerne : [.github/workflows/ci.yml](.github/workflows/ci.yml), [.github/workflows/docs.yml](.github/workflows/docs.yml), [.github/workflows/release.yml](.github/workflows/release.yml), [.github/workflows/gitleaks.yml](.github/workflows/gitleaks.yml)

### 4.2 Permissions minimales par job

- [x] Actuellement `permissions: contents: read` au top de ci.yml
- [x] `permissions:` explicites présents dans `release.yml`, `docs.yml`, `gitleaks.yml`
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

- [ ] Settings → Branches → Add rule pour `main`
- [ ] Require PR review (1 minimum, codeowners review pour les paths couverts)
- [ ] Require status checks : `lint`, `typecheck`, `test`, `build`, `audit`, `CodeQL`, `dependency-review`, `gitleaks`
- [ ] Require signed commits (gpg ou ssh signing)
- [ ] Block force-push
- [ ] Inclure les administrateurs dans les règles

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

- [ ] Configurer dans Appwrite Sites (ou via `hooks.server.ts` SvelteKit) :
  - `Content-Security-Policy` (script-src, style-src, img-src, connect-src — y compris l'API Appwrite, OpenAlex)
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` (désactiver caméra, micro, géoloc si non utilisés)
  - `X-Frame-Options: DENY` (ou via CSP `frame-ancestors`)
- [ ] Valider avec [securityheaders.com](https://securityheaders.com) — objectif : note A minimum
- [ ] Tester aussi avec [Mozilla Observatory](https://observatory.mozilla.org)

### 6.4 Authentification et sessions

- [ ] Cookies de session : `HttpOnly`, `Secure`, `SameSite=Lax` (ou `Strict`)
- [ ] Vérifier les flux d'auth dans [packages/auth/](packages/auth/) — pas de tokens en localStorage
- [ ] Protection CSRF sur les formulaires (SvelteKit gère nativement avec `actions`)

### 6.5 Rate limiting

- [ ] Mettre en place rate limiting sur les endpoints publics : voir [apps/find-an-expert/src/routes/api/](apps/find-an-expert/src/routes/api/)
- [ ] Solution : via Appwrite Functions, middleware SvelteKit, ou Cloudflare devant si applicable

---

## Phase 7 — DAST et tests de sécurité dynamiques

### 7.1 OWASP ZAP baseline

- [ ] Workflow `.github/workflows/zap-baseline.yml`
- [ ] Déclencheur : nightly sur prod, ou sur les URLs de preview après déploiement Appwrite
- [ ] Action : `zaproxy/action-baseline@<sha>` avec l'URL cible
- [ ] Remonter le rapport dans les artefacts GitHub Actions
- [ ] Définir le seuil d'échec (faux positifs gérés via `.zap/rules.tsv`)

### 7.2 Tests de sécurité applicatifs

- [ ] Ajouter quelques tests Vitest spécifiques :
  - Vérification que les routes API rejettent les payloads malformés
  - Vérification que les endpoints authentifiés renvoient 401 sans token
  - Vérification de l'absence de réflexion brute des inputs utilisateurs (anti-XSS basique)

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

- Phase 1.1 (CodeQL)
- Phase 3.1, 3.2 (Dependabot + dependency-review)
- Phase 4.1, 4.2 (pin actions, permissions)

**Sprint 3 (1 semaine — supply chain et Appwrite)**

- Phase 4.3, 4.4 (provenance, SBOM)
- Phase 6.3, 6.4 (headers HTTP, cookies)
- Phase 2.2 (gitleaks)

**Sprint 4 (1 semaine — finalisation)**

- Phase 7.1 (ZAP baseline)
- Phase 6.5 (rate limiting)
- Phase 8 (observabilité, runbook)
- Phase 5.2, 5.4 (CODEOWNERS, CONTRIBUTING)

À l'issue des 4 sprints, le dépôt satisfait honnêtement le qualificatif **DevSecOps** pour la partie développement _et_ déploiement (amarre, ecrin).
