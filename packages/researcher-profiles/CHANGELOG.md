# @univ-lehavre/atlas-researcher-profiles

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
