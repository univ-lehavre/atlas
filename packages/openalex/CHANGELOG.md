# @univ-lehavre/atlas-openalex

## 1.0.0

### Minor Changes

- [#68](https://github.com/univ-lehavre/atlas/pull/68) [`2ed6a4a`](https://github.com/univ-lehavre/atlas/commit/2ed6a4a03c5ceb65932a4eb2f5e8ae5dce1f3b03) Thanks [@chasset](https://github.com/chasset)! - ### New packages — biblio & openalex migration

  Six packages migrated from the `biblio` and `openalex` standalone repos into the atlas monorepo:
  - **`@univ-lehavre/atlas-openalex-types`** — Branded Effect types for OpenAlex entities (`ORCID`, `OpenAlexID`, API response shapes)
  - **`@univ-lehavre/atlas-fetch-one-api-page`** — Generic paginated fetch utility with typed `FetchError` / `ResponseParseError`
  - **`@univ-lehavre/atlas-fetch-openalex`** — Paginated OpenAlex API client with rate limiting and queue-based streaming
  - **`@univ-lehavre/atlas-validate-openalex`** — CLI tool for validating and updating OpenAlex affiliation data
  - **`@univ-lehavre/atlas-biblio-cli`** — Entry-point CLI for bibliography workflows
  - **`@univ-lehavre/atlas-openalex`** — DuckDB storage, ML embeddings (`@xenova/transformers`), author grouping by affiliation similarity

  All packages normalised to atlas toolchain conventions: `tsc` build, Vitest, `atlas-shared-config` ESLint/tsconfig, ESM-only exports, Effect `^3.20.0`.

  ### `@univ-lehavre/atlas-crf`
  - Fix type error in PDF download route: `parseRecordId` now accepts `string | undefined` to match hono 4.12+ `c.req.param()` return type

### Patch Changes

- Updated dependencies [[`2ed6a4a`](https://github.com/univ-lehavre/atlas/commit/2ed6a4a03c5ceb65932a4eb2f5e8ae5dce1f3b03), [`c772a94`](https://github.com/univ-lehavre/atlas/commit/c772a94eb3c4126834723b926824ee8e4a3afeec)]:
  - @univ-lehavre/atlas-fetch-one-api-page@1.1.0
