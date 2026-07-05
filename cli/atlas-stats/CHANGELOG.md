# @univ-lehavre/atlas-stats-cli

## 1.0.5

### Patch Changes

- Updated dependencies []:
  - @univ-lehavre/atlas-stats@1.0.3

## 1.0.4

### Patch Changes

- [#250](https://github.com/univ-lehavre/atlas/pull/250) [`178dca4`](https://github.com/univ-lehavre/atlas/commit/178dca44aef7696c148adb6152b9f6885f25528e) Thanks [@chasset](https://github.com/chasset)! - Première publication de ces 8 CLIs sur les registres npm (npmjs.org +
  GitHub Packages). Le code est inchangé ; ce bump `patch` déclenche
  simplement leur release initiale via le pipeline Changesets existant
  (cf. [ADR 0017](docs/decisions/0017-releases-npm-oidc-deux-registres.md)).
  `atlas-biblio-cli` était déjà publié et n'est pas concerné.

## 1.0.3

### Patch Changes

- [#123](https://github.com/univ-lehavre/atlas/pull/123) [`fa67ef8`](https://github.com/univ-lehavre/atlas/commit/fa67ef80e128e127f5bf602686f78f44ba02668f) Thanks [@chasset](https://github.com/chasset)! - Organize CLI source layout around bin, commands, config, prompts, and output adapters.

## 1.0.2

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea) Thanks [@chasset](https://github.com/chasset)! - Add `architectureCategory` option to ESLint presets in `shared-config` to enforce per-category import restrictions at lint time. All workspace packages receive their category assignment, enabling detection of CLI I/O in `packages/` and `*-cli` imports in `apps/` and `services/`. Normalize dependency specifiers and add `audit:dep-versions` script.

- Updated dependencies [[`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea)]:
  - @univ-lehavre/atlas-stats@1.0.2

## 1.0.1

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-stats@1.0.1

## 1.0.0

### Major Changes

- [`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4) Thanks [@chasset](https://github.com/chasset)! - Bump all packages to v1.0.0 — stabilisation des API publiques.

### Patch Changes

- Updated dependencies [[`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4)]:
  - @univ-lehavre/atlas-stats@1.0.0

## 0.1.3

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

- Updated dependencies [[`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec)]:
  - @univ-lehavre/atlas-stats@0.1.3

## 0.1.2

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-stats@0.1.2

## 0.1.1

### Patch Changes

- [#100](https://github.com/univ-lehavre/atlas/pull/100) [`5cbaec9`](https://github.com/univ-lehavre/atlas/commit/5cbaec96addc2ce5e4826feab6b4f2120737a2ec) Thanks [@chasset](https://github.com/chasset)! - Harden Atlas stats collection and consumption across dashboard, shared library, and CLI.
  - make cache parsing resilient and resolve cache file from workspace root
  - fix UTC period boundary computation to avoid timezone drift
  - harden dashboard refresh flow (dedupe, cooldown, safer force behavior)
  - align dashboard routes with non-forced refresh endpoint
  - clean CLI typing/lint issues in JSON mode

- [#100](https://github.com/univ-lehavre/atlas/pull/100) [`46e73a0`](https://github.com/univ-lehavre/atlas/commit/46e73a08dc6d599a051a6f403f682beec1e89f96) Thanks [@chasset](https://github.com/chasset)! - Refactor Atlas stats CLI architecture and harden data collection/reporting.
  - move non-UI logic (token/workspace resolution, collection, fallback, report building) to `@univ-lehavre/atlas-stats`
  - keep CLI focused on user interactions and rendering
  - improve npm downloads resilience under rate limiting (429) with smaller batches and best-effort fallbacks
  - enrich report output (presence on npm/GitHub, release counts, monorepo split, totals)
  - add optional npm publish history support in shared types

- Updated dependencies [[`5cbaec9`](https://github.com/univ-lehavre/atlas/commit/5cbaec96addc2ce5e4826feab6b4f2120737a2ec), [`46e73a0`](https://github.com/univ-lehavre/atlas/commit/46e73a08dc6d599a051a6f403f682beec1e89f96)]:
  - @univ-lehavre/atlas-stats@0.1.1
