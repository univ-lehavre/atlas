# @univ-lehavre/atlas-dashboard

## 1.0.3

### Patch Changes

- [#199](https://github.com/univ-lehavre/atlas/pull/199) [`448f6b4`](https://github.com/univ-lehavre/atlas/commit/448f6b4ef4643340662bf78de86d8be78a822097) Thanks [@chasset](https://github.com/chasset)! - Mark `atlas-dashboard`, `atlas-crf-dashboard`, and `atlas-crf-sandbox` as `"private": true` to prevent accidental npm publication. The two dashboards are SvelteKit apps deployed via Appwrite Sites ; the sandbox is a Docker-only local environment, not a distributable npm package. No runtime impact — these packages were never on the publish list, this just makes the intent explicit.

  Also cleans up `TODO.md` :
  - Mark "Examine the 7 Dependabot alerts" complete : all 7 were auto-fixed on 2026-05-21 by the Dependabot bumps (cookie, esbuild, js-yaml, ajv, vite, ws, protobufjs). Verified on 2026-05-22 : 0 open Dependabot alerts.
  - Mark Phase 6.5 (rate limiting) complete in the "DevSecOps" summary list : the work is live in `packages/auth/src/rate-limit.ts` + consumers in amarre/ecrin/find-an-expert. The detailed section was already marked done, only the summary line was stale.
  - Mark "Verify CodeQL alerts surface in the Security tab" complete : confirmed via the successive triages ([#194](https://github.com/univ-lehavre/atlas/issues/194) + [#198](https://github.com/univ-lehavre/atlas/issues/198)).

## 1.0.2

### Patch Changes

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
