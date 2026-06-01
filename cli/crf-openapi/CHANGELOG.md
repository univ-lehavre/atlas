# @univ-lehavre/atlas-redcap

## 2.0.2

### Patch Changes

- [#250](https://github.com/univ-lehavre/atlas/pull/250) [`178dca4`](https://github.com/univ-lehavre/atlas/commit/178dca44aef7696c148adb6152b9f6885f25528e) Thanks [@chasset](https://github.com/chasset)! - Première publication de ces 8 CLIs sur les registres npm (npmjs.org +
  GitHub Packages). Le code est inchangé ; ce bump `patch` déclenche
  simplement leur release initiale via le pipeline Changesets existant
  (cf. [ADR 0017](docs/decisions/0017-releases-npm-oidc-deux-registres.md)).
  `atlas-biblio-cli` était déjà publié et n'est pas concerné.

## 2.0.1

### Patch Changes

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

- Updated dependencies [[`69d3dfd`](https://github.com/univ-lehavre/atlas/commit/69d3dfd5754c9ce6ac4e832b0fc28f2830be6772)]:
  - @univ-lehavre/atlas-crf-core@2.0.1

## 2.0.0

### Major Changes

- [#125](https://github.com/univ-lehavre/atlas/pull/125) [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3) Thanks [@chasset](https://github.com/chasset)! - Fin de la migration anti-marque REDCap : renommage des 4 packages restants utilisant `redcap-*` dans leur nom.

  **Packages renommés (npm + dossiers + workspace)**

  | Avant (npm)                            | Après (npm)                         |
  | -------------------------------------- | ----------------------------------- |
  | `@univ-lehavre/atlas-redcap-dashboard` | `@univ-lehavre/atlas-crf-dashboard` |
  | `@univ-lehavre/atlas-redcap-openapi`   | `@univ-lehavre/atlas-crf-openapi`   |
  | `@univ-lehavre/atlas-redcap-stats-cli` | `@univ-lehavre/atlas-crf-stats-cli` |
  | `@univ-lehavre/atlas-redcap-sandbox`   | `@univ-lehavre/atlas-crf-sandbox`   |

  **Bins renommés**
  - `redcap` → `crf-openapi` (dans `@univ-lehavre/atlas-crf-openapi`)
  - `atlas-redcap-stats` → `atlas-crf-stats` (dans `@univ-lehavre/atlas-crf-stats-cli`)

  **Fichiers internes renommés**

  | Avant                                                    | Après                                               |
  | -------------------------------------------------------- | --------------------------------------------------- |
  | `cli/crf-openapi/src/bin/redcap.ts`                      | `cli/crf-openapi/src/bin/crf-openapi.ts`            |
  | `cli/crf-stats/src/bin/atlas-redcap-stats.ts`            | `cli/crf-stats/src/bin/atlas-crf-stats.ts`          |
  | `cli/crf-openapi/specs/versions/redcap-{14,15,16}*.yaml` | `cli/crf-openapi/specs/versions/v{14,15,16}*.yaml`  |
  | `sandbox/crf-sandbox/scripts/install-redcap.sh`          | `sandbox/crf-sandbox/scripts/install-crf.sh`        |
  | `sandbox/crf-sandbox/scripts/prepare-redcap-source.sh`   | `sandbox/crf-sandbox/scripts/prepare-crf-source.sh` |

  **Cache file renommé**
  - `.redcap-stats.json` (fichier de cache local créé par `@univ-lehavre/atlas-crf-logs`) → `.crf-stats.json` — patch sur `crf-logs` pour le nouveau chemin par défaut.

  **Conservé (texte descriptif / dépendances tierces / data REDCap)**
  - Fichiers vendored dans `cli/crf-openapi/upstream/` (sources REDCap PHP) — non trackés, gitignored
  - Fichiers Docker `database.php`, `init.sql`, `php.ini` dans `sandbox/crf-sandbox/docker/` — infrastructure de test pour instance REDCap réelle
  - Tokens REDCap de test dans `sandbox/crf-sandbox/docker/config/.env.test` (auto-générés par `docker:install`, sandbox jetable)
  - Variables d'environnement (`REDCAP_API_URL`, `REDCAP_API_TOKEN`)
  - Champs natifs REDCap (`redcap_event_name`, `redcap_v`, etc.)
  - URLs (`projectredcap.org`)
  - README, JSDoc, libellés utilisateur

  **Migration côté consommateur**

  Aucun consommateur externe dans le monorepo n'utilise ces packages (apps et CLIs autonomes). Pour les utilisateurs externes :

  ```diff
  - pnpm add @univ-lehavre/atlas-redcap-openapi
  + pnpm add @univ-lehavre/atlas-crf-openapi
  ```

  ```diff
  - npx atlas-redcap-stats
  + npx atlas-crf-stats
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
  - @univ-lehavre/atlas-crf-core@2.0.0

## 1.5.1

### Patch Changes

- [#123](https://github.com/univ-lehavre/atlas/pull/123) [`fa67ef8`](https://github.com/univ-lehavre/atlas/commit/fa67ef80e128e127f5bf602686f78f44ba02668f) Thanks [@chasset](https://github.com/chasset)! - Organize CLI source layout around bin, commands, config, prompts, and output adapters.

## 1.5.0

### Minor Changes

- [#121](https://github.com/univ-lehavre/atlas/pull/121) [`c763add`](https://github.com/univ-lehavre/atlas/commit/c763addd36a484a0686c53e087138d31414cd214) Thanks [@chasset](https://github.com/chasset)! - Add REDCap 16.1.9 OpenAPI coverage and make the extractor read upstream REDCap ZIP archives.

  Strengthen the REDCap sandbox contract fixtures and assertions so optional project capabilities, reports, surveys, uploads, XML exports, logs, mappings, and metadata imports are exercised with stricter checks.

## 1.4.6

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea) Thanks [@chasset](https://github.com/chasset)! - Add `architectureCategory` option to ESLint presets in `shared-config` to enforce per-category import restrictions at lint time. All workspace packages receive their category assignment, enabling detection of CLI I/O in `packages/` and `*-cli` imports in `apps/` and `services/`. Normalize dependency specifiers and add `audit:dep-versions` script.

- Updated dependencies []:
  - @univ-lehavre/atlas-redcap-core@1.1.5

## 1.4.5

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-redcap-core@1.1.5

## 1.4.4

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

- Updated dependencies [[`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec)]:
  - @univ-lehavre/atlas-redcap-core@1.1.4

## 1.4.3

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-redcap-core@1.1.3

## 1.4.2

### Patch Changes

- [#100](https://github.com/univ-lehavre/atlas/pull/100) [`aced246`](https://github.com/univ-lehavre/atlas/commit/aced24617bdc0839a40d8a52e69d6222e96b609a) Thanks [@chasset](https://github.com/chasset)! - Move REDCap tooling packages into the unified `cli/*` layout.
  - relocate `atlas-redcap-openapi` from `tools/dev/redcap-openapi` to `cli/redcap-openapi`
  - relocate `atlas-redcap-stats-cli` from `tools/cli-redcap-stats` to `cli/redcap-stats`
  - update workspace and tooling references (pnpm lockfile, TypeDoc, Knip, package metadata)

## 1.4.1

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

- Updated dependencies [[`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da)]:
  - @univ-lehavre/atlas-redcap-core@1.1.2

## 1.4.0

### Minor Changes

- [#61](https://github.com/univ-lehavre/atlas/pull/61) [`4462e33`](https://github.com/univ-lehavre/atlas/commit/4462e33243faa6edc2bad15a43e8239d6ebd4043) Thanks [@chasset](https://github.com/chasset)! - Add REDCap OpenAPI specifications (v14.5.10, v15.5.32, v16.0.8) with official authorization from REDCap

### Patch Changes

- [#64](https://github.com/univ-lehavre/atlas/pull/64) [`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6) Thanks [@chasset](https://github.com/chasset)! - ## Documentation
  - Translate all documentation to English for international accessibility
  - Add Microservices project with K3s installation procedure
  - Infrastructure: Cilium, Longhorn, Authelia, Mattermost, REDCap, ECRIN, Gitea, ArgoCD
  - Configure REDCap access control (public surveys, protected admin)

- Updated dependencies [[`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6)]:
  - @univ-lehavre/atlas-redcap-core@1.1.1

## 1.3.0

### Minor Changes

- [#46](https://github.com/univ-lehavre/atlas/pull/46) [`0b83927`](https://github.com/univ-lehavre/atlas/commit/0b839274782f50632aea3dcfc38e4ef6816f21dc) Thanks [@chasset](https://github.com/chasset)! - Integrate redcap-core across CRF and OpenAPI packages

  ### @univ-lehavre/atlas-crf
  - Re-exports branded types, errors, and version utilities from `@univ-lehavre/atlas-redcap-core`
  - Removed duplicate implementations in favor of core module
  - Breaking: `BooleanFlag` is now a type-only export, use `toBooleanFlag`/`fromBooleanFlag` utilities

  ### @univ-lehavre/atlas-redcap-core
  - Added comprehensive test suite (18 test files, 520 tests)
  - Test coverage for: brands, errors, version, params, validation, adapters, utils, content-types, types
  - Improved module documentation with usage examples

  ### @univ-lehavre/atlas-redcap-openapi
  - Now depends on `@univ-lehavre/atlas-redcap-core` for shared types
  - `ApiAction` type imported from redcap-core instead of being redefined
  - Re-exports content type constants and utilities (CONTENT_KEY_MAPPING, TAG_GROUPS, PERMISSION_MAPPING, etc.)
  - Consolidated types: extractor/types.ts now re-exports from core/types.ts
  - Removed duplicate ComparisonResult/ComparisonSummary definitions

- [#46](https://github.com/univ-lehavre/atlas/pull/46) [`9660c40`](https://github.com/univ-lehavre/atlas/commit/9660c402131b05e697a42441b7348eec93c88400) Thanks [@chasset](https://github.com/chasset)! - Split redcap package into redcap-openapi and redcap-sandbox
  - Renamed `@univ-lehavre/atlas-redcap` to `@univ-lehavre/atlas-redcap-openapi`
  - Moved OpenAPI extraction code to dedicated package
  - Created `@univ-lehavre/atlas-redcap-sandbox` (private) for testing infrastructure
  - Docker environment and contract tests now in separate sandbox package
  - REDCap upstream source moved to `upstream/` at package root
  - Extracted pure functional core module (`src/core/`) with:
    - Pure parsers for PHP source files (index.php, help.php, action files, schemas)
    - OpenAPI spec generator (pure function taking parsed data)
    - Spec comparator for detecting breaking changes
    - Exported via `@univ-lehavre/atlas-redcap-openapi/core`

### Patch Changes

- Updated dependencies [[`0b83927`](https://github.com/univ-lehavre/atlas/commit/0b839274782f50632aea3dcfc38e4ef6816f21dc), [`9ad9099`](https://github.com/univ-lehavre/atlas/commit/9ad9099d3861a6595d2acd6ecb10cf29d46a6d63)]:
  - @univ-lehavre/atlas-redcap-core@1.1.0

## 1.1.0

### Minor Changes

- [#29](https://github.com/univ-lehavre/atlas/pull/29) [`7782e18`](https://github.com/univ-lehavre/atlas/commit/7782e1823a17f52964f83448c01d2b15e469934f) Thanks [@chasset](https://github.com/chasset)! - Consolidate REDCap packages into unified structure

  ## @univ-lehavre/atlas-crf

  New unified package replacing scattered REDCap components:
  - Effect-based REDCap client with retry and typed errors
  - Hono HTTP server with routes (health, project, records, users)
  - CLI tools: `crf-redcap` and `crf-server`
  - Branded types: `RecordId`, `RedcapToken`, `RedcapUrl`, etc.
  - Multi-version support via `REDCAP_VERSION` env var

  ## @univ-lehavre/atlas-redcap

  New package for REDCap development tooling:
  - Docker environment (PHP 8.2, MariaDB 11.4, phpMyAdmin, Mailpit)
  - PHP source analyzer extracting OpenAPI specs from REDCap code
  - Multi-version support (14.5.10, 15.5.32, 16.0.8)
  - Contract tests (26 tests) validating API responses
  - Automated installation script

  ### Breaking Changes

  Removed packages (consolidated into above):
  - `cli/redcap`
  - `packages/redcap-api`
  - `services/redcap`
  - `tools/mock-redcap`

### Patch Changes

- [#29](https://github.com/univ-lehavre/atlas/pull/29) [`c5a5a55`](https://github.com/univ-lehavre/atlas/commit/c5a5a5536bb40425ee0f8dcc2e1ae5ee9ed2fff2) Thanks [@chasset](https://github.com/chasset)! - Migrate ESLint and Prettier to per-package configuration
  - Move ESLint config from root to each package/app with full rule set
  - Move Prettier config from root to each package/app
  - Update lefthook to use turbo tasks instead of direct eslint/prettier calls
  - Remove eslint and prettier from root devDependencies
  - Each package now has its own `.prettierrc`, `.prettierignore`, and `eslint.config.js`

- [#29](https://github.com/univ-lehavre/atlas/pull/29) [`51e499f`](https://github.com/univ-lehavre/atlas/commit/51e499f0bf72d14a3e1ca861b5db1f2c7c8d93ce) Thanks [@chasset](https://github.com/chasset)! - fix(redcap): output spec to versioned file path
  - `extract-api.ts` now writes to `specs/versions/redcap-${VERSION}.yaml`
  - `compare-spec.ts` now compares two REDCap versions instead of extracted vs CRF
  - Supports `REDCAP_VERSION_OLD` and `REDCAP_VERSION_NEW` env vars
