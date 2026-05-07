# @univ-lehavre/atlas-crf-cli

## 2.0.8

### Patch Changes

- [#123](https://github.com/univ-lehavre/atlas/pull/123) [`fa67ef8`](https://github.com/univ-lehavre/atlas/commit/fa67ef80e128e127f5bf602686f78f44ba02668f) Thanks [@chasset](https://github.com/chasset)! - Organize CLI source layout around bin, commands, config, prompts, and output adapters.

## 2.0.7

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea) Thanks [@chasset](https://github.com/chasset)! - Add `architectureCategory` option to ESLint presets in `shared-config` to enforce per-category import restrictions at lint time. All workspace packages receive their category assignment, enabling detection of CLI I/O in `packages/` and `*-cli` imports in `apps/` and `services/`. Normalize dependency specifiers and add `audit:dep-versions` script.

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25) Thanks [@chasset](https://github.com/chasset)! - Update dependency ranges and lockfile entries, and make the version audit fail when outdated dependencies are detected.

- Updated dependencies [[`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea), [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25)]:
  - @univ-lehavre/atlas-crf@2.0.6
  - @univ-lehavre/atlas-redcap-client@2.0.4

## 2.0.6

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-crf@2.0.5
  - @univ-lehavre/atlas-redcap-client@2.0.4

## 2.0.5

### Patch Changes

- Updated dependencies [[`dc70780`](https://github.com/univ-lehavre/atlas/commit/dc707802c2dc220e9eba4b6089b090a91cbf7465)]:
  - @univ-lehavre/atlas-crf@2.0.4
  - @univ-lehavre/atlas-redcap-client@2.0.3

## 2.0.4

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

- Updated dependencies [[`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec)]:
  - @univ-lehavre/atlas-crf@2.0.3
  - @univ-lehavre/atlas-redcap-client@2.0.3

## 2.0.3

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-redcap-client@2.0.2
  - @univ-lehavre/atlas-crf@2.0.2

## 2.0.2

### Patch Changes

- [#100](https://github.com/univ-lehavre/atlas/pull/100) [`eaaf319`](https://github.com/univ-lehavre/atlas/commit/eaaf31902d9b49adaa0c3cd5771e9d0707fabe29) Thanks [@chasset](https://github.com/chasset)! - Standardize CLI workspace layout and metadata.
  - move CLI workspaces from `cli/*-cli` directories to `cli/*`
  - align `repository.directory` with new workspace paths

## 2.0.1

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

- Updated dependencies [[`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da)]:
  - @univ-lehavre/atlas-crf@2.0.1
  - @univ-lehavre/atlas-redcap-client@2.0.1

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
  - @univ-lehavre/atlas-crf@2.0.0
  - @univ-lehavre/atlas-redcap-client@2.0.0
