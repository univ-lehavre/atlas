# @univ-lehavre/atlas-dashboard

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

- Updated dependencies [[`5cbaec9`](https://github.com/univ-lehavre/atlas/commit/5cbaec96addc2ce5e4826feab6b4f2120737a2ec), [`46e73a0`](https://github.com/univ-lehavre/atlas/commit/46e73a08dc6d599a051a6f403f682beec1e89f96)]:
  - @univ-lehavre/atlas-stats@0.1.1
