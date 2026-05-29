# @univ-lehavre/atlas-auth

## 2.2.0

### Minor Changes

- [#219](https://github.com/univ-lehavre/atlas/pull/219) [`b09cef1`](https://github.com/univ-lehavre/atlas/commit/b09cef1b12c3f4c8428362727e9772db57148e49) Thanks [@chasset](https://github.com/chasset)! - Add `createLoginHandler` and `createLogoutHandler` factories exposing
  the shared `+server.ts` shape used by `apps/amarre/` and `apps/ecrin/`
  for `/api/v1/auth/login` and `/api/v1/auth/logout`. Each app's handler
  becomes a one-line composition over `createAuthService`'s `login` /
  `logout` methods:

  ```ts
  import { createLoginHandler } from '@univ-lehavre/atlas-auth';
  import { login } from '$lib/server/services/auth';
  export const POST = createLoginHandler({ login });
  ```

  The factories preserve the existing response envelope
  (`{ data: { loggedIn: true } | { loggedOut: true }, error: null }`) and
  the existing error mapping (`mapErrorToApiResponse` from
  `@univ-lehavre/atlas-errors`). No behavior change for the apps that
  migrate ; the apps' `+server.ts` files lose ~25 lines of repeated
  boilerplate each.

  `apps/find-an-expert/` is intentionally not migrated in this round
  because its handler currently returns the un-enveloped
  `{ loggedIn: true }`. Aligning find-an-expert with the shared envelope
  will land in a follow-up PR.

- [#222](https://github.com/univ-lehavre/atlas/pull/222) [`142ac8e`](https://github.com/univ-lehavre/atlas/commit/142ac8e8a6d0a899680281f843056f49a1b80157) Thanks [@chasset](https://github.com/chasset)! - Add `createMeHandler` factory closing the auth handler quartet
  (login/logout/signup/me). Reads `locals.userId` ; returns 401 with
  code `unauthenticated` when missing or not a non-empty string (the
  existing amarre/ecrin contract) ; delegates to `service.getProfile`
  when present and wraps the result in the shared `{ data, error }`
  envelope.

  The factory keeps the profile type opaque (`Promise<unknown>`) so each
  app can return whatever shape its UI consumes — `{ id, email, labels }`
  for amarre/ecrin today.

  apps/amarre and apps/ecrin `/api/v1/me/+server.ts` are migrated and
  drop from ~18 lines to 3. The amarre handler test
  (`tests/routes/api/v1/me.test.ts`, added in [#218](https://github.com/univ-lehavre/atlas/issues/218) before the factory
  existed) is removed — the factory tests in
  `packages/auth/src/handlers.test.ts` own the contract for both apps.

  ecrin gets a small fix as a side effect : its previous handler used
  `console.log(error)` and always returned 500 instead of going through
  `mapErrorToApiResponse`. With the factory in place, `ApplicationError`
  subclasses now surface with their proper HTTP status code.

  find-an-expert `/api/v1/users/me` is not migrated for the same reason
  as login/logout/signup : its response is un-enveloped (`json(payload)`
  directly). Aligning FAE will land in the follow-up envelope PR.

- [#219](https://github.com/univ-lehavre/atlas/pull/219) [`b09cef1`](https://github.com/univ-lehavre/atlas/commit/b09cef1b12c3f4c8428362727e9772db57148e49) Thanks [@chasset](https://github.com/chasset)! - Add `createSignupHandler` factory completing the auth handler trio
  started in the login/logout PR. Wraps the shared rate-limited signup
  flow (Phase 6.5 DevSecOps) and exposes three strategy points covering
  the cross-app divergences :
  - `extractEmail` — defaults to JSON body via `checkRequestBody` ; ecrin
    passes a `FormData`-based override.
  - `validateEmail` — amarre uses `validateSignupEmail` from this package
    with its `ALLOWED_DOMAINS_REGEXP`, ecrin uses its local
    `isAlliance`-backed validator.
  - `signupWithEmail` — receives the validated email plus the full
    SvelteKit event so each app can build its service context
    (`{ fetch }`, `{ fetch, cookies }`, etc.).

  The default rate limit is 5 req/min/IP, overridable via the
  `rateLimit` option. Responses always carry `X-RateLimit-*` headers ;
  429 adds `Retry-After`. The success payload is the existing envelope
  `{ data: { signedUp: true, createdAt? }, error: null }` — `createdAt`
  is now exposed everywhere (was missing on ecrin previously ;
  additive, non-breaking).

  amarre and ecrin signup handlers are migrated and drop from ~25-30
  lines to ~10. The redundant amarre tests at
  `tests/routes/api/v1/auth/{login,logout,signup}.test.ts` (introduced
  in [#218](https://github.com/univ-lehavre/atlas/issues/218) before the factory existed) are removed — the factory tests
  in `packages/auth/src/handlers.test.ts` now own that contract for both
  apps.

  find-an-expert signup is **not** migrated for the same reason as
  login/logout : its response is un-enveloped (`{ signedUp: true, ... }`).
  Aligning FAE will land in the follow-up envelope PR.

## 2.1.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [[`3229d56`](https://github.com/univ-lehavre/atlas/commit/3229d56df92f880e112dfba6158fc48523699d36)]:
  - @univ-lehavre/atlas-baas@2.0.1
  - @univ-lehavre/atlas-errors@1.0.2
  - @univ-lehavre/atlas-validators@1.0.2

## 2.0.0

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

- Updated dependencies [[`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3)]:
  - @univ-lehavre/atlas-baas@2.0.0

## 1.0.2

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea) Thanks [@chasset](https://github.com/chasset)! - Add `architectureCategory` option to ESLint presets in `shared-config` to enforce per-category import restrictions at lint time. All workspace packages receive their category assignment, enabling detection of CLI I/O in `packages/` and `*-cli` imports in `apps/` and `services/`. Normalize dependency specifiers and add `audit:dep-versions` script.

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25) Thanks [@chasset](https://github.com/chasset)! - Update dependency ranges and lockfile entries, and make the version audit fail when outdated dependencies are detected.

- Updated dependencies [[`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea), [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25)]:
  - @univ-lehavre/atlas-appwrite@1.0.2
  - @univ-lehavre/atlas-errors@1.0.1
  - @univ-lehavre/atlas-validators@1.0.1

## 1.0.1

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-appwrite@1.0.1
  - @univ-lehavre/atlas-errors@1.0.1
  - @univ-lehavre/atlas-validators@1.0.1

## 1.0.0

### Major Changes

- [`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4) Thanks [@chasset](https://github.com/chasset)! - Bump all packages to v1.0.0 — stabilisation des API publiques.

### Patch Changes

- Updated dependencies [[`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4)]:
  - @univ-lehavre/atlas-appwrite@1.0.0
  - @univ-lehavre/atlas-errors@1.0.0
  - @univ-lehavre/atlas-validators@1.0.0

## 0.2.4

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

- Updated dependencies [[`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec)]:
  - @univ-lehavre/atlas-appwrite@0.2.4
  - @univ-lehavre/atlas-errors@0.2.4
  - @univ-lehavre/atlas-validators@0.2.4

## 0.2.3

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-appwrite@0.2.3
  - @univ-lehavre/atlas-errors@0.2.3
  - @univ-lehavre/atlas-validators@0.2.3

## 0.2.2

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

- Updated dependencies [[`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da)]:
  - @univ-lehavre/atlas-appwrite@0.2.2
  - @univ-lehavre/atlas-errors@0.2.2
  - @univ-lehavre/atlas-validators@0.2.2

## 0.2.1

### Patch Changes

- [#64](https://github.com/univ-lehavre/atlas/pull/64) [`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6) Thanks [@chasset](https://github.com/chasset)! - ## Documentation
  - Translate all documentation to English for international accessibility
  - Add Microservices project with K3s installation procedure
  - Infrastructure: Cilium, Longhorn, Authelia, Mattermost, REDCap, ECRIN, Gitea, ArgoCD
  - Configure REDCap access control (public surveys, protected admin)

- Updated dependencies [[`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6)]:
  - @univ-lehavre/atlas-validators@0.2.1
  - @univ-lehavre/atlas-appwrite@0.2.1
  - @univ-lehavre/atlas-errors@0.2.1

## 0.2.0

### Minor Changes

- [#47](https://github.com/univ-lehavre/atlas/pull/47) [`9d0028a`](https://github.com/univ-lehavre/atlas/commit/9d0028af67634f284f73cd5473a9a3e8f6757b3c) Thanks [@chasset](https://github.com/chasset)! - feat: create shared packages for auth, errors, validators, and appwrite

  New shared packages to eliminate code duplication across SvelteKit apps:
  - `@univ-lehavre/atlas-errors`: ApplicationError base class and typed HTTP errors
  - `@univ-lehavre/atlas-appwrite`: Appwrite client utilities and UserRepository
  - `@univ-lehavre/atlas-validators`: Email, hex, JSON validation (RFC 5322, ReDoS-safe)
  - `@univ-lehavre/atlas-auth`: Authentication service with magic URL login

  Migrated amarre, ecrin, and find-an-expert to use shared packages via re-exports,
  maintaining backward compatibility for existing imports.

### Patch Changes

- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa) Thanks [@chasset](https://github.com/chasset)! - Remove `private` field from package.json to allow future publishing

- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`9ad9099`](https://github.com/univ-lehavre/atlas/commit/9ad9099d3861a6595d2acd6ecb10cf29d46a6d63) Thanks [@chasset](https://github.com/chasset)! - Add test:coverage script to packages

- Updated dependencies [[`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa), [`9ad9099`](https://github.com/univ-lehavre/atlas/commit/9ad9099d3861a6595d2acd6ecb10cf29d46a6d63), [`9d0028a`](https://github.com/univ-lehavre/atlas/commit/9d0028af67634f284f73cd5473a9a3e8f6757b3c)]:
  - @univ-lehavre/atlas-appwrite@0.2.0
  - @univ-lehavre/atlas-errors@0.2.0
  - @univ-lehavre/atlas-validators@0.2.0
