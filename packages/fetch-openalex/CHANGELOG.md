# @univ-lehavre/atlas-fetch-openalex

## 0.4.2

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

- Updated dependencies [[`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da)]:
  - @univ-lehavre/atlas-fetch-one-api-page@1.1.1
  - @univ-lehavre/atlas-openalex-types@3.1.2

## 0.4.1

### Patch Changes

- Updated dependencies [[`ea53772`](https://github.com/univ-lehavre/atlas/commit/ea53772f4125a7e201d53e6bc8b37bf44cac96f1)]:
  - @univ-lehavre/atlas-openalex-types@3.1.1

## 0.4.0

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

- [#69](https://github.com/univ-lehavre/atlas/pull/69) [`c772a94`](https://github.com/univ-lehavre/atlas/commit/c772a94eb3c4126834723b926824ee8e4a3afeec) Thanks [@chasset](https://github.com/chasset)! - Centralize OpenAlex API client in `fetch-openalex` with `api_key` authentication and rate-limit header support.
  - **`fetch-one-api-page`**: `fetchOnePage` now returns `{ data, rateLimit? }` instead of `T`. Rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Credits-Used`, `X-RateLimit-Reset`) are parsed and exposed.
  - **`openalex-types`**: New `RateLimitInfo` interface. New `api_key` field in `FetchOpenAlexAPIOptions`.
  - **`fetch-openalex`**: New functions — `searchInstitutions`, `getWorksCount`, `getInstitutionStats`, `searchAuthorsByName`, `searchAuthorsByORCID`, `searchWorksByAuthorIDs`, `searchWorksByORCID`, `searchWorksByDOI`. All accept an `OpenAlexConfig` with optional `apiKey`.

### Patch Changes

- Updated dependencies [[`2ed6a4a`](https://github.com/univ-lehavre/atlas/commit/2ed6a4a03c5ceb65932a4eb2f5e8ae5dce1f3b03), [`c772a94`](https://github.com/univ-lehavre/atlas/commit/c772a94eb3c4126834723b926824ee8e4a3afeec)]:
  - @univ-lehavre/atlas-openalex-types@3.1.0
  - @univ-lehavre/atlas-fetch-one-api-page@1.1.0
