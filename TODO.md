# TODO — atlas

État des chantiers actifs et décisions structurantes sur le monorepo atlas.

> Pour le contexte technique (architecture, qualité, sécurité, collaboration),
> voir [`docs/`](docs/). Cette TODO ne couvre que **ce qui reste à faire**, **ce
> qui est en attente d'arbitrage**, et **les décisions** qui pilotent les futurs
> chantiers. Les détails de chaque chantier closé sont dans l'[Archive](#archive).

---

## Décisions clés

Choix structurants pris au fil des chantiers, conservés ici pour que tout
contributeur retrouve le « pourquoi » sans avoir à fouiller l'historique.

### Architecture / techno

- **2026-05-27** — Monorepo organisé en **8 catégories** (`apps`, `assets`,
  `packages`, `services`, `cli`, `ui`, `config`, `sandbox`) avec règles enforcées
  par `pnpm audit:structure`. Voir [docs/architecture/monorepo.md](docs/architecture/monorepo.md). PR #211.
- **2026-05-27** — `packages/logos` splitté en **`assets/logos`** (fichiers statiques
  uniquement) + **`cli/logos`** (CLI d'installation). Permet d'enforcer la règle
  « pas de `bin` dans `packages/` ». PR #211.
- **2026-05-28** — **Volumes anonymes** dans `sandbox/sillage-sandbox/` (Appwrite
  - MongoDB). Cold-bootstrap ~30-60s par `pnpm start`, accepté en échange de
    l'isolation d'état. Contourne le bug Appwrite après down/up. PR #215.
- **Effect** pour la programmation fonctionnelle ; les erreurs sont des valeurs
  typées, pas des exceptions. Patterns Effect/Hono explicitement autorisés malgré
  les règles ESLint fonctionnelles strictes.
- **SvelteKit** pour toutes les apps (rendu serveur + navigateur depuis une seule
  source) ; **Hono** pour les services HTTP ; **Bootstrap** comme système de design
  de base.
- **REDCap** (CRF) pour les formulaires structurés, **Appwrite** comme BaaS
  (auth/DB/storage). REDCap porte les formulaires administratifs uniquement,
  aucune donnée clinique.
- **Couches** des CLIs : la logique métier vit dans `packages/*`, les `cli/*-cli`
  restent thins (parsing args + I/O terminal). Enforcement par `audit:structure`.

### Scope / périmètre

- **2026-05-19** — Le dépôt standalone `univ-lehavre/amarre` reste figé (dernier
  commit 2026-02-06). **atlas est la source canonique** pour les futurs développements
  ; sync historique via PR #155.
- **2026-05-22** — `node-appwrite` SDK 25.x conservé malgré server 1.9.0 (warning
  toléré). Downgrade impossible : SDK 24.x perd `TablesDB` utilisé par `apps/ecrin`.
  Réévaluer si Appwrite tarde > 6 mois sur la sortie de 1.9.5.
- **2026-05-22** — 3 paquets internes marqués `private: true` :
  `apps/atlas-dashboard`, `apps/crf-dashboard`, `sandbox/crf-sandbox`. Pas distribués
  sur npm.
- **2026-05-27** — Neutralisation du framing institutionnel dans la documentation
  (université, recherche, chercheurs). Le dépôt reste à l'org GitHub
  `univ-lehavre` pour l'identité GitHub/npm, mais la doc ne le positionne plus
  comme « plateforme de recherche ». PR #211, #212.

### Processus / gouvernance

- **Documentation cible un public non-expert**. Tout terme technique est défini
  sur place ou pointe vers [docs/glossary.md](docs/glossary.md). PR #208, #211.
- **Doc en français** (`lang: fr-FR` côté VitePress).
- **Conventional Commits** appliqués par commitlint ; scopes limités à la liste
  d'allowed-scopes (voir `commitlint.config.js`).
- **Hooks Git via lefthook**, jamais bypassés. Voir [docs/quality/hooks.md](docs/quality/hooks.md).
- **Branch protection** sur `main` (activée 2026-05-19) : status checks requis,
  force-push bloqué. Signatures de commits non requises (commits locaux non signés) ;
  admins bypass autorisé (bus-factor=1).
- **Releases npm signées par OIDC** : `--provenance` activé sur les deux registres
  (npm public + GitHub Packages). Vérification consommateur via
  `npm audit signatures`.
- **SLA de remédiation des findings sécurité** (Critical 7j, High 30j, Medium 90j,
  Low/Info opportuniste). Documenté dans [docs/quality/security.md](docs/quality/security.md).

### Dérogations (exceptions explicites)

- **`cli/crf-openapi`** : nom de paquet sans suffixe `-cli` (historique). Exception
  listée dans `scripts/audit/workspace-structure.mjs`.
- **`packages/citation`** : 4 `ignoreDependencies` knip (`@effect/experimental`,
  `@effect/platform-node`, `@xenova/transformers`, `uuid`) — utilisées dynamiquement.
- **`cli/crf`** : `commands/api/commands.ts` en `ignore` knip — knip ne trace pas
  la chaîne d'imports Effect/CLI ; le fichier reste testé via mock direct depuis
  `commands.test.ts`.
- **`ui/atlas-ui`** : marqué `private: true` mais déclare `svelte` en
  `peerDependencies` (respecte la règle de catégorie pour une future
  publication).
- **`apps/ecrin`** : ne migre pas vers le package partagé `@univ-lehavre/atlas-baas`
  car utilise `TablesDB` (non exposé par le package). À uniformiser quand
  `TablesDB` deviendra le standard partagé.
- **`apps/ecrin`** : `validateSignupEmail` reste local (lookup `isAlliance` async,
  erreur `NotPartOfAllianceError` au lieu de `NotAnEmailError`). Le reste des
  validators est re-exporté du package.
- **Cookies UI find-an-expert** (theme, font, dark-mode, locale) : `SameSite=Lax`
  sans `Secure`. Non sensibles, lus côté client par design.
- **CSP `style-src 'unsafe-inline'`** conservé pour les `style=` inline Svelte
  et Bootstrap.
- **`audit:security` à `--audit-level=moderate`** : tightening au cas par cas
  (vérifier 0 alerte moderate avant chaque montée du seuil).
- **Rate-limit absent** sur `/auth/login` (secret magic URL haute entropie) et
  `/health` (lightweight). Rate-limit `in-memory` mono-instance — à migrer vers
  Redis/Upstash si scale-out.

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

- [ ] **Phase 5.1 RGPD** — enrichir si besoin la mention RGPD et données REDCap
      dans `SECURITY.md` ; référencer une politique sécurité institutionnelle
      existante si applicable.
- [ ] **Phase 5.2 CODEOWNERS** — nominer un second mainteneur (bus-factor=1
      actuellement).
- [ ] **Phase 5.3 branch protection** : activer signatures de commits requises
      (une fois GPG/SSH configuré) ; activer codeowners review obligatoire (dépend
      du second mainteneur) ; inclure les administrateurs dans les règles.
- [ ] **Phase 6.1 environnements** — vérifier qu'Appwrite Sites déploie depuis
      `main` uniquement ; configurer un preview par PR ou un site `staging` depuis
      une branche protégée.
- [ ] **Phase 6.3 validation externe** — valider headers HTTP avec
      [securityheaders.com](https://securityheaders.com) (objectif note A) et
      [Mozilla Observatory](https://observatory.mozilla.org).
- [ ] **Phase 7.1 nightly ZAP** — arbitrer entre (a) nightly contre prod
      (besoin URLs figées + opérateurs infra prévenus), (b) nightly contre
      `sandbox/amarre-sandbox/` (lourd CI, couvre amarre seul), (c) PR previews
      (hors périmètre Appwrite Sites).
- [ ] **Phase 7.3 revue trimestrielle** — planifier (rappel calendrier ou
      `/schedule`). Checklist : alertes CodeQL, déps obsolètes, headers HTTP, logs
      Appwrite, accès secrets.
- [ ] **Phase 8.1 alerting Appwrite** — confirmer auprès des opérateurs infra
      qui consulte les logs Appwrite et à quelle fréquence ; brancher alertes
      basiques (5xx > seuil, latence p95 anormale, auth fail rate > seuil — seuils
      suggérés dans le runbook).
- [ ] **Phase 8.3 sauvegarde** — confirmer hébergement Appwrite (self-hosted
      vs Appwrite Cloud), figer politique de sauvegarde (fréquence, rétention,
      géo), valider RPO/RTO suggérés. Premier test de restauration dans les 12 mois
      via `sandbox/amarre-sandbox/`.

### Audit `cli/crf` — étape suivante

- [ ] Tester `commands/api/index.ts` et `commands/server/index.ts` (bin entry
      points) — setup `@effect/cli` plus lourd que les autres fichiers. Couverture
      globale `cli/crf` actuellement à 64.6% statements ; ces deux fichiers la
      remonteraient au-delà de 90%.

### Actions manuelles UI GitHub

- [ ] Annoncer `brew install gitleaks` aux contributeurs pour le pre-commit
      local.

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
