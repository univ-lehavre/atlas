# @univ-lehavre/atlas-openalex-cli

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

### Patch Changes

- Updated dependencies [[`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3)]:
  - @univ-lehavre/atlas-citation@2.0.0

## 1.1.3

### Patch Changes

- [#123](https://github.com/univ-lehavre/atlas/pull/123) [`fa67ef8`](https://github.com/univ-lehavre/atlas/commit/fa67ef80e128e127f5bf602686f78f44ba02668f) Thanks [@chasset](https://github.com/chasset)! - Organize CLI source layout around bin, commands, config, prompts, and output adapters.

## 1.1.2

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea) Thanks [@chasset](https://github.com/chasset)! - Add `architectureCategory` option to ESLint presets in `shared-config` to enforce per-category import restrictions at lint time. All workspace packages receive their category assignment, enabling detection of CLI I/O in `packages/` and `*-cli` imports in `apps/` and `services/`. Normalize dependency specifiers and add `audit:dep-versions` script.

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`61bebae`](https://github.com/univ-lehavre/atlas/commit/61bebaeb579e42539937befb3fc344f631d81e98) Thanks [@chasset](https://github.com/chasset)! - Normalize dependency specifiers: pin `@clack/prompts` to `^1.2.0` (was exact alpha versions), add `^` to `@effect/vitest` and `@duckdb/node-api` exact pins. Add `audit:dep-versions` script to detect multi-version conflicts and unstable pinned dependencies across the workspace.

- Updated dependencies [[`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea), [`61bebae`](https://github.com/univ-lehavre/atlas/commit/61bebaeb579e42539937befb3fc344f631d81e98), [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25)]:
  - @univ-lehavre/atlas-openalex@1.1.2

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
