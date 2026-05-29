# @univ-lehavre/atlas-researcher-profiles

## 1.4.4

### Patch Changes

- Updated dependencies []:
  - @univ-lehavre/atlas-researcher-profiles@2.0.2

## 1.4.3

### Patch Changes

- Updated dependencies []:
  - @univ-lehavre/atlas-researcher-profiles@2.0.1

## 1.4.2

### Patch Changes

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

- Updated dependencies [[`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3), [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3), [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3)]:
  - @univ-lehavre/atlas-citation-fetch@2.0.0
  - @univ-lehavre/atlas-researcher-profiles@2.0.0
  - @univ-lehavre/atlas-citation-types@4.0.0

## 1.4.1

### Patch Changes

- [#123](https://github.com/univ-lehavre/atlas/pull/123) [`fa67ef8`](https://github.com/univ-lehavre/atlas/commit/fa67ef80e128e127f5bf602686f78f44ba02668f) Thanks [@chasset](https://github.com/chasset)! - Organize CLI source layout around bin, commands, config, prompts, and output adapters.

- [#123](https://github.com/univ-lehavre/atlas/pull/123) [`3ba9bd4`](https://github.com/univ-lehavre/atlas/commit/3ba9bd46719b2090a1afb5cc2805c8d21ae330bb) Thanks [@chasset](https://github.com/chasset)! - Add `docs:pdf` npm script that compiles `ALGORITHMS.md` to PDF via pandoc/xelatex (with Unicode subscript substitution to handle glyphs Menlo lacks). The generated PDF is gitignored.

## 1.4.0

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
  - @univ-lehavre/atlas-researcher-profiles@1.7.0
  - @univ-lehavre/atlas-openalex-types@3.1.6
  - @univ-lehavre/atlas-fetch-openalex@1.0.3

## 1.3.11

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea) Thanks [@chasset](https://github.com/chasset)! - Add `architectureCategory` option to ESLint presets in `shared-config` to enforce per-category import restrictions at lint time. All workspace packages receive their category assignment, enabling detection of CLI I/O in `packages/` and `*-cli` imports in `apps/` and `services/`. Normalize dependency specifiers and add `audit:dep-versions` script.

- Updated dependencies [[`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea), [`61bebae`](https://github.com/univ-lehavre/atlas/commit/61bebaeb579e42539937befb3fc344f631d81e98), [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25)]:
  - @univ-lehavre/atlas-fetch-openalex@1.0.2
  - @univ-lehavre/atlas-researcher-profiles@1.6.7
  - @univ-lehavre/atlas-openalex-types@3.1.5

## 1.3.10

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-fetch-openalex@1.0.1
  - @univ-lehavre/atlas-openalex-types@3.1.5
  - @univ-lehavre/atlas-researcher-profiles@1.6.6

## 1.3.9

### Patch Changes

- Updated dependencies [[`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4)]:
  - @univ-lehavre/atlas-fetch-openalex@1.0.0
  - @univ-lehavre/atlas-openalex-types@3.1.4
  - @univ-lehavre/atlas-researcher-profiles@1.6.5

## 1.3.8

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

- Updated dependencies [[`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec)]:
  - @univ-lehavre/atlas-fetch-openalex@0.4.4
  - @univ-lehavre/atlas-openalex-types@3.1.4
  - @univ-lehavre/atlas-researcher-profiles@1.6.4

## 1.3.7

### Patch Changes

- Updated dependencies [[`3bec138`](https://github.com/univ-lehavre/atlas/commit/3bec138f504b95fbc616746e90b2deeac1e815a7)]:
  - @univ-lehavre/atlas-researcher-profiles@1.6.3

## 1.3.6

### Patch Changes

- Updated dependencies [[`1c7401f`](https://github.com/univ-lehavre/atlas/commit/1c7401fd3b0b2056706365db120d1b049df9198f)]:
  - @univ-lehavre/atlas-researcher-profiles@1.6.2

## 1.3.5

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-fetch-openalex@0.4.3
  - @univ-lehavre/atlas-openalex-types@3.1.3
  - @univ-lehavre/atlas-researcher-profiles@1.6.1

## 1.3.4

### Patch Changes

- Updated dependencies [[`9ad08ac`](https://github.com/univ-lehavre/atlas/commit/9ad08aca02fdd62ed0636f7b6e7434ee7ef659dc)]:
  - @univ-lehavre/atlas-researcher-profiles@1.6.0

## 1.3.3

### Patch Changes

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

- Updated dependencies [[`f6c40d0`](https://github.com/univ-lehavre/atlas/commit/f6c40d040866b8c173a1055618af5b0efa744717)]:
  - @univ-lehavre/atlas-researcher-profiles@1.5.0

## 1.3.2

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

- Updated dependencies [[`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da)]:
  - @univ-lehavre/atlas-fetch-openalex@0.4.2
  - @univ-lehavre/atlas-openalex-types@3.1.2
  - @univ-lehavre/atlas-researcher-profiles@1.4.1

## 1.3.1

### Patch Changes

- [#85](https://github.com/univ-lehavre/atlas/pull/85) [`a2162e7`](https://github.com/univ-lehavre/atlas/commit/a2162e7d68d378bde44f162e2da393327ea18016) Thanks [@chasset](https://github.com/chasset)! - Extract pure service layer into `packages/researcher-profiles`.

  **New package:**
  - `@univ-lehavre/atlas-researcher-profiles`: pure library containing services (csv, openalex, redcap, file-extractor, pdf-generator, reference-matcher), types, errors, and utils (`daysUntilNextUpdate`).

  **Changes:**
  - `@univ-lehavre/atlas-researcher-profiles-cli`: renamed from `@univ-lehavre/atlas-researcher-profiles`. Now a thin CLI — user interaction only, all business logic moved to the library package.

- Updated dependencies [[`44c2e72`](https://github.com/univ-lehavre/atlas/commit/44c2e72e50be33e43190dab11cb00385f8d74b5f), [`a2162e7`](https://github.com/univ-lehavre/atlas/commit/a2162e7d68d378bde44f162e2da393327ea18016)]:
  - @univ-lehavre/atlas-researcher-profiles@1.4.0

## 1.3.0

### Minor Changes

- [#81](https://github.com/univ-lehavre/atlas/pull/81) [`02be029`](https://github.com/univ-lehavre/atlas/commit/02be0299b5f814bd0001d72bceb64b4c850d446b) Thanks [@chasset](https://github.com/chasset)! - feat(researcher-profiles): add raw_affiliation_strings verification

  After filtering works by raw_author_name, extract unique affiliation strings grouped
  by institution (display_name · country_code) and present them via groupMultiselect.
  Selected affiliations are saved to REDCap (`alternative_author_affiliations`) and used
  as a second filter on works before writing to `oa_references`.

## 1.2.0

### Minor Changes

- [#79](https://github.com/univ-lehavre/atlas/pull/79) [`e2af218`](https://github.com/univ-lehavre/atlas/commit/e2af2185b9fbdb5527e7f903f100e7e113748826) Thanks [@chasset](https://github.com/chasset)! - feat(researcher-profiles): fluidifier l'interface CLI
  - `--batch` / `--yes` : auto-accepte les sélections de fullnames sans prompt interactif
  - Séparateurs visuels entre chercheurs avec compteur [1/N]
  - Temps écoulé affiché par chercheur
  - Spinner pendant l'extraction de texte (30-60s sans feedback auparavant)
  - Threshold affiché au début de match-references et dans chaque résumé
  - Quota OpenAlex affiché après le 1er chercheur (pas uniquement en fin de session)
  - Cancel gracieux : Ctrl+C sur le multiselect fullnames skip le chercheur au lieu de quitter le CLI
  - Notes françaises remplacées par de l'anglais pour cohérence

- [#79](https://github.com/univ-lehavre/atlas/pull/79) [`626254a`](https://github.com/univ-lehavre/atlas/commit/626254ac79c12e2ceb014f2d062599ef0dcea105) Thanks [@chasset](https://github.com/chasset)! - feat(researcher-profiles): pipeline unifié par chercheur
  - Nouveau mode par défaut : traite chaque chercheur de bout en bout (résolution OpenAlex + match publications) avant de passer au suivant, en s'appuyant sur les dates REDCap pour ignorer les étapes déjà à jour
  - `cli/match-row.ts` : extraction de la logique de matching par chercheur (réutilisée par la commande standalone `match-references`)
  - `cli/run.ts` : orchestrateur unifié remplaçant la cascade `from-redcap` → `match-references`
  - Les commandes standalone `from-redcap` et `match-references` sont conservées

  fix(validate-openalex): compatibilité avec `display_name: string | null` dans openalex-types

### Patch Changes

- [#79](https://github.com/univ-lehavre/atlas/pull/79) [`ea53772`](https://github.com/univ-lehavre/atlas/commit/ea53772f4125a7e201d53e6bc8b37bf44cac96f1) Thanks [@chasset](https://github.com/chasset)! - fix(researcher-profiles): audit — type safety, bugs critiques et robustesse
  - `openalex-types`: `doi` et `Authorship.author.display_name` typés `string | null` (reflète la réalité de l'API)
  - `pdf-generator`: null guard sur `display_name` avant `.split()` (NPE potentiel)
  - `process-row`: filtre fullnames — ajout du guard `size === 0 → skipped` dans le chemin fresh-authors (bug : tous les works étaient inclus si aucun nom sélectionné)
  - `process-row`: échec de sauvegarde des fullnames → retourne `"error"` au lieu de continuer silencieusement
  - `file-extractor`: limite OCR à `MAX_OCR_PAGES = 50` pour éviter un traitement illimité sur des PDFs volumineux
  - `match-references`: suppression des casts `as` et des `eslint-disable no-unnecessary-condition` devenus obsolètes

- Updated dependencies [[`ea53772`](https://github.com/univ-lehavre/atlas/commit/ea53772f4125a7e201d53e6bc8b37bf44cac96f1)]:
  - @univ-lehavre/atlas-openalex-types@3.1.1
  - @univ-lehavre/atlas-fetch-openalex@0.4.1

## 1.1.0

### Minor Changes

- [#77](https://github.com/univ-lehavre/atlas/pull/77) [`4d2f809`](https://github.com/univ-lehavre/atlas/commit/4d2f8092e18b5e9a3285f56845c09aec2e3d296c) Thanks [@chasset](https://github.com/chasset)! - add pdf generation, ocr fallback, and interactive cli for researcher profiles
  - `match-references` generates an APA-like PDF (`final_references_pdf`) and uploads it to REDCap
  - `match-references` saves extracted publication text as a PDF (`raw_references`) with an import timestamp
  - OCR fallback via tesseract.js + @napi-rs/canvas for scanned or garbled PDFs (e.g. HAL private font encoding)
  - `final_references` filtered to DOI-only works, deduplicated by DOI
  - `--force` flag on `from-redcap` to re-process researchers already marked as up-to-date
  - interactive CLI: command and options (threshold, force) are prompted when not passed on the command line
  - unknown CLI arguments are validated with a clear error message
  - researchers are deselected by default in the `match-references` multiselect
