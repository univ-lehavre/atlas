---
"@univ-lehavre/atlas-openalex-types": minor
"@univ-lehavre/atlas-fetch-one-api-page": minor
"@univ-lehavre/atlas-fetch-openalex": minor
"@univ-lehavre/atlas-validate-openalex": minor
"@univ-lehavre/atlas-biblio-cli": minor
"@univ-lehavre/atlas-openalex": minor
"@univ-lehavre/atlas-crf": patch
---

### New packages — biblio & openalex migration

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
