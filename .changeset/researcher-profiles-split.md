---
"@univ-lehavre/atlas-researcher-profiles": minor
"@univ-lehavre/atlas-researcher-profiles-cli": patch
---

Extract pure service layer into `packages/researcher-profiles`.

**New package:**

- `@univ-lehavre/atlas-researcher-profiles`: pure library containing services (csv, openalex, redcap, file-extractor, pdf-generator, reference-matcher), types, errors, and utils (`daysUntilNextUpdate`).

**Changes:**

- `@univ-lehavre/atlas-researcher-profiles-cli`: renamed from `@univ-lehavre/atlas-researcher-profiles`. Now a thin CLI — user interaction only, all business logic moved to the library package.
