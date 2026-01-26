---
"@univ-lehavre/atlas-crf": minor
"@univ-lehavre/atlas-redcap-core": minor
"@univ-lehavre/atlas-redcap-openapi": minor
---

Integrate redcap-core across CRF and OpenAPI packages

### @univ-lehavre/atlas-crf
- Re-exports branded types, errors, and version utilities from `@univ-lehavre/atlas-redcap-core`
- Removed duplicate implementations in favor of core module
- Breaking: `BooleanFlag` is now a type-only export, use `toBooleanFlag`/`fromBooleanFlag` utilities

### @univ-lehavre/atlas-redcap-core
- Added comprehensive test suite (18 test files, 520 tests)
- Test coverage for: brands, errors, version, params, validation, adapters, utils, content-types, types
- Improved module documentation with usage examples

### @univ-lehavre/atlas-redcap-openapi
- Now depends on `@univ-lehavre/atlas-redcap-core` for shared types
- `ApiAction` type imported from redcap-core instead of being redefined
- Re-exports content type constants and utilities (CONTENT_KEY_MAPPING, TAG_GROUPS, PERMISSION_MAPPING, etc.)
- Consolidated types: extractor/types.ts now re-exports from core/types.ts
- Removed duplicate ComparisonResult/ComparisonSummary definitions
