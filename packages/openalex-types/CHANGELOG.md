# @univ-lehavre/atlas-openalex-types

## 3.1.3

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

## 3.1.2

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

## 3.1.1

### Patch Changes

- [#79](https://github.com/univ-lehavre/atlas/pull/79) [`ea53772`](https://github.com/univ-lehavre/atlas/commit/ea53772f4125a7e201d53e6bc8b37bf44cac96f1) Thanks [@chasset](https://github.com/chasset)! - fix(researcher-profiles): audit — type safety, bugs critiques et robustesse
  - `openalex-types`: `doi` et `Authorship.author.display_name` typés `string | null` (reflète la réalité de l'API)
  - `pdf-generator`: null guard sur `display_name` avant `.split()` (NPE potentiel)
  - `process-row`: filtre fullnames — ajout du guard `size === 0 → skipped` dans le chemin fresh-authors (bug : tous les works étaient inclus si aucun nom sélectionné)
  - `process-row`: échec de sauvegarde des fullnames → retourne `"error"` au lieu de continuer silencieusement
  - `file-extractor`: limite OCR à `MAX_OCR_PAGES = 50` pour éviter un traitement illimité sur des PDFs volumineux
  - `match-references`: suppression des casts `as` et des `eslint-disable no-unnecessary-condition` devenus obsolètes

## 3.1.0

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
