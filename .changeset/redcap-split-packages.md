---
"@univ-lehavre/atlas-redcap-openapi": minor
---

Split redcap package into redcap-openapi and redcap-sandbox

- Renamed `@univ-lehavre/atlas-redcap` to `@univ-lehavre/atlas-redcap-openapi`
- Moved OpenAPI extraction code to dedicated package
- Created `@univ-lehavre/atlas-redcap-sandbox` (private) for testing infrastructure
- Docker environment and contract tests now in separate sandbox package
- REDCap upstream source moved to `upstream/` at package root
- Extracted pure functional core module (`src/core/`) with:
  - Pure parsers for PHP source files (index.php, help.php, action files, schemas)
  - OpenAPI spec generator (pure function taking parsed data)
  - Spec comparator for detecting breaking changes
  - Exported via `@univ-lehavre/atlas-redcap-openapi/core`
