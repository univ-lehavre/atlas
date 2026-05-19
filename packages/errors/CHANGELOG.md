# @univ-lehavre/atlas-errors

## 1.0.2

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

## 1.0.1

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

## 1.0.0

### Major Changes

- [`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4) Thanks [@chasset](https://github.com/chasset)! - Bump all packages to v1.0.0 — stabilisation des API publiques.

## 0.2.4

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

## 0.2.3

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

## 0.2.2

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

## 0.2.1

### Patch Changes

- [#64](https://github.com/univ-lehavre/atlas/pull/64) [`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6) Thanks [@chasset](https://github.com/chasset)! - ## Documentation
  - Translate all documentation to English for international accessibility
  - Add Microservices project with K3s installation procedure
  - Infrastructure: Cilium, Longhorn, Authelia, Mattermost, REDCap, ECRIN, Gitea, ArgoCD
  - Configure REDCap access control (public surveys, protected admin)

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
