# @univ-lehavre/atlas-openalex

## 2.1.0

### Minor Changes

- [#536](https://github.com/univ-lehavre/atlas/pull/536) [`2cbb5f0`](https://github.com/univ-lehavre/atlas/commit/2cbb5f02195c408f15d79a13db888e304c6ba54c) Thanks [@chasset](https://github.com/chasset)! - - fix: configmap citation-migrations en hook presync
  - feat: appliquer la migration de schéma en hook presync argo cd
  - fix: relever le plancher dbt-core pour deepdiff>=8 natif
  - feat: chargement des vecteurs + recherche sémantique knn (étape 4.3)
  - feat: chargement fts tsvector lexical par chercheur (étape 4.2)
  - fix: attente pg par vraie requête, pas pg_isready (étape 4.1)
  - feat: schéma postgres d'index pgvector (pairs/researchers, étape 4.1)
  - feat: validateur du contrat de données (manifest, étape 3.6)

## 2.0.0

### Major Changes

- [#125](https://github.com/univ-lehavre/atlas/pull/125) [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3) Thanks [@chasset](https://github.com/chasset)! - Renommage du cluster OpenAlex en cluster `citation` pour retirer la marque OpenAlex des identifiants publics du monorepo (suite de la migration commencée avec `citation-types`).

  **Packages renommés**

  | Avant (npm)                             | Après (npm)                             |
  | --------------------------------------- | --------------------------------------- |
  | `@univ-lehavre/atlas-fetch-openalex`    | `@univ-lehavre/atlas-citation-fetch`    |
  | `@univ-lehavre/atlas-openalex`          | `@univ-lehavre/atlas-citation`          |
  | `@univ-lehavre/atlas-validate-openalex` | `@univ-lehavre/atlas-citation-validate` |
  | `@univ-lehavre/atlas-openalex-cli`      | `@univ-lehavre/atlas-citation-cli`      |

  Les anciens packages npm seront dépréciés vers les nouveaux noms.

  **Bin renommé**
  - `atlas-openalex` → `atlas-citation` (dans `@univ-lehavre/atlas-citation-cli`)

  **Identifiants publics renommés**
  - Types : `OpenAlexConfig` → `CitationConfig`, `OpenalexResponse` → `CitationResponse`, `OpenalexSearchAuthorAffiliationResult` → `CitationSearchAuthorAffiliationResult`
  - Erreurs : `OpenAlexSearchError` (exporté par `@univ-lehavre/atlas-researcher-profiles`) → `CitationSearchError`
  - Champs : `openalex_api_url` → `citation_api_url`, `openalex_api_key` → `citation_api_key`
  - Fichiers : `fetch-openalex.ts`, `fetch-openalex-entities.ts`, `types/openalex.ts` → `fetch-citation.ts`, `fetch-citation-entities.ts`, `types/citation.ts`
  - Apps : `apps/find-an-expert/src/lib/server/openalex/` → `apps/find-an-expert/src/lib/server/citation/`

  **Conservé (texte descriptif uniquement)**
  - URLs d'API (`https://openalex.org/...`) — réelle adresse d'API tierce
  - Messages d'erreur et JSDoc mentionnant "OpenAlex" — texte explicatif
  - Variables d'environnement `OPENALEX_*` — convention imposée par le service tiers

  **Migration côté consommateur**

  ```diff
  - import { type OpenAlexConfig } from '@univ-lehavre/atlas-fetch-openalex';
  + import { type CitationConfig } from '@univ-lehavre/atlas-citation-fetch';
  ```

  ```diff
  - import { type OpenalexSearchAuthorAffiliationResult } from '@univ-lehavre/atlas-openalex';
  + import { type CitationSearchAuthorAffiliationResult } from '@univ-lehavre/atlas-citation';
  ```

  **Note sur `@univ-lehavre/atlas-find-an-expert`** : l'app n'est pas publiée sur npm, mais reçoit un bump major car ses imports et la structure de ses dossiers `lib/server/citation/` changent — utile pour le suivi changelog interne.

## 1.1.2

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea) Thanks [@chasset](https://github.com/chasset)! - Add `architectureCategory` option to ESLint presets in `shared-config` to enforce per-category import restrictions at lint time. All workspace packages receive their category assignment, enabling detection of CLI I/O in `packages/` and `*-cli` imports in `apps/` and `services/`. Normalize dependency specifiers and add `audit:dep-versions` script.

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`61bebae`](https://github.com/univ-lehavre/atlas/commit/61bebaeb579e42539937befb3fc344f631d81e98) Thanks [@chasset](https://github.com/chasset)! - Normalize dependency specifiers: pin `@clack/prompts` to `^1.2.0` (was exact alpha versions), add `^` to `@effect/vitest` and `@duckdb/node-api` exact pins. Add `audit:dep-versions` script to detect multi-version conflicts and unstable pinned dependencies across the workspace.

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25) Thanks [@chasset](https://github.com/chasset)! - Update dependency ranges and lockfile entries, and make the version audit fail when outdated dependencies are detected.

- Updated dependencies [[`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea), [`61bebae`](https://github.com/univ-lehavre/atlas/commit/61bebaeb579e42539937befb3fc344f631d81e98)]:
  - @univ-lehavre/atlas-fetch-one-api-page@1.1.5

## 1.1.1

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-fetch-one-api-page@1.1.4

## 1.1.0

### Minor Changes

- [`dc70780`](https://github.com/univ-lehavre/atlas/commit/dc707802c2dc220e9eba4b6089b090a91cbf7465) Thanks [@chasset](https://github.com/chasset)! - Extract CLI interaction from `packages/openalex` into new `cli/openalex` workspace.

  `@univ-lehavre/atlas-openalex` is now a proper reusable library (adds `exports`/`main`/`types` fields, removes `@clack/prompts`, `yargs`, `picocolors` dependencies). The interactive researcher curation program moves to `@univ-lehavre/atlas-openalex-cli`.

  `@univ-lehavre/atlas-crf`: extract `projectResponses` helper and refactor `createApp` to reduce duplication.

  `@univ-lehavre/atlas-find-an-expert`: add consent and user service test coverage.

### Patch Changes

- Updated dependencies []:
  - @univ-lehavre/atlas-fetch-one-api-page@1.1.3

## 1.0.3

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

- Updated dependencies [[`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec)]:
  - @univ-lehavre/atlas-fetch-one-api-page@1.1.3

## 1.0.2

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-fetch-one-api-page@1.1.2

## 1.0.1

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

- Updated dependencies [[`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da)]:
  - @univ-lehavre/atlas-fetch-one-api-page@1.1.1

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
