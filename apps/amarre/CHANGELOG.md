# @univ-lehavre/amarre

## 3.1.0

### Minor Changes

- [#190](https://github.com/univ-lehavre/atlas/pull/190) [`45d32a3`](https://github.com/univ-lehavre/atlas/commit/45d32a3e368fdd117ceb48160a4b397a7a74060a) Thanks [@chasset](https://github.com/chasset)! - Extract the 15 Svelte UI components from `apps/amarre/src/lib/ui/` to a new shared design-system package `@univ-lehavre/atlas-ui` (live at `ui/atlas-ui/`), previewed via Storybook 10.

  For amarre, imports change shape :

  ```ts
  // before
  import Signup from '$lib/ui/Signup.svelte';

  // after
  import Signup from '@univ-lehavre/atlas-ui/Signup.svelte';
  // or
  import { Signup } from '@univ-lehavre/atlas-ui';
  ```

  Plus :
  - **Bootstrap is now an npm dependency** (`bootstrap@5.3.8` + `bootstrap-icons@1.13.1`) owned by `ui/atlas-ui`. Amarre's `+layout.svelte` imports `@univ-lehavre/atlas-ui/client` which pulls the CSS + JS bundle. The CDN `<link>` / `<script>` tags previously in `apps/amarre/src/app.html` are gone. Bumping Bootstrap = bumping one dep in one package.
  - **Two amarre-coupled components were generalized** (Collaborate, Request) : they now take a plain `RequestRecord` interface (re-exported from atlas-ui) instead of the zod-inferred `SurveyRequestItem`. The server-side type/validator in amarre is unchanged — the structural compatibility lets amarre's richer type be assigned where atlas-ui expects the minimal one.

  The level-1 UI tests in `apps/amarre/tests/ui/` still pass against the moved components (imports updated to `@univ-lehavre/atlas-ui/X.svelte`). A follow-up PR will move those tests + their fixtures into `ui/atlas-ui/tests/` so stories and tests share a single source of truth.

  Run the gallery :

  ```bash
  pnpm -F @univ-lehavre/atlas-ui storybook
  # → http://localhost:6006
  ```

### Patch Changes

- [#193](https://github.com/univ-lehavre/atlas/pull/193) [`e1beb61`](https://github.com/univ-lehavre/atlas/commit/e1beb61bb7704749e2da2d3e63a5f7eb28cd0c9c) Thanks [@chasset](https://github.com/chasset)! - Level-5 of the amarre test pyramid : Playwright `@playwright/test` smoke E2E driving the full stack (Appwrite + Mailpit + REDCap + amarre dev) end-to-end in a real browser.
  - New `sandbox/amarre-sandbox/tests/e2e/smoke.spec.ts` (1 test) : signup via the modal → poll Mailpit → visit magic-link → assert authenticated → create a request via the `/api/v1/surveys/new` endpoint → reload and assert the Compléter section appears → logout → assert anonymous state.
  - New `sandbox/amarre-sandbox/playwright.config.ts` : Chromium project, `webServer` auto-spawns amarre dev with `reuseExistingServer: true`, traces / screenshots / videos retained on failure.
  - New helpers in `sandbox/amarre-sandbox/tests/e2e/fixtures/` :
    - `preflight.ts` — Mailpit + Appwrite reachability probes (read `apps/amarre/.env.local` for project + key).
    - `mailpit.ts` — purge, polling, magic-link extraction.
    - `appwrite.ts` — admin-API user cleanup.
  - New scripts in `sandbox/amarre-sandbox/package.json` : `test:smoke`, `test:smoke:headed`.
  - `apps/amarre/src/routes/+layout.svelte` : Bootstrap JS dynamic-imported in `onMount` so SSR doesn't choke on the UMD bundle's `window` references. CSS still loads at module init via `@univ-lehavre/atlas-ui/client`.

  The suite self-skips via `test.skip(!stackReady, …)` when Mailpit or Appwrite aren't reachable, so `pnpm test:smoke` is safe to run without docker — it just reports "skipped". To exercise the full flow :

  ```bash
  pnpm -F @univ-lehavre/atlas-amarre-sandbox start         # docker up + bootstrap
  pnpm -F @univ-lehavre/atlas-amarre-sandbox test:smoke    # runs the smoke
  ```

  The legacy `scripts/test-e2e-ui.ts` (a raw tsx Playwright script with the same scenario) is left in place for now — phase G of the pyramid plan will remove it once the @playwright/test suite has stabilised in CI.

- [#195](https://github.com/univ-lehavre/atlas/pull/195) [`d253870`](https://github.com/univ-lehavre/atlas/commit/d2538701dc2b0dcba2ba4bdaaa29db91e1b4cffd) Thanks [@chasset](https://github.com/chasset)! - Closes phase G of the amarre test pyramid (post-level-5 housekeeping) and ships a per-user RUNBOOK so any new contributor can run the 5 levels end-to-end from a fresh clone.

  **Cleanup**
  - Drop the orphan drift-detector utility (`tests/utils/drift-detector.ts` + `tests/integration/drift-detection.test.ts` + `tests/baselines/` + the matching glob in the root `clean` script). Level-2 contract-amarre supersedes it.
  - Drop the four legacy `scripts/test-e2e*.ts` (tsx scripts predating the Playwright migration). `start.sh`, sandbox README and the smoke spec now point to `pnpm test:smoke`.
  - Move `tests/server/validators/auth.test.ts` to `tests/lib/server/validators/` so the unit test tree mirrors `src/lib/`.

  **New RUNBOOK** (`apps/amarre/tests/RUNBOOK.md`)
  - Machine prereqs + first-run recipe (clone → install → `playwright install chromium` → `start`).
  - Real-data preload via `SEED_MODE=prod` / `.env.prod` with privacy notes.
  - Per-level command / prereqs / failure-pattern matrix.
  - Honest "integration in pre-commit / pre-push / CI" table that calls out the actual coverage (level 1 only — N3/N4 self-skip when no docker stack, N2/N5 not wired at all).

  **DX fixes uncovered while running the new RUNBOOK end-to-end**
  - `pnpm start` now auto-detects `SEED_MODE` from `PROD_CRF_URL` + `PROD_CRF_TOKEN` presence — no more silently defaulting to fake data when prod creds are sitting in `.env.prod`. Explicit `SEED_MODE=...` still overrides.
  - Four cryptic failures are now structured errors guiding the recovery path :
    - `bootstrap-crf` / `seed-fake-data` when the gitignored `data-dictionaries/127-amarre-v1.json` is missing (`pnpm crf:dictionaries:export --apply` hint).
    - `pull-from-prod` when the prod project uses a primary key that differs from the local data dictionary's first field.
    - `pull-from-prod` reads `record_autonumbering_enabled` from the local project and matches `forceAutoNumber` automatically.
    - The Playwright smoke surfaces the response body when `POST /api/v1/surveys/new` returns non-2xx.
  - Fix a race in the Playwright smoke : Bootstrap JS is dynamic-imported in `apps/amarre/src/routes/+layout.svelte`'s `onMount`, the click for the signup modal could fire before `data-bs-toggle` was wired. Test now gates on `window.bootstrap` before the first modal interaction.
  - `+layout.svelte` re-exposes the Bootstrap exports on `window.bootstrap` after the dynamic import so the contract matches what the raw UMD bundle did pre-Vite (the ESM wrapper otherwise hides them).
  - Document that `pnpm start` does not leave the amarre dev server running (Playwright spawns and kills its own webServer for the smoke) — both the start.sh final message and the RUNBOOK "Services up" table now spell it out.

  **Docker pins**
  - `axllent/mailpit:latest` was timing out SMTP sessions before Appwrite's `baas-worker-mails` could finish its `MAIL FROM` exchange. Pin to `axllent/mailpit:v1.20`, add `MP_SMTP_AUTH_ALLOW_INSECURE=true` + `MP_SMTP_DISABLE_RDNS=true`.
  - Pin `appwrite/appwrite:1.9.0` exact (was floating `:1.9` series tag) so future patch releases don't run schema migrations silently across `docker compose pull`.

- [#198](https://github.com/univ-lehavre/atlas/pull/198) [`69d3dfd`](https://github.com/univ-lehavre/atlas/commit/69d3dfd5754c9ce6ac4e832b0fc28f2830be6772) Thanks [@chasset](https://github.com/chasset)! - Triage complet des 39 alertes CodeQL ouvertes restantes après [#194](https://github.com/univ-lehavre/atlas/issues/194) : 13 fixes en code + 26 dismissals justifiés via gh API (état final attendu après re-scan : 0 alerte ouverte).

  **Fixes code**
  - `cli/crf-openapi/src/extractor/index.ts` : `execSync(`unzip … ${zipPath} …`)` → `execFileSync('unzip', [...])` (pas de shell, args en tableau). Ferme `js/shell-command-constructed-from-input` (erreur) + `js/shell-command-injection-from-environment`.
  - `packages/citation-validate/src/store/{loader,saver}.test.ts` : remplace les paths tmp prévisibles (`join(tmpdir(), `…-${Date.now()}.json`)`) par `mkdtempSync(join(tmpdir(), 'atlas-…-'))`. Ferme 5 × `js/insecure-temporary-file`.
  - `apps/amarre/scripts/manage-baselines.ts` : élimine la TOCTOU `existsSync` + `readFileSync` + `writeFileSync` au profit d'un `try { readFileSync } catch (ENOENT)`. Ferme `js/file-system-race`.
  - `apps/crf-dashboard/src/routes/api/logs/+server.ts` : supprime la branche `(cache !== null && isCacheStale(cache))` déjà court-circuitée par le `|| cache === null` en amont. Ferme `js/comparison-between-incompatible-types`.
  - Suppression dead code/imports inutilisés (4 × `js/unused-local-variable` note) :
    - `apps/ecrin/src/lib/transformers/build-name.ts` : helpers `getID`, `getECRcode` jamais exportés ni utilisés (+ import `ECR` orphelin).
    - `packages/citation-validate/src/events/updater-effect.test.ts` : helper `provideStores` défini mais les tests appellent `Effect.provideService` inline.
    - `packages/crf-core/src/validation/validation.test.ts` : imports `EMAIL_PATTERN`, `RECORD_ID_PATTERN`, `VERSION_PATTERN` (testés indirectement via leurs validators).

  **Dismissals (gh API)**
  - 9 × `js/polynomial-redos` dans `cli/crf-openapi/src/core/parsers/` (`won't fix`) : outil CLI offline parsant des sources REDCap upstream téléchargées manuellement ; input trusted, pas user-provided ; risque DoS limité à la machine de dev.
  - 16 × `js/file-access-to-http` dans `sandbox/crf-sandbox/tests/`, `sandbox/amarre-sandbox/tests/e2e/` (`used in tests`) : code test/sandbox lisant un token de test depuis `.env.test` pour fetcher `localhost:8888` — pas de prod.
  - 1 × `js/file-access-to-http` dans `packages/atlas-stats/src/github.ts` (`false positive`) : pattern d'auth GitHub API standard (URL hardcodée, seul l'`Authorization` header dérive d'un file).

- Updated dependencies [[`b09cef1`](https://github.com/univ-lehavre/atlas/commit/b09cef1b12c3f4c8428362727e9772db57148e49), [`142ac8e`](https://github.com/univ-lehavre/atlas/commit/142ac8e8a6d0a899680281f843056f49a1b80157), [`b09cef1`](https://github.com/univ-lehavre/atlas/commit/b09cef1b12c3f4c8428362727e9772db57148e49), [`fc5dfb6`](https://github.com/univ-lehavre/atlas/commit/fc5dfb6244bc116ecae3fb51ceb8828f7dad2cd7)]:
  - @univ-lehavre/atlas-auth@2.2.0
  - @univ-lehavre/atlas-ui@0.1.1

## 3.0.4

### Patch Changes

- [#184](https://github.com/univ-lehavre/atlas/pull/184) [`5ce34b9`](https://github.com/univ-lehavre/atlas/commit/5ce34b959a111c6300cc8904e42eaf5ed63371b1) Thanks [@chasset](https://github.com/chasset)! - Level-3 of the amarre test pyramid : integration tests for the REDCap services in `src/lib/server/services/surveys.ts`, exercised against a real REDCap docker.
  - New `tests/integration/crf/surveys.test.ts` covering `newRequest`, `fetchUserId` (hit + miss), `listRequests` (hit + miss) and the `filterLogic` escaping path.
  - New `tests/integration/helpers/redcap.ts` : reachability probe (`isRedcapReachable`), Node `Fetch` context, prefix-scoped cleanup.
  - `vitest.config.ts` gains a third project `integration` (node env, 30s timeout). The suite self-skips via `describe.skipIf(!await isRedcapReachable())`, so the default `pnpm test` remains docker-free.
  - New `pnpm test:integration` script.

  To exercise the suite, start the sandbox stack first :

  ```bash
  pnpm -F @univ-lehavre/atlas-amarre-sandbox start
  pnpm -F @univ-lehavre/atlas-amarre test:integration
  ```

- [#186](https://github.com/univ-lehavre/atlas/pull/186) [`820e6b6`](https://github.com/univ-lehavre/atlas/commit/820e6b61ebf0f5239bc6baa327d473b4dda253ee) Thanks [@chasset](https://github.com/chasset)! - Level-4 of the amarre test pyramid : Vitest integration tests for the **signup → magic-link → session** flow, exercised against a real Appwrite + Mailpit stack.
  - New `tests/integration/auth/signup.test.ts` (4 tests) :
    - `signupWithEmail()` returns a Token from Appwrite.
    - Signup is rejected for emails outside `ALLOWED_DOMAINS_REGEXP`.
    - The magic-link email actually lands in Mailpit (Appwrite worker-mails dispatch).
    - `login(userId, secret, cookies)` opens a real Appwrite session (verified via the admin SDK's `listSessions`).
  - New `tests/integration/helpers/mailpit.ts` : reachability probe, polling, magic-link URL extraction (handles `&amp;`-escaped HTML bodies), purge.
  - New `tests/integration/helpers/appwrite.ts` : admin reachability probe (catches placeholder configs early), session count, prefix-scoped user cleanup.

  The suite self-skips via `describe.skipIf(!appwriteUp || !mailpitUp)`, so the default `pnpm test` stays docker-free. REDCap doesn't need to be up — `signupWithEmail` falls back to `ID.unique()` when `fetchUserId` errors.

  To exercise the suite :

  ```bash
  pnpm -F @univ-lehavre/atlas-amarre-sandbox start
  pnpm -F @univ-lehavre/atlas-amarre test:integration
  ```

- [#183](https://github.com/univ-lehavre/atlas/pull/183) [`e7ba8e8`](https://github.com/univ-lehavre/atlas/commit/e7ba8e86092dfb23b5dba7a41234693c690827b0) Thanks [@chasset](https://github.com/chasset)! - Externalize the RGPD notice URL displayed in the "Create request" modal.

  The URL was hardcoded in `src/lib/ui/CreateRequest.svelte` and pointed at a specific survey id on `survey.univ-lehavre.fr`. It is now read from `PUBLIC_RGPD_NOTICE_URL` (exposed via `$env/static/public`), so prod / pre-prod / sandbox can each point at their own notice without forking the component.

  **Action required after pulling** : add `PUBLIC_RGPD_NOTICE_URL` to your local `apps/amarre/.env*` files. The expected shape is documented in [`apps/amarre/.env.example`](apps/amarre/.env.example). The CI workflow copies `.env.example` → `.env`, so it picks the documented placeholder up automatically.

## 3.0.3

### Patch Changes

- [#179](https://github.com/univ-lehavre/atlas/pull/179) [`97c6af9`](https://github.com/univ-lehavre/atlas/commit/97c6af9a3a5a9ae069a0f1dbe3199f782d59bceb) Thanks [@chasset](https://github.com/chasset)! - Level-2 of the amarre test pyramid : REDCap contract tests scoped to the amarre data dictionary.

  `@univ-lehavre/atlas-crf-sandbox` — minor
  - New `tests/fixtures/redcap-admin.ts` : API-only helpers that mint a REDCap super-API token via the Control Center AJAX endpoint (the sandbox runs with `auth_meth_global=none`, so the super-user is implicit), then use it to create a project via `POST /api/?content=project&action=import` and import the amarre data dictionary via `POST /api/?content=metadata&action=import`. No SQL executed — REDCap is touched exclusively through HTTP.
  - `tests/fixtures/setup-test-projects.ts` extended with a `setupAmarreProject()` step (idempotent : a cached token still pointing at a project titled `amarre` is reused as-is).
  - New `tests/contract-amarre/` directory with two suites :
    - `metadata.test.ts` : 113 fields imported, instruments present, branching logic preserved, redacted field names correctly rejected on record import.
    - `records.test.ts` : record import + export with `filterLogic`, delete lifecycle, empty filter results.
  - New `pnpm test:contract:amarre` script that runs only the amarre subset (the existing `test:contract` runs both).
  - `vitest.contract.config.ts` extended to include the new directory.

  Housekeeping :
  - `docker/config/.env.test` removed from git (it contains REDCap tokens scoped to a local sandbox, regenerated every `pnpm test:setup`); `.env.test.example` documents the shape including the new `REDCAP_TOKEN_PROJECT_AMARRE` slot.
  - New `sandbox/crf-sandbox/.gitignore` (no `.gitignore` existed before).

  `@univ-lehavre/atlas-amarre` — patch
  - `apps/amarre/vitest.config.ts` : `coverage.include` overridden to include `.svelte` files, so the level-1 UI tests added in [#178](https://github.com/univ-lehavre/atlas/issues/178) are actually measured. The branches threshold is lowered from 52 → 40 to absorb conditional branches in components not yet covered (Collaborate, Footer, MainTitle, …); it will be raised again as level-1 coverage expands.

## 3.0.2

### Patch Changes

- [#178](https://github.com/univ-lehavre/atlas/pull/178) [`cf19f47`](https://github.com/univ-lehavre/atlas/commit/cf19f47687228b3e25bb4bfe7f39c929a7b3863f) Thanks [@chasset](https://github.com/chasset)! - Add level-1 UI tests for amarre (phase A of the 5-level test pyramid).

  The pre-existing `tests/lib/`, `tests/routes/`, `tests/server/`, `tests/utils/`, `tests/integration/` trees are unchanged. A new `tests/ui/` tree covers the actual DOM behaviour of the components using `@testing-library/svelte` + `happy-dom`. `vitest.config.ts` is restructured into two projects (`unit` + `ui`) so each environment is isolated.

  Coverage of conditional rendering:
  - `+page` slicing : empty / 1 incomplete / 1 in-progress / mixed, plus parametric coverage of `validation_finale_complete` values.
  - `Complete.svelte`, `Follow.svelte` : 0 / 1 / N tile cases, headings present.
  - `TopNavbar.svelte` : the 4 combinations of `hasIncompleteRequests × hasRequestsInProgress`, plus the persistent tabs.
  - `Signup.svelte` : submit disabled until valid email, success/error alerts driven by `form.data` / `form.wrongSignupEmail`, no alert when `form` is null/undefined.
  - `CreateRequest.svelte` : submit disabled until consent ticked.
  - Signup ↔ modal contract : `#SignUp` exposed with a `data-bs-dismiss` close button (Bootstrap JS open/close itself stays a level-5 concern).

  New devDeps: `@testing-library/svelte`, `@testing-library/jest-dom`, `@testing-library/user-event`, `happy-dom`. New pnpm scripts: `test:unit`, `test:ui` (default `pnpm test` runs both, 108 tests, ~1s).

  Coverage thresholds untouched at 42/52/36/43 — they will be raised in a follow-up once the new numbers settle.

## 3.0.1

### Patch Changes

- Updated dependencies [[`3229d56`](https://github.com/univ-lehavre/atlas/commit/3229d56df92f880e112dfba6158fc48523699d36)]:
  - @univ-lehavre/atlas-auth@2.1.0
  - @univ-lehavre/atlas-logos@1.2.0
  - @univ-lehavre/atlas-baas@2.0.1
  - @univ-lehavre/atlas-errors@1.0.2
  - @univ-lehavre/atlas-validators@1.0.2

## 3.0.0

### Major Changes

- [#125](https://github.com/univ-lehavre/atlas/pull/125) [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3) Thanks [@chasset](https://github.com/chasset)! - Renommage du package Appwrite en `baas` (Backend-as-a-Service) pour retirer la marque Appwrite des identifiants publics du monorepo. Fin de la migration anti-marque (PR 1 citation-types, PR 2 cluster citation, PR 3 cluster crf).

  **Package renommé (npm + dossier + workspace)**

  | Avant (npm)                    | Après (npm)                |
  | ------------------------------ | -------------------------- |
  | `@univ-lehavre/atlas-appwrite` | `@univ-lehavre/atlas-baas` |

  **Identifiants publics renommés**

  Types et erreurs :
  - `AppwriteConfig` → `BaasConfig`

  Classes et fonctions :
  - `AppwriteUserRepository` → `BaasUserRepository`
  - `AppwriteCurrentConsentRepository` → `BaasCurrentConsentRepository`
  - `AppwriteConsentEventRepository` → `BaasConsentEventRepository`
  - `MockAppwriteUserRepository` → `MockBaasUserRepository`
  - `checkAppwrite` / `checkAppwriteDatabase` / `checkAppwriteEndpoint` → `checkBaas*`
  - `isAppwriteAuthError` → `isBaasAuthError`
  - `mapAppwriteUserToProfile` → `mapBaasUserToProfile`
  - `serviceAppwrite` → `serviceBaas`

  Schémas et clés de config :
  - `appwriteDatetime` (zod schema) → `baasDatetime`
  - Clé `appwrite` dans `AuthConfig` → `baas`
  - `NodeAppwrite` (alias d'import du SDK) → `BaasSdk`

  Codes d'état et traductions :
  - `'appwrite_unavailable'` (string code) → `'baas_unavailable'`
  - `appwriteUnavailable`, `appwriteUnavailableTitle`, `appwriteUnavailableDescription` (clés i18n) → `baas*`
  - `brand.appwrite` (clé d'objet) → `brand.baas`
  - `name: 'appwrite'` (service health) → `name: 'baas'`

  **Dossiers / fichiers renommés**

  | Avant                                                  | Après                                      |
  | ------------------------------------------------------ | ------------------------------------------ |
  | `packages/appwrite/`                                   | `packages/baas/`                           |
  | `apps/amarre/src/lib/server/appwrite/`                 | `apps/amarre/src/lib/server/baas/`         |
  | `apps/ecrin/src/lib/appwrite/`                         | `apps/ecrin/src/lib/baas/`                 |
  | `apps/find-an-expert/src/lib/server/appwrite/`         | `apps/find-an-expert/src/lib/server/baas/` |
  | `.env.dev.appwrite.example`                            | `.env.dev.baas.example`                    |
  | `.env.prod.appwrite.example`                           | `.env.prod.baas.example`                   |
  | `docs/projects/ecrin/find-an-expert/appwrite-setup.md` | `.../baas-setup.md`                        |

  **Conservé (texte descriptif uniquement)**
  - Dépendances npm tierces : `appwrite`, `node-appwrite`
  - Classe `AppwriteException` (du SDK officiel)
  - URLs Appwrite Cloud (`cloud.appwrite.io`)
  - Variables d'environnement `APPWRITE_*`, `PUBLIC_APPWRITE_*` (conventions choisies/imposées par les apps consommant le SDK)
  - Mots-clés npm `"appwrite"` (discoverability)
  - Messages d'erreur, JSDoc, libellés utilisateur

  **Migration locale requise**

  Les fichiers d'environnement locaux (gitignored) doivent être renommés :

  ```bash
  mv .env.dev.appwrite .env.dev.baas
  mv .env.prod.appwrite .env.prod.baas
  ```

  **Migration côté consommateur**

  ```diff
  - import { createAdminClient, type AppwriteConfig } from '@univ-lehavre/atlas-appwrite';
  + import { createAdminClient, type BaasConfig } from '@univ-lehavre/atlas-baas';
  ```

  ```diff
  - const auth = createAuthService({ appwrite: { ... }, ... });
  + const auth = createAuthService({ baas: { ... }, ... });
  ```

### Patch Changes

- [#125](https://github.com/univ-lehavre/atlas/pull/125) [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3) Thanks [@chasset](https://github.com/chasset)! - Renommage du cluster REDCap (packages internes) en cluster `crf` pour retirer la marque REDCap des identifiants publics du monorepo. Suite de la migration commencée avec `citation-types` et le cluster `citation`.

  **Packages renommés (npm + dossiers + workspace)**

  | Avant (npm)                         | Après (npm)                      |
  | ----------------------------------- | -------------------------------- |
  | `@univ-lehavre/atlas-redcap-core`   | `@univ-lehavre/atlas-crf-core`   |
  | `@univ-lehavre/atlas-redcap-client` | `@univ-lehavre/atlas-crf-client` |
  | `@univ-lehavre/atlas-redcap-logs`   | `@univ-lehavre/atlas-crf-logs`   |

  Les packages restants nommés `redcap-*` (apps/redcap-dashboard, cli/redcap-openapi, cli/redcap-stats, sandbox/redcap-sandbox) seront traités dans la PR 4.

  **Identifiants publics renommés (PascalCase, ~798 occurrences)**

  Toutes les classes/types/erreurs avec préfixe `Redcap` → `Crf` :
  - `RedcapClient` → `CrfClient`, `RedcapClientError` → `CrfClientError`, `RedcapClientService` → `CrfClientService`
  - `RedcapConfig` → `CrfConfig`, `RedcapConnectionConfig` → `CrfConnectionConfig`
  - `RedcapAdapter` → `CrfAdapter`, `RedcapFeatures` → `CrfFeatures`
  - `RedcapToken` / `RedcapTokenType` / `RedcapUrl` / `RedcapUrlType` (brands) → `Crf*` correspondants
  - `RedcapApiError`, `RedcapHttpError`, `RedcapNetworkError`, `RedcapFetchError`, `RedcapError`, `RedcapWriteError` → `Crf*`
  - `RedcapLogEntry` → `CrfLogEntry`
  - Fonctions : `createRedcapClient`, `makeRedcapClient`, `makeRedcapClientLayer`, `isRedcapErrorResponse`, `isValidRedcapName`, `checkRedcapServer` → `*Crf*`

  **Variables / champs**
  - `redcapApiToken`, `redcapApiUrl`, `redcapConfig`, `redcapResult`, `redcapToken`, `redcapUrl` → `crf*`
  - `REDCAP_NAME_PATTERN` / `REDCAP_TOKEN_PATTERN` → `CRF_*`
  - Codes d'erreur HTTP : `redcap_http_error` → `crf_http_error`, `redcap_api_error` → `crf_api_error`, `redcap_error` → `crf_error`
  - Variable exportée dans `services/crf/src/server/client.ts` : `redcap` → `client`

  **Sous-commandes CLI**
  - `cli/researcher-profiles` : `from-redcap` → `from-crf`
  - `cli/crf` : `crf-redcap` → `crf-api`

  **Dossiers / fichiers renommés**

  | Avant                                                 | Après                                              |
  | ----------------------------------------------------- | -------------------------------------------------- |
  | `apps/amarre/src/lib/server/redcap/`                  | `apps/amarre/src/lib/server/crf/`                  |
  | `apps/ecrin/src/lib/redcap/`                          | `apps/ecrin/src/lib/crf/`                          |
  | `cli/crf/src/commands/redcap/`                        | `cli/crf/src/commands/api/`                        |
  | `services/crf/src/server/redcap.ts`                   | `services/crf/src/server/client.ts`                |
  | `cli/researcher-profiles/src/commands/from-redcap.ts` | `cli/researcher-profiles/src/commands/from-crf.ts` |

  **Conservé (texte descriptif uniquement)**
  - Variables d'environnement (`REDCAP_API_TOKEN`, `REDCAP_API_URL`, `REDCAP_URL`, `PUBLIC_REDCAP_URL`)
  - Champs de données REDCap natifs (`redcap_event_name`, `redcap_repeat_instance`, `redcap_repeat_instrument`, `redcap_v`, `redcap16`)
  - URLs (`redcap.example.com`, `projectredcap.org`)
  - Messages d'erreur, JSDoc, libellés utilisateur mentionnant REDCap
  - `apps/redcap-dashboard/.redcap-stats.json` (entrée `.gitignore`, sera traitée en PR 4)

  **Migration côté consommateur**

  ```diff
  - import { type RedcapClient, createRedcapClient } from '@univ-lehavre/atlas-redcap-client';
  + import { type CrfClient, createCrfClient } from '@univ-lehavre/atlas-crf-client';
  ```

- Updated dependencies [[`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3)]:
  - @univ-lehavre/atlas-baas@2.0.0

## 2.0.7

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25) Thanks [@chasset](https://github.com/chasset)! - Update dependency ranges and lockfile entries, and make the version audit fail when outdated dependencies are detected.

- Updated dependencies [[`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea), [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25)]:
  - @univ-lehavre/atlas-appwrite@1.0.2
  - @univ-lehavre/atlas-logos@1.1.3
  - @univ-lehavre/atlas-errors@1.0.1
  - @univ-lehavre/atlas-validators@1.0.1

## 2.0.6

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-appwrite@1.0.1
  - @univ-lehavre/atlas-errors@1.0.1
  - @univ-lehavre/atlas-logos@1.1.2
  - @univ-lehavre/atlas-validators@1.0.1

## 2.0.5

### Patch Changes

- Updated dependencies [[`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4)]:
  - @univ-lehavre/atlas-appwrite@1.0.0
  - @univ-lehavre/atlas-errors@1.0.0
  - @univ-lehavre/atlas-validators@1.0.0

## 2.0.4

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

- Updated dependencies [[`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec)]:
  - @univ-lehavre/atlas-appwrite@0.2.4
  - @univ-lehavre/atlas-errors@0.2.4
  - @univ-lehavre/atlas-validators@0.2.4

## 2.0.3

### Patch Changes

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-appwrite@0.2.3
  - @univ-lehavre/atlas-errors@0.2.3
  - @univ-lehavre/atlas-validators@0.2.3

## 2.0.2

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

- Updated dependencies [[`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da)]:
  - @univ-lehavre/atlas-appwrite@0.2.2
  - @univ-lehavre/atlas-errors@0.2.2
  - @univ-lehavre/atlas-validators@0.2.2

## 2.0.1

### Patch Changes

- [#64](https://github.com/univ-lehavre/atlas/pull/64) [`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6) Thanks [@chasset](https://github.com/chasset)! - ## Documentation
  - Translate all documentation to English for international accessibility
  - Add Microservices project with K3s installation procedure
  - Infrastructure: Cilium, Longhorn, Authelia, Mattermost, REDCap, ECRIN, Gitea, ArgoCD
  - Configure REDCap access control (public surveys, protected admin)

- Updated dependencies [[`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6), [`a67fbc0`](https://github.com/univ-lehavre/atlas/commit/a67fbc038561190cd982873c41cf0ca0030fa4ee)]:
  - @univ-lehavre/atlas-validators@0.2.1
  - @univ-lehavre/atlas-appwrite@0.2.1
  - @univ-lehavre/atlas-errors@0.2.1
  - @univ-lehavre/atlas-logos@1.1.1

## 2.0.0

### Major Changes

- [#47](https://github.com/univ-lehavre/atlas/pull/47) [`78a8e8a`](https://github.com/univ-lehavre/atlas/commit/78a8e8a2cc9f2f24b181fdf82b3f3d215ae390b4) Thanks [@chasset](https://github.com/chasset)! - Import ecrin and amarre packages into atlas monorepo

  ### @univ-lehavre/atlas-logos
  - Add AMARRE logos (amarre.png, amarre-icon.png)
  - Add France 2030 and Région Normandie partner logos

  ### @univ-lehavre/atlas-ecrin (new package)
  - SvelteKit application for research collaboration
  - Appwrite backend integration
  - REDCap integration for surveys
  - Graph visualization (Sigma, Graphology)
  - Svelte 5 with runes

  ### @univ-lehavre/atlas-amarre (new package)
  - SvelteKit application for clinical research data management
  - Appwrite backend integration
  - REDCap integration
  - Zod schema validation with OpenAPI generation
  - Svelte 5 with runes

### Patch Changes

- [#47](https://github.com/univ-lehavre/atlas/pull/47) [`57244db`](https://github.com/univ-lehavre/atlas/commit/57244db507023838f05cf13ea93db471d00f4e1b) Thanks [@chasset](https://github.com/chasset)! - Remove unused exports and enable knip exports check
  - Enable knip to detect unused exports (remove --exclude exports flag)
  - Clean up 105 unused exports across packages
  - Configure knip to ignore public API files in crf package

- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa) Thanks [@chasset](https://github.com/chasset)! - Remove `private` field from package.json to allow future publishing

- [#47](https://github.com/univ-lehavre/atlas/pull/47) [`9d0028a`](https://github.com/univ-lehavre/atlas/commit/9d0028af67634f284f73cd5473a9a3e8f6757b3c) Thanks [@chasset](https://github.com/chasset)! - feat: create shared packages for auth, errors, validators, and appwrite

  New shared packages to eliminate code duplication across SvelteKit apps:
  - `@univ-lehavre/atlas-errors`: ApplicationError base class and typed HTTP errors
  - `@univ-lehavre/atlas-appwrite`: Appwrite client utilities and UserRepository
  - `@univ-lehavre/atlas-validators`: Email, hex, JSON validation (RFC 5322, ReDoS-safe)
  - `@univ-lehavre/atlas-auth`: Authentication service with magic URL login

  Migrated amarre, ecrin, and find-an-expert to use shared packages via re-exports,
  maintaining backward compatibility for existing imports.

- Updated dependencies [[`78a8e8a`](https://github.com/univ-lehavre/atlas/commit/78a8e8a2cc9f2f24b181fdf82b3f3d215ae390b4), [`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa), [`9ad9099`](https://github.com/univ-lehavre/atlas/commit/9ad9099d3861a6595d2acd6ecb10cf29d46a6d63), [`9d0028a`](https://github.com/univ-lehavre/atlas/commit/9d0028af67634f284f73cd5473a9a3e8f6757b3c)]:
  - @univ-lehavre/atlas-logos@1.1.0
  - @univ-lehavre/atlas-appwrite@0.2.0
  - @univ-lehavre/atlas-errors@0.2.0
  - @univ-lehavre/atlas-validators@0.2.0

## 1.7.0

### Minor Changes

- 47c914c: Add an AMARRE favicon

## 1.6.0

### Minor Changes

- 37b7513: Replace main title to a logo
- ad56973: Add the "follow" in the top navbar

### Patch Changes

- 1dbf533: Les liens ouvrent maintenant des nouveaux onglets

## 1.5.3

### Patch Changes

- 24cbd0b: Fix the UI validation presentation
- c5078b8: Suppression du champ confirmation dans le formulaire REDCap

## 1.5.2

### Patch Changes

- ec1a082: Fix the destination UI label in request title
- 5b395c4: Fix Follow title in UI
- ea478aa: Fix request status when form is empty

## 1.5.1

### Patch Changes

- f38e1ba: Fix an issue: users now get the same userid even if appwrite is reset. A new userid is set only if there is no records in REDCap for this user

## 1.5.0

### Minor Changes

- 90a0309: Add health API, and adjust the UI behavior

## 1.4.0

### Minor Changes

- 2942f58: Ajout d'un agent IA dédié à la sécurité

### Patch Changes

- 725bd67: Fix test on /api/v1/surveys/new

## 1.3.0

### Minor Changes

- 42f45ff: Ajout d'une méthode API liée à la santé de l'application
- 4cbfa3e: Ajout des liens d'enquête pour chaque demande et chaque instrument dans chaque demande

## 1.2.0

### Minor Changes

- 3f712af: La création d'une nouvelle requête n'est pas possible uniquement que si les dernières ont un formulaire complété
- cc93f5f: Replace Swagger UI with RapiDoc for API documentation. RapiDoc offers a modern, customizable interface with better user experience. Added anti-derive tests for survey endpoints to ensure OpenAPI schemas match actual API responses.
- c34f53b: add UI cards for each request

### Patch Changes

- 13fd770: /api/v1/surveys/download retrieves now all requests.

## 1.1.0

### Minor Changes

- 8e4676c: /api/v1/surveys/new Ajoute désormais l'identifiant de l'utilisateur
- 08608c2: Add /api/v1/surveys/new
- 43494a0: /api/v1/surveys/list is now implemented

### Patch Changes

- e70b05d: Mise à jour de la description de l'API dans /api/docs

## 1.0.0

### Major Changes

- 10d948c: Simplification du code et mise en place des bonnes pratiques

### Patch Changes

- 9d12227: Refactorisation des messages d'erreur dans l'interface graphique
- 436cfd0: Mise à jour de /api/docs en fonction des modifications de l'API
