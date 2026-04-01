---
"@univ-lehavre/atlas-researcher-profiles": minor
"@univ-lehavre/atlas-researcher-profiles-cli": patch
---

Consolidate REDCap storage into a single `oa_data` JSON file and a single `oa_pdf` file.

**Breaking changes in `atlas-researcher-profiles`:**
- `ResearcherRow`: replaced 4 separate date fields with `oa_imported_at` and new `oa_locked_at`; renamed `references_openalex_complete` → `openalex_complete`
- Removed: `fetchAlternativeAuthorFullnames`, `fetchAlternativeAuthorAffiliations`, `fetchOaReferences`, `writeAlternativeAuthorFullnames`, `writeAlternativeAuthorAffiliations`, `writeOaReferences`, `writeRawReferences`, `writeFinalReferences` (old signature), `generateReferencesPdf`, `generateRawReferencesPdf`
- Added: `ResearcherData`, `emptyResearcherData`, `fetchResearcherData`, `writeResearcherData`, `writeFinalReferences` (new signature with optional `PdfDebugInfo`), `generateCombinedPdf`, `PdfDebugInfo`

**`atlas-researcher-profiles-cli`:**
- All downloaded works are now stored in `oa_references`; name/affiliation filters applied in `match-references` step only
- `oa_pdf` now includes a debug appendix: resolved OpenAlex author profiles, raw author name variants (highlighted if selected), and the extracted text submitted to fuzzy matching
- Lock guard: if `oa_locked_at` is set, processing aborts immediately with an error
- DOCX extraction fix: inject `@xmldom/xmldom` DOMParser before loading mammoth
