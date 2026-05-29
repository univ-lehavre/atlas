# TODO — atlas

État des chantiers actifs et décisions structurantes sur le monorepo atlas.

> Pour le contexte technique (architecture, qualité, sécurité, collaboration),
> voir [`docs/`](docs/). Cette TODO ne couvre que **ce qui reste à faire**, **ce
> qui est en attente d'arbitrage**, et **les décisions** qui pilotent les futurs
> chantiers. Les détails de chaque chantier closé sont dans l'[Archive](#archive).

---

## Décisions clés

Les choix structurants du dépôt sont tracés sous forme d'**ADR**
(Architecture Decision Records) dans [`docs/decisions/`](docs/decisions/).

Chaque ADR isole une décision : contexte qui l'a forcée, alternative
écartée, conséquences assumées. C'est là qu'un contributeur retrouve le
« pourquoi » d'un choix sans fouiller l'historique Git.

Voir l'[index des ADR](docs/decisions/README.md) pour la liste complète.

---

## En cours / à faire

Items concrets et actionnables, par thème.

### Hors DevSecOps

- [ ] `packages/crf-project-template/` (trame déclarative avec Effect Schema).
- [ ] Helper TS pour parser le CSV REDCap + générer des fake records.
- [ ] Abstraction CLI partagée (réduire le boilerplate des CLIs citation-like).
- [ ] **`atlas-ui` : système de theming optionnel** — exposer des points
      d'extension (palettes Bootstrap custom, fontes, spacing). Pistes : variables
      CSS custom exposées par `@univ-lehavre/atlas-ui/client`, prop `theme` sur un
      composant racine, export SCSS, addon Storybook themes.
- [ ] **Dispatcher les tests entre les 5 niveaux et `atlas-ui`** — les tests
      level-1 UI dans `apps/amarre/tests/ui/` testent en réalité des composants
      d'`ui/atlas-ui/`. À migrer (avec les fixtures). Stories Storybook et tests
      level-1 partageraient les mêmes fixtures.
- [ ] **Brancher les niveaux 2 à 5 d'amarre sur pre-push et CI** — aujourd'hui
      seul N1 protège les PRs. Trade-off temps CI (~5 min ajoutés pour la stack
      docker) vs couverture réelle de la pyramide.
- [ ] **Dockeriser sillage-app dans sillage-sandbox** — service `app` dans le
      compose qui run sillage build-once et expose :5173. Prérequis pour les futurs
      services R/Python.
- [ ] **Parité visuelle amarre prod vs local** — divergences de couleurs/CSS
      depuis l'extraction vers `@univ-lehavre/atlas-ui` (PR #190). Lié au theming
      ci-dessus.
- [ ] **Réviser le workflow UI d'amarre — drift vs `univ-lehavre/amarre`
      standalone** — diff structurel à faire, statuer sur ce qui doit être porté
      dans atlas.
- [ ] **Publier les 7 CLIs sur GitHub Packages** (`atlas-citation-cli`,
      `atlas-net-cli`, `atlas-stats-cli`, `atlas-crf-stats-cli`,
      `atlas-researcher-profiles-cli`, `atlas-crf-cli`, `atlas-crf-openapi`) —
      n'ont jamais déclenché de release. Vérifier détection Changesets, créer un
      premier changeset par paquet, vérifier `pnpm release` pousse sur
      `npm.pkg.github.com`. Documenter l'install côté consommateur.
- [ ] **Sandbox amarre — dictionnaire CRF** : exporter le dictionnaire CRF
      minimum dans `sandbox/amarre-sandbox/fixtures/` + script d'import REDCap, pour
      automatiser entièrement `bootstrap-crf.sh`.
