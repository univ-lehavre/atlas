# @univ-lehavre/atlas-researcher-profiles

## 2.0.2

### Patch Changes

- Updated dependencies []:
  - @univ-lehavre/atlas-crf-client@3.0.2

## 2.0.1

### Patch Changes

- Updated dependencies [[`3229d56`](https://github.com/univ-lehavre/atlas/commit/3229d56df92f880e112dfba6158fc48523699d36)]:
  - @univ-lehavre/atlas-crf-client@3.0.1

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

- [#125](https://github.com/univ-lehavre/atlas/pull/125) [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3) Thanks [@chasset](https://github.com/chasset)! - Renommage du package `@univ-lehavre/atlas-openalex-types` en `@univ-lehavre/atlas-citation-types` pour retirer toute référence à une marque tierce dans les identifiants publics.

  **Breaking changes — `@univ-lehavre/atlas-citation-types`**
  - Le package npm s'appelle désormais `@univ-lehavre/atlas-citation-types`. L'ancien `@univ-lehavre/atlas-openalex-types` sera déprécié.
  - Renommages d'exports :
    - `OpenAlexID` → `CitationID` (type brandé)
    - `asOpenAlexID` → `asCitationID` (constructeur brandé)
    - `OpenalexResponse` → `CitationResponse` (wrapper de réponse paginée)
    - `FetchOpenAlexAPIOptions` → `FetchCitationAPIOptions` (options de requête)
  - Les URLs validées (`https://openalex.org/...`) et les messages d'erreur restent inchangés — la marque OpenAlex est mentionnée uniquement dans le texte descriptif (README, JSDoc, messages), jamais dans les identifiants.

  **Migration côté consommateur**

  ```diff
  - import { asOpenAlexID, type OpenAlexID } from '@univ-lehavre/atlas-openalex-types';
  + import { asCitationID, type CitationID } from '@univ-lehavre/atlas-citation-types';
  ```

  **Consommateurs impactés**
  - `@univ-lehavre/atlas-fetch-openalex`, `@univ-lehavre/atlas-validate-openalex`, `@univ-lehavre/atlas-researcher-profiles` : imports et identifiants dérivés (`get*OpenAlexID*` → `get*CitationID*`) mis à jour.
  - `@univ-lehavre/atlas-biblio-cli`, `@univ-lehavre/atlas-researcher-profiles-cli` : imports mis à jour, surface CLI inchangée.

- [#125](https://github.com/univ-lehavre/atlas/pull/125) [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3) Thanks [@chasset](https://github.com/chasset)! - Renommage du cluster REDCap (packages internes) en cluster `crf` pour retirer la marque REDCap des identifiants publics du monorepo. Suite de la migration commencée avec `citation-types` et le cluster `citation`.

  **Packages renommés (npm + dossiers + workspace)**

  | Avant (npm)                         | Après (npm)                      |
  | ----------------------------------- | -------------------------------- |
  | `@univ-lehavre/atlas-redcap-core`   | `@univ-lehavre/atlas-crf-core`   |
  | `@univ-lehavre/atlas-redcap-client` | `@univ-lehavre/atlas-crf-client` |
  | `@univ-lehavre/atlas-redcap-logs`   | `@univ-lehavre/atlas-crf-logs`   |

  Les packages restants nommés `redcap-*` (apps/redcap-dashboard, cli/redcap-openapi, cli/redcap-stats, sandbox/redcap-sandbox) seront traités dans la PR 4.

  **Identifiants publics renommés (PascalCase, ~798 occurrences)**

  Toutes les classes/types/erreurs avec préfixe `Redcap` → `Crf` :
  - `RedcapClient` → `CrfClient`, `RedcapClientError` → `CrfClientError`, `RedcapClientService` → `CrfClientService`
  - `RedcapConfig` → `CrfConfig`, `RedcapConnectionConfig` → `CrfConnectionConfig`
  - `RedcapAdapter` → `CrfAdapter`, `RedcapFeatures` → `CrfFeatures`
  - `RedcapToken` / `RedcapTokenType` / `RedcapUrl` / `RedcapUrlType` (brands) → `Crf*` correspondants
  - `RedcapApiError`, `RedcapHttpError`, `RedcapNetworkError`, `RedcapFetchError`, `RedcapError`, `RedcapWriteError` → `Crf*`
  - `RedcapLogEntry` → `CrfLogEntry`
  - Fonctions : `createRedcapClient`, `makeRedcapClient`, `makeRedcapClientLayer`, `isRedcapErrorResponse`, `isValidRedcapName`, `checkRedcapServer` → `*Crf*`

  **Variables / champs**
  - `redcapApiToken`, `redcapApiUrl`, `redcapConfig`, `redcapResult`, `redcapToken`, `redcapUrl` → `crf*`
  - `REDCAP_NAME_PATTERN` / `REDCAP_TOKEN_PATTERN` → `CRF_*`
  - Codes d'erreur HTTP : `redcap_http_error` → `crf_http_error`, `redcap_api_error` → `crf_api_error`, `redcap_error` → `crf_error`
  - Variable exportée dans `services/crf/src/server/client.ts` : `redcap` → `client`

  **Sous-commandes CLI**
  - `cli/researcher-profiles` : `from-redcap` → `from-crf`
  - `cli/crf` : `crf-redcap` → `crf-api`

  **Dossiers / fichiers renommés**

  | Avant                                                 | Après                                              |
  | ----------------------------------------------------- | -------------------------------------------------- |
  | `apps/amarre/src/lib/server/redcap/`                  | `apps/amarre/src/lib/server/crf/`                  |
  | `apps/ecrin/src/lib/redcap/`                          | `apps/ecrin/src/lib/crf/`                          |
  | `cli/crf/src/commands/redcap/`                        | `cli/crf/src/commands/api/`                        |
  | `services/crf/src/server/redcap.ts`                   | `services/crf/src/server/client.ts`                |
  | `cli/researcher-profiles/src/commands/from-redcap.ts` | `cli/researcher-profiles/src/commands/from-crf.ts` |

  **Conservé (texte descriptif uniquement)**
  - Variables d'environnement (`REDCAP_API_TOKEN`, `REDCAP_API_URL`, `REDCAP_URL`, `PUBLIC_REDCAP_URL`)
  - Champs de données REDCap natifs (`redcap_event_name`, `redcap_repeat_instance`, `redcap_repeat_instrument`, `redcap_v`, `redcap16`)
  - URLs (`redcap.example.com`, `projectredcap.org`)
  - Messages d'erreur, JSDoc, libellés utilisateur mentionnant REDCap
  - `apps/redcap-dashboard/.redcap-stats.json` (entrée `.gitignore`, sera traitée en PR 4)

  **Migration côté consommateur**

  ```diff
  - import { type RedcapClient, createRedcapClient } from '@univ-lehavre/atlas-redcap-client';
  + import { type CrfClient, createCrfClient } from '@univ-lehavre/atlas-crf-client';
  ```

### Patch Changes

- Updated dependencies [[`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3), [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3), [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3)]:
  - @univ-lehavre/atlas-citation-fetch@2.0.0
  - @univ-lehavre/atlas-citation-types@4.0.0
  - @univ-lehavre/atlas-crf-client@3.0.0

## 1.7.0

### Minor Changes

- [#117](https://github.com/univ-lehavre/atlas/pull/117) [`d7ed335`](https://github.com/univ-lehavre/atlas/commit/d7ed33581635fdd3991bb4add8c2edfd5e6dc1fd) Thanks [@chasset](https://github.com/chasset)! - Add researcher matching command (`match-researchers`)

  Computes pairwise similarity and complementarity between researchers using an ensemble of TF-IDF weighted topic vectors (OpenAlex taxonomy) and semantic embeddings (`all-MiniLM-L6-v2`).
  - `similarity`: 50% TF-IDF cosine + 50% embedding cosine
  - `complementarity`: shared context (domain/field/subfield) × (1 − topic overlap)
  - Output: ranked table or JSON; optional interactive SVG scatter plot (`--chart`)
  - `--keywords` flag includes OpenAlex keyword vectors in both scoring and explanation
  - `--sort-by similarity|complementarity` controls ranking

### Patch Changes

- Updated dependencies [[`d7ed335`](https://github.com/univ-lehavre/atlas/commit/d7ed33581635fdd3991bb4add8c2edfd5e6dc1fd)]:
  - @univ-lehavre/atlas-openalex-types@3.1.6
  - @univ-lehavre/atlas-fetch-openalex@1.0.3

## 1.6.7

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea) Thanks [@chasset](https://github.com/chasset)! - Add `architectureCategory` option to ESLint presets in `shared-config` to enforce per-category import restrictions at lint time. All workspace packages receive their category assignment, enabling detection of CLI I/O in `packages/` and `*-cli` imports in `apps/` and `services/`. Normalize dependency specifiers and add `audit:dep-versions` script.

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`61bebae`](https://github.com/univ-lehavre/atlas/commit/61bebaeb579e42539937befb3fc344f631d81e98) Thanks [@chasset](https://github.com/chasset)! - Normalize dependency specifiers: pin `@clack/prompts` to `^1.2.0` (was exact alpha versions), add `^` to `@effect/vitest` and `@duckdb/node-api` exact pins. Add `audit:dep-versions` script to detect multi-version conflicts and unstable pinned dependencies across the workspace.

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25) Thanks [@chasset](https://github.com/chasset)! - Update dependency ranges and lockfile entries, and make the version audit fail when outdated dependencies are detected.

- Updated dependencies [[`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea), [`61bebae`](https://github.com/univ-lehavre/atlas/commit/61bebaeb579e42539937befb3fc344f631d81e98)]:
  - @univ-lehavre/atlas-fetch-openalex@1.0.2
  - @univ-lehavre/atlas-openalex-types@3.1.5
  - @univ-lehavre/atlas-redcap-client@2.0.4

## 1.6.6

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-fetch-openalex@1.0.1
  - @univ-lehavre/atlas-openalex-types@3.1.5
  - @univ-lehavre/atlas-redcap-client@2.0.4

## 1.6.5

### Patch Changes

- Updated dependencies [[`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4)]:
  - @univ-lehavre/atlas-fetch-openalex@1.0.0
  - @univ-lehavre/atlas-openalex-types@3.1.4
  - @univ-lehavre/atlas-redcap-client@2.0.3

## 1.6.4

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

- Updated dependencies [[`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec)]:
  - @univ-lehavre/atlas-fetch-openalex@0.4.4
  - @univ-lehavre/atlas-openalex-types@3.1.4
  - @univ-lehavre/atlas-redcap-client@2.0.3

## 1.6.3

### Patch Changes

- [#105](https://github.com/univ-lehavre/atlas/pull/105) [`3bec138`](https://github.com/univ-lehavre/atlas/commit/3bec138f504b95fbc616746e90b2deeac1e815a7) Thanks [@chasset](https://github.com/chasset)! - Validate researcher CSV inputs and make monthly OpenAlex refresh checks deterministic.

## 1.6.2

### Patch Changes

- [#106](https://github.com/univ-lehavre/atlas/pull/106) [`1c7401f`](https://github.com/univ-lehavre/atlas/commit/1c7401fd3b0b2056706365db120d1b049df9198f) Thanks [@chasset](https://github.com/chasset)! - Raise the DOM parser dependency floor used for DOCX extraction to avoid vulnerable XML serialization versions.

## 1.6.1

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-fetch-openalex@0.4.3
  - @univ-lehavre/atlas-openalex-types@3.1.3
  - @univ-lehavre/atlas-redcap-client@2.0.2

## 1.6.0

### Minor Changes

- [#93](https://github.com/univ-lehavre/atlas/pull/93) [`9ad08ac`](https://github.com/univ-lehavre/atlas/commit/9ad08aca02fdd62ed0636f7b6e7434ee7ef659dc) Thanks [@chasset](https://github.com/chasset)! - Insert the publications PDF field before references in the generated OA PDF.

  The debug appendix (Annexe — Données de résolution) is now emitted first, followed by the raw publications PDF (from the REDCap field), then the verified and pending references. PDFs are assembled with `pdf-lib`.

## 1.5.0

### Minor Changes

- [#91](https://github.com/univ-lehavre/atlas/pull/91) [`f6c40d0`](https://github.com/univ-lehavre/atlas/commit/f6c40d040866b8c173a1055618af5b0efa744717) Thanks [@chasset](https://github.com/chasset)! - Consolidate REDCap storage into a single `oa_data` JSON file and a single `oa_pdf` file.

  **Breaking changes in `atlas-researcher-profiles`:**
  - `ResearcherRow`: replaced 4 separate date fields with `oa_imported_at` and new `oa_locked_at`; renamed `references_openalex_complete` → `openalex_complete`
  - Removed: `fetchAlternativeAuthorFullnames`, `fetchAlternativeAuthorAffiliations`, `fetchOaReferences`, `writeAlternativeAuthorFullnames`, `writeAlternativeAuthorAffiliations`, `writeOaReferences`, `writeRawReferences`, `writeFinalReferences` (old signature), `generateReferencesPdf`, `generateRawReferencesPdf`
  - Added: `ResearcherData`, `emptyResearcherData`, `fetchResearcherData`, `writeResearcherData`, `writeFinalReferences` (new signature with optional `PdfDebugInfo`), `generateCombinedPdf`, `PdfDebugInfo`

  **`atlas-researcher-profiles-cli`:**
  - All downloaded works are now stored in `oa_references`; name/affiliation filters applied in `match-references` step only
  - `oa_pdf` now includes a debug appendix: resolved OpenAlex author profiles, raw author name variants (highlighted if selected), and the extracted text submitted to fuzzy matching
  - Lock guard: if `oa_locked_at` is set, processing aborts immediately with an error
  - DOCX extraction fix: inject `@xmldom/xmldom` DOMParser before loading mammoth

## 1.4.1

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

- Updated dependencies [[`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da)]:
  - @univ-lehavre/atlas-fetch-openalex@0.4.2
  - @univ-lehavre/atlas-openalex-types@3.1.2
  - @univ-lehavre/atlas-redcap-client@2.0.1

## 1.4.0

### Minor Changes

- [#85](https://github.com/univ-lehavre/atlas/pull/85) [`a2162e7`](https://github.com/univ-lehavre/atlas/commit/a2162e7d68d378bde44f162e2da393327ea18016) Thanks [@chasset](https://github.com/chasset)! - Extract pure service layer into `packages/researcher-profiles`.

  **New package:**
  - `@univ-lehavre/atlas-researcher-profiles`: pure library containing services (csv, openalex, redcap, file-extractor, pdf-generator, reference-matcher), types, errors, and utils (`daysUntilNextUpdate`).

  **Changes:**
  - `@univ-lehavre/atlas-researcher-profiles-cli`: renamed from `@univ-lehavre/atlas-researcher-profiles`. Now a thin CLI — user interaction only, all business logic moved to the library package.

### Patch Changes

- [#85](https://github.com/univ-lehavre/atlas/pull/85) [`44c2e72`](https://github.com/univ-lehavre/atlas/commit/44c2e72e50be33e43190dab11cb00385f8d74b5f) Thanks [@chasset](https://github.com/chasset)! - Restructure monorepo into clear architectural categories

  **Breaking changes:**
  - `@univ-lehavre/atlas-crf`: now a pure HTTP service (Hono). The `./redcap` subpath export and CLI binaries (`crf-redcap`, `crf-server`) have been removed. Use `@univ-lehavre/atlas-redcap-client` for the REDCap API client and `@univ-lehavre/atlas-crf-cli` for the CLIs.
  - `@univ-lehavre/atlas-net`: now a pure network diagnostic library. The `./cli` subpath export and `atlas-net` binary have been removed. Use `@univ-lehavre/atlas-net-cli` for the CLI.

  **New packages:**
  - `@univ-lehavre/atlas-redcap-client`: Effect-based REDCap API client, extracted from `@univ-lehavre/atlas-crf`.
  - `@univ-lehavre/atlas-crf-cli`: CLI tools for REDCap connectivity testing and CRF server management (`crf-redcap`, `crf-server`).
  - `@univ-lehavre/atlas-net-cli`: Network diagnostic CLI (`atlas-net`).

- Updated dependencies [[`44c2e72`](https://github.com/univ-lehavre/atlas/commit/44c2e72e50be33e43190dab11cb00385f8d74b5f)]:
  - @univ-lehavre/atlas-redcap-client@2.0.0
