---
"@univ-lehavre/atlas-redcap-openapi": minor
---

Split redcap package into redcap-openapi and redcap-sandbox

- Renamed `@univ-lehavre/atlas-redcap` to `@univ-lehavre/atlas-redcap-openapi`
- Moved OpenAPI extraction code to dedicated package
- Created `@univ-lehavre/atlas-redcap-sandbox` (private) for testing infrastructure
- Docker environment and contract tests now in separate sandbox package
- REDCap upstream source moved to `upstream/` at package root
