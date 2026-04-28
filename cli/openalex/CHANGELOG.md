# @univ-lehavre/atlas-openalex-cli

## 1.1.1

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-openalex@1.1.1

## 1.1.0

### Minor Changes

- [`dc70780`](https://github.com/univ-lehavre/atlas/commit/dc707802c2dc220e9eba4b6089b090a91cbf7465) Thanks [@chasset](https://github.com/chasset)! - Extract CLI interaction from `packages/openalex` into new `cli/openalex` workspace.

  `@univ-lehavre/atlas-openalex` is now a proper reusable library (adds `exports`/`main`/`types` fields, removes `@clack/prompts`, `yargs`, `picocolors` dependencies). The interactive researcher curation program moves to `@univ-lehavre/atlas-openalex-cli`.

  `@univ-lehavre/atlas-crf`: extract `projectResponses` helper and refactor `createApp` to reduce duplication.

  `@univ-lehavre/atlas-find-an-expert`: add consent and user service test coverage.

### Patch Changes

- Updated dependencies [[`dc70780`](https://github.com/univ-lehavre/atlas/commit/dc707802c2dc220e9eba4b6089b090a91cbf7465)]:
  - @univ-lehavre/atlas-openalex@1.1.0
