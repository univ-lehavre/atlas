# @univ-lehavre/atlas-redcap-core

## 1.1.0
### Minor Changes



- [#46](https://github.com/univ-lehavre/atlas/pull/46) [`0b83927`](https://github.com/univ-lehavre/atlas/commit/0b839274782f50632aea3dcfc38e4ef6816f21dc) Thanks [@chasset](https://github.com/chasset)! - Integrate redcap-core across CRF and OpenAPI packages
  
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

### Patch Changes



- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`9ad9099`](https://github.com/univ-lehavre/atlas/commit/9ad9099d3861a6595d2acd6ecb10cf29d46a6d63) Thanks [@chasset](https://github.com/chasset)! - Add test:coverage script to packages
