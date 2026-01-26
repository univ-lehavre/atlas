---
"@univ-lehavre/atlas-crf": minor
"@univ-lehavre/atlas-redcap-core": minor
---

Integrate redcap-core as CRF dependency

- `@univ-lehavre/atlas-crf` now re-exports branded types, errors, and version utilities from `@univ-lehavre/atlas-redcap-core`
- Removed duplicate implementations from `crf/redcap` in favor of core module
- Added comprehensive test suite for `redcap-core` (16 test files covering brands, errors, version, params, validation, adapters, utils)
- Improved module documentation with usage examples
- Breaking: `BooleanFlag` is now a type-only export, use `toBooleanFlag`/`fromBooleanFlag` utilities
