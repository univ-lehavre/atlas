# @univ-lehavre/atlas-researcher-profiles

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
