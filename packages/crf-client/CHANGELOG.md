# @univ-lehavre/atlas-redcap-client

## 3.0.1

### Patch Changes

- [#173](https://github.com/univ-lehavre/atlas/pull/173) [`3229d56`](https://github.com/univ-lehavre/atlas/commit/3229d56df92f880e112dfba6158fc48523699d36) Thanks [@chasset](https://github.com/chasset)! - DevSecOps runtime hardening + shared factories.

  `@univ-lehavre/atlas-auth` — minor
  - New `createRateLimiter({ limit, windowMs })` and `rateLimitHeaders(result, limit)` helpers (in-memory fixed-window per-key rate limiter, exit-fast 429 with `X-RateLimit-*` and `Retry-After` headers). Used by consuming apps to gate public HTTP endpoints and signup against abuse.
  - `createAuthService` now sets `httpOnly: true` explicitly on session cookies (Phase 6.4 of the DevSecOps plan). The default in SvelteKit was already `true` but it is now part of the contract.

  `@univ-lehavre/atlas-logos` — minor
  - New `atlas-logos-install` CLI bin (`packages/logos/bin/install.mjs`) that copies the logo assets to a target directory. Replaces the brittle `vite-plugin-static-copy` middleware path used by SvelteKit apps; consumers call it from their `prepare` script and SvelteKit serves the logos natively from `static/logos/`.

  `@univ-lehavre/atlas-crf-client` — patch
  - Normalise the trailing slash on the configured API URL (appended automatically when missing, preserved otherwise). Fixes a class of double-slash request failures.

  `@univ-lehavre/atlas-baas`, `@univ-lehavre/atlas-errors`, `@univ-lehavre/atlas-validators` — patch

  No source change in these packages themselves, but the consuming SvelteKit apps (amarre, ecrin, find-an-expert) have been refactored to use the existing shared factories — `createAdminClient` / `createSessionClient` / `BaasUserRepository` from `atlas-baas`, the error classes from `atlas-errors`, and `isEmail` / `isHexadecimal` / `ensureJsonContentType` / `parseJsonBody` from `atlas-validators`. The per-app duplicates (~500 lines) have been removed in favour of thin wrappers that inject app-level env-derived configuration. Recorded as patch bumps so the consolidation is traceable in the changelog and the released versions move forward in lockstep.

## 3.0.0

### Major Changes

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

### Patch Changes

- Updated dependencies [[`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3)]:
  - @univ-lehavre/atlas-crf-core@2.0.0

## 2.0.4

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-net@1.0.4
  - @univ-lehavre/atlas-redcap-core@1.1.5

## 2.0.3

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

- Updated dependencies [[`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec)]:
  - @univ-lehavre/atlas-net@1.0.3
  - @univ-lehavre/atlas-redcap-core@1.1.4

## 2.0.2

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-net@1.0.2
  - @univ-lehavre/atlas-redcap-core@1.1.3

## 2.0.1

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

- Updated dependencies [[`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da)]:
  - @univ-lehavre/atlas-net@1.0.1
  - @univ-lehavre/atlas-redcap-core@1.1.2

## 2.0.0

### Major Changes

- [#85](https://github.com/univ-lehavre/atlas/pull/85) [`44c2e72`](https://github.com/univ-lehavre/atlas/commit/44c2e72e50be33e43190dab11cb00385f8d74b5f) Thanks [@chasset](https://github.com/chasset)! - Restructure monorepo into clear architectural categories

  **Breaking changes:**
  - `@univ-lehavre/atlas-crf`: now a pure HTTP service (Hono). The `./redcap` subpath export and CLI binaries (`crf-redcap`, `crf-server`) have been removed. Use `@univ-lehavre/atlas-redcap-client` for the REDCap API client and `@univ-lehavre/atlas-crf-cli` for the CLIs.
  - `@univ-lehavre/atlas-net`: now a pure network diagnostic library. The `./cli` subpath export and `atlas-net` binary have been removed. Use `@univ-lehavre/atlas-net-cli` for the CLI.

  **New packages:**
  - `@univ-lehavre/atlas-redcap-client`: Effect-based REDCap API client, extracted from `@univ-lehavre/atlas-crf`.
  - `@univ-lehavre/atlas-crf-cli`: CLI tools for REDCap connectivity testing and CRF server management (`crf-redcap`, `crf-server`).
  - `@univ-lehavre/atlas-net-cli`: Network diagnostic CLI (`atlas-net`).

### Patch Changes

- Updated dependencies [[`44c2e72`](https://github.com/univ-lehavre/atlas/commit/44c2e72e50be33e43190dab11cb00385f8d74b5f)]:
  - @univ-lehavre/atlas-net@1.0.0