- [ ] **Couverture CLIs restantes** : appliquer la stratégie utilisée pour
      `cli/crf` (PR #214) et `cli/net` (PR #216) sur `cli/biblio` (0%),
      `cli/citation`, `cli/atlas-stats`, `cli/crf-stats`, `cli/researcher-profiles`.

### DevSecOps

Le **périmètre dépôt** est complet — voir
[ADR 0001](docs/decisions/0001-devsecops-perimetre-repo-sine-die.md).
Les items qui dépendent d'acteurs ou d'infrastructure externes sont
suivis sous [Reporté sine die](#reporté-sine-die--dépendances-externes).

### Audit `cli/crf` — étape suivante

- [ ] Tester `commands/api/index.ts` et `commands/server/index.ts` (bin entry
      points) — setup `@effect/cli` plus lourd que les autres fichiers. Couverture
      globale `cli/crf` actuellement à 64.6% statements ; ces deux fichiers la
      remonteraient au-delà de 90%.

### Actions manuelles UI GitHub

- [ ] Annoncer `brew install gitleaks` aux contributeurs pour le pre-commit
      local.

---

## Reporté sine die — dépendances externes

Items du chantier DevSecOps qui dépendent d'un acteur ou d'une
infrastructure hors du dépôt. Décision de cadrage :
[ADR 0001](docs/decisions/0001-devsecops-perimetre-repo-sine-die.md). Chaque
entrée précise **qui bloque** et **par quel signal** elle serait
réouverte.

- [ ] **Phase 5.1 RGPD** — enrichir si besoin la mention RGPD et données
      REDCap dans `SECURITY.md` ; référencer une politique sécurité
      institutionnelle existante si applicable.
  - **Bloquant** : décision projet sur le périmètre RGPD à documenter.
  - **Débloque par** : demande conformité, audit RGPD, arbitrage
    [À arbitrer → RGPD / PRIVACY.md](#rgpd--privacymd).
- [ ] **Phase 5.2 CODEOWNERS** — nominer un second mainteneur
      (bus-factor=1 actuellement).
  - **Bloquant** : décision projet sur l'équipe étendue.
  - **Débloque par** : arrivée d'un second contributeur durable.
- [ ] **Phase 5.3 branch protection (tightening)** : signatures de
      commits requises ; codeowners review obligatoire ; règles incluant
      les administrateurs.
  - **Bloquant** : configuration GPG/SSH côté contributeurs + second
    mainteneur (Phase 5.2).
  - **Débloque par** : levée de Phase 5.2 + configuration GPG distribuée.
- [ ] **Phase 6.1 environnements** — Appwrite Sites depuis `main`
      uniquement ; preview par PR ou site `staging` depuis branche
      protégée.
  - **Bloquant** : opérateurs infra Appwrite.
  - **Débloque par** : revue de la chaîne de déploiement Appwrite Sites.
- [ ] **Phase 6.3 validation externe** — valider headers HTTP avec
      [securityheaders.com](https://securityheaders.com) (objectif note A)
      et [Mozilla Observatory](https://observatory.mozilla.org).
  - **Bloquant** : déploiement stable avec URLs publiques figées (Phase 6.1).
  - **Débloque par** : levée de Phase 6.1.
- [ ] **Phase 7.1 nightly ZAP** — arbitrer entre (a) nightly contre prod
      (URLs figées + opérateurs infra prévenus), (b) nightly contre
      `sandbox/amarre-sandbox/` (lourd CI, couvre amarre seul), (c) PR
      previews (hors périmètre Appwrite Sites).
  - **Bloquant** : décision sur la cible (Phase 6.1) + budget CI.
  - **Débloque par** : levée de Phase 6.1.
- [ ] **Phase 7.3 revue trimestrielle** — checklist : alertes CodeQL,
      déps obsolètes, headers HTTP, logs Appwrite, accès secrets.
  - **Bloquant** : poser un rappel calendrier ou `/schedule` ; nécessite
    un second mainteneur (Phase 5.2) pour partager la charge.
  - **Débloque par** : levée de Phase 5.2 ou décision de tenir la revue en
    solo.
- [ ] **Phase 8.1 alerting Appwrite** — confirmer auprès des opérateurs
      infra qui consulte les logs et à quelle fréquence ; brancher
      alertes 5xx/latence/auth-fail (seuils dans le runbook).
  - **Bloquant** : opérateurs infra Appwrite.
  - **Débloque par** : prise de contact ops Appwrite.
- [ ] **Phase 8.3 sauvegarde** — confirmer hébergement Appwrite
      (self-hosted vs Cloud), figer politique (fréquence, rétention,
      géo), valider RPO/RTO. Premier test de restauration dans les 12
      mois via `sandbox/amarre-sandbox/`.
  - **Bloquant** : opérateurs infra Appwrite.
  - **Débloque par** : prise de contact ops Appwrite.

---

## À arbitrer

Items qui demandent une décision avant action.

### RGPD / PRIVACY.md

Initialement retiré du périmètre PR #127 (« le repo est du code, pas une
politique RGPD »). Cadrage à reprendre :

- Métadonnées des commits (emails contributeurs externes) : suffit-il d'un
  renvoi vers la politique GitHub ?
- Données collectées par les apps déployées (amarre, ecrin, find-an-expert) :
  relève des apps elles-mêmes — où documenter ?
- Dépendances tierces appelant des services externes (OpenAlex, Appwrite…) :
  à inventorier.
- Logs Appwrite (IP, user-agent) : qui est responsable de traitement ?
- Forme : un `PRIVACY.md` racine ? Une politique par app ? Renvoi vers une
  politique institutionnelle existante ?
- Identifier le **responsable de traitement** (probablement les opérateurs
  d'infrastructure, pas le repo lui-même).

### Security champion CodeQL

- Nommer un **security champion** responsable du triage des alertes CodeQL.
- Idéalement un second mainteneur pour le bus-factor (cf. CODEOWNERS).

---

## Archive

Historique des chantiers closés, par ordre antéchronologique.

### 2026-05-29 — Finalisation DevSecOps + factories auth

- **Phase 4.3** — `push: main` décommenté dans
  [.github/workflows/release.yml](.github/workflows/release.yml) : les merges
  sur `main` consommant un changeset déclenchent désormais la PR « chore:
  version packages » puis la publication avec provenance OIDC.
- **Phase 1.2 Semgrep** — workflow
  [.github/workflows/semgrep.yml](.github/workflows/semgrep.yml) sur PR avec
  `p/typescript`, `p/svelte`, `p/owasp-top-ten`. Semgrep installé via
  `pip install semgrep==1.137.0` (épinglé). Mode `--severity=ERROR` ; les
  WARNING restent visibles mais n'empêchent pas le merge.
- **Phase 1.1 lint Svelte strict** — durcissement de
  [config/shared-config/eslint/svelte.js](config/shared-config/eslint/svelte.js) :
  `svelte/no-at-html-tags`, `svelte/no-target-blank`, `svelte/no-dom-manipulating`,
  `svelte/no-svelte-internal`, `svelte/no-unused-svelte-ignore`,
  `svelte/button-has-type`, `svelte/require-each-key` passés à `error`. Couvre
  XSS, reverse-tabnabbing, supply chain et a11y — compense la non-couverture
  des `.svelte` par CodeQL. Fix collatéral : `ConnectivityBanner.svelte` reçoit
  `rel="noopener noreferrer"`.
- **Phase 6.2 env vars** — nouvelle section
  [docs/quality/security.md](docs/quality/security.md) sur la discipline
  `PUBLIC_*` vs privé en SvelteKit, recensement croisé du parc de variables
  d'env du dépôt + script d'audit.
- **Phase 7.2 tests sécurité étendus** — anti-XSS smoke sur FAE
  `/institutions/search` (vérifie que la query n'est pas réfléchie dans le
  body, ni en happy path ni en erreur), 401 sur ecrin `/auth/delete` et
  `/users` (handlers AUTH non couverts par les factories — ecrin `/me` est
  couvert par #222).

### 2026-05-29 — Factories auth (login/logout/signup/me)

- **#219** — `createLoginHandler` + `createLogoutHandler` extraits dans
  `@univ-lehavre/atlas-auth/handlers`. amarre + ecrin
  `/api/v1/auth/{login,logout}` passent de ~20 lignes à 3. find-an-expert
  non migrée (envelope `{ loggedIn: true }` sans wrap `{ data, error }`).
- **#220** — `createSignupHandler` avec 3 stratégies (`extractEmail`,
  `validateEmail`, `signupWithEmail` qui reçoit l'event complet) +
  `rateLimit` configurable. amarre passe à 9 lignes ; ecrin idem avec
  `extractEmail` `FormData` override. `createdAt` désormais exposé sur ecrin
  (changement additif). Suppression des tests amarre redondants de #218.
- **#221** — Refonte du README de `packages/auth` autour des deux niveaux
  d'API (service bas niveau + handlers haut niveau), correction du champ
  `appwrite:` → `baas:`, retrait du framing institutionnel.
- **#222** — `createMeHandler` ferme le quartet. amarre + ecrin `/me` passent
  à 3 lignes ; ecrin gagne un fix d'erreur (anciennement `console.log` + 500
  systématique → mapping HTTP correct via `mapErrorToApiResponse`).

### 2026-05-28 — Couverture CLIs et sandbox/sillage volumes

- **#214** — `cli/crf` couverture **10.5% → 64.6% statements** (`shared/terminal`
  - `shared/context` + `commands/api/commands` testés). Au passage : 2 hints
    knip `Remove from ignore` nettoyés.
- **#215** — `sandbox/sillage-sandbox/` : volumes nommés Appwrite/MongoDB passés
  en anonymes, `scripts/start.sh` wipe en début de session. Cold-bootstrap par
  défaut, contourne le bug d'idempotence Appwrite après down/up.
- **#216** — `cli/net` couverture **0% → 50.5% statements** (`output/steps` et
  `config/context` à 100% ; `runDiagnostics` exporté et testé via mock
  `@univ-lehavre/atlas-net`).

### 2026-05-27 — Refonte monorepo + documentation

- **#211** — Catégorie `assets/` créée (8ᵉ) ; `packages/logos` splitté en
  `assets/logos` + `cli/logos` (atlas-logos-cli@1.0.0). `ui/atlas-ui` déclare
  `svelte` en peerDeps. README et `docs/` refondus pour un public non-expert.
  Framing institutionnel retiré, jargon DevSecOps "Phase X.Y" nettoyé.
  Placeholders apps et zero-trust.md supprimés.
- **#212** — `CONTRIBUTING.md` et `SECURITY.md` alignés (refs institutionnelles
  retirées, URLs doc converties en chemins relatifs).
- **#213** — Nettoyage hints knip (`packages/citation`, `sandbox/crf-sandbox-core`).

### Sprints DevSecOps — vue d'ensemble (clôturés 2026-05-26)

À l'issue des Sprints 1-4, le dépôt satisfait honnêtement le qualificatif
**DevSecOps** pour la partie développement et déploiement (amarre, ecrin,
find-an-expert).

**Sprint 1 — Bloquants sécurité** : audit token REDCap, inventaire secrets,
surfaces exposées (PR #171), Secret Scanning + Push Protection + Dependabot
alerts (activés via API GitHub 2026-05-19), `SECURITY.md` (PR #127), branch
protection main (2026-05-19).

**Sprint 2 — Fondations** : CodeQL (PR #156), politique triage / SLA
(2026-05-26), Dependabot + auto-merge patches, Dependency Review Action
(PR #161), pin GitHub Actions par SHA (PR #127, #156, #161), permissions
minimales par job.

**Sprint 3 — Supply chain et Appwrite** : npm provenance via OIDC (2026-05-22),
SBOM CycloneDX (2026-05-22), headers HTTP de sécurité (PR #171,
`connect-src` tightening 2026-05-26), cookies session hardening + CSRF
(PR #171), gitleaks (PR #127, stabilisation #141/#143/#144/#145).

**Sprint 4 — Finalisation** : OWASP ZAP baseline en `workflow_dispatch`
(2026-05-26), rate limiting (branche `devsecops/rate-limiting-phase-6-5`),
tests sécurité handlers rate-limités + `hooks.server.ts` × 3 apps, runbook
incident (2026-05-26), CODEOWNERS (PR #127), `CONTRIBUTING.md` (PR #127).

**Hors plan initial** : dédup `authService` × 3 apps (~150 lignes), dédup baas
client × 2 apps (~80 lignes), dédup `BaasUserRepository` × 2 apps, dédup
validators auth, fix logos `vite-plugin-static-copy` → prepare script
(PR #157), bumps apps white background header/footer (PR #159), Dependabot
noise reduction, cleanup knip + dette cosmétique (PR #160).

### 2026-05-22 — Triage CodeQL post-#194

39 alertes inventoriées (vs « 25+4 » estimés au lancement). **26 dismissées +
13 fixes code** sur la branche `codeql/triage-post-194`.

**Fix code** : 5 × `js/insecure-temporary-file` (`mkdtempSync`) dans
`packages/citation-validate/`, 2 × `js/shell-command-*` (`execFileSync`) dans
`cli/crf-openapi/`, 1 × `js/file-system-race` (TOCTOU
`existsSync`+`writeFileSync` → `try { readFileSync } catch (ENOENT)`) dans
`apps/amarre/scripts/manage-baselines.ts`, 1 × `js/comparison-between-incompatible-types`
(branche redondante supprimée), 4 × `js/unused-local-variable`.

**Dismissals** : 9 × `js/polynomial-redos` dans `cli/crf-openapi` (won't fix,
outil offline, input trusted), 16 × `js/file-access-to-http` dans
tests/sandbox (used in tests), 1 × false positive sur
`packages/atlas-stats/src/github.ts` (URL hardcodée, header `Authorization`
seul vient du fichier).

### 2026-05-19 — Faux positifs Gitleaks (saga 5 PRs)

L'historique du dépôt (migration trademark #125 + renames antérieurs)
contenait de nombreux paths obsolètes matchant les règles gitleaks. Saga
close après cinq PRs :

- **#141** (41 findings) — règle `redcap-api-token` durcie (contexte
  d'affectation requis) + allowlist `\.md$` + patterns fixtures.
- **#143** (26) — allowlist path élargie en `(?:^|/)tests/fixtures/`.
- **#144** (18) — **changement de stratégie** : scan push main en mode diff
  (`before..after`) au lieu de l'historique complet.
- **#145** (18 → 0) — allowlist ciblée des 3 paths historiques restants
  (préféré à `git filter-repo` jugé disproportionné pour des fixtures).

**Stratégie finale** documentée dans `.github/workflows/gitleaks.yml` et
`.gitleaks.toml` :

- Sur **PR** : scan du diff de la PR (`base.sha..head.sha`).
- Sur **push main** : scan des nouveaux commits du push (`before..after`).
- Sur **workflow_dispatch** : scan complet de l'historique, à lancer pour
  audit ponctuel (renvoie maintenant **0 finding**).

### 2026-05-19 — Dependabot premier passage

8 PRs ouvertes par le premier run, toutes mergées :

- **GitHub Actions (3)** : `actions/upload-pages-artifact` 4 → 5 (#130),
  `pnpm/action-setup` digest bump (#129), `actions/deploy-pages` 4 → 5 (#128).
- **npm groupes (5)** : eslint-prettier (#138 — `eslint-plugin-n` 17→18),
  typescript-tooling (#137 — `@napi-rs/canvas` 0.x→1.x validé à l'exécution),
  vitest, sveltekit, `node-appwrite` 24→25 (#140) + `@commitlint/cli`
  20.5.2 → 21.0.1 (#136) + `@commitlint/config-conventional` 20.5.0 → 21.0.1
  (#139).

### 2026-05-19 — Sync amarre upstream (PR #155)

L'app `amarre` dans atlas avait été importée le 2026-01-27 depuis
`univ-lehavre/amarre`. Le dépôt standalone a ensuite reçu 3 commits le
2026-02-06 qui n'avaient pas été reportés. Synchronisation faite via PR #155 :

- `1db30df` — composante/labo signing requirements basés sur `invitation_type`.
- `8486e79` — mock test survey list avec `invitation_type`.
- `b035655` — wording du modal RGPD `CreateRequest.svelte` + lien vers
  formulaire.
