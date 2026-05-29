# @univ-lehavre/atlas-logos

## 3.0.0

### Major Changes

- [#211](https://github.com/univ-lehavre/atlas/pull/211) [`fc5dfb6`](https://github.com/univ-lehavre/atlas/commit/fc5dfb6244bc116ecae3fb51ceb8828f7dad2cd7) Thanks [@chasset](https://github.com/chasset)! - Création de la catégorie `assets/` et extraction du CLI d'installation des logos.
  - `@univ-lehavre/atlas-logos` (auparavant `packages/logos`) est désormais dans `assets/logos/`. Le paquet **ne contient plus que des fichiers statiques** (PNG, SVG, JPG). Le `bin` `atlas-logos-install` a été retiré (**breaking change**) — l'outil est maintenant dans `@univ-lehavre/atlas-logos-cli`.
  - `@univ-lehavre/atlas-logos-cli` est nouveau. Il expose le `bin` `atlas-logos-install <target-dir>` qui résout `@univ-lehavre/atlas-logos` via `createRequire` et copie les fichiers dans le répertoire cible.
  - Les apps `amarre`, `ecrin` et `find-an-expert` consomment désormais `@univ-lehavre/atlas-logos-cli` dans `devDependencies` (au lieu de `@univ-lehavre/atlas-logos` dans `dependencies`). Le script `prepare` reste inchangé : `atlas-logos-install static/logos`.

  Migration pour un consommateur externe utilisant le bin :

  ```diff
  - "dependencies": { "@univ-lehavre/atlas-logos": "^1.2.0" }
  + "devDependencies": { "@univ-lehavre/atlas-logos-cli": "^1.0.0" }
  ```

  Aucun changement pour les consommateurs qui importent directement les fichiers (`@univ-lehavre/atlas-logos/ulhn.svg`, etc.) : ce chemin reste identique en 2.0.0.

## 1.2.0

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

## 1.1.3

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea) Thanks [@chasset](https://github.com/chasset)! - Add `architectureCategory` option to ESLint presets in `shared-config` to enforce per-category import restrictions at lint time. All workspace packages receive their category assignment, enabling detection of CLI I/O in `packages/` and `*-cli` imports in `apps/` and `services/`. Normalize dependency specifiers and add `audit:dep-versions` script.

## 1.1.2

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

## 1.1.1

### Patch Changes

- [#63](https://github.com/univ-lehavre/atlas/pull/63) [`a67fbc0`](https://github.com/univ-lehavre/atlas/commit/a67fbc038561190cd982873c41cf0ca0030fa4ee) Thanks [@chasset](https://github.com/chasset)! - docs: restructure documentation and add dynamic api sidebar
  - Add dynamic API sidebar generation from TypeDoc structure (219 items)
  - Split /guide/ into /guide/researchers/ and /guide/developers/
  - Add project status warnings to AMARRE, Citations, and Infrastructure
  - Replace docs/public/logos with symlink to packages/logos
  - Add "Me" card to ECRIN Introduce section
  - Update API index page with all 14 packages organized by category

## 1.1.0

### Minor Changes

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

- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa) Thanks [@chasset](https://github.com/chasset)! - Remove `private` field from package.json to allow future publishing
