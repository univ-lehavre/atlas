# @univ-lehavre/atlas-redcap-service

## 0.2.2

### Patch Changes

- [#9](https://github.com/univ-lehavre/atlas/pull/9) [`5af57fd`](https://github.com/univ-lehavre/atlas/commit/5af57fd6e52318fcfbb0df2f90d59e15696265ac) Thanks [@chasset](https://github.com/chasset)! - Améliore la gestion des erreurs dans les routes:
  - Utilise runEffect de manière cohérente dans la route users
  - Encapsule le parsing des branded types dans Effect.try pour éviter les exceptions non capturées

## 0.2.1

### Patch Changes

- [#7](https://github.com/univ-lehavre/atlas/pull/7) [`4ffb922`](https://github.com/univ-lehavre/atlas/commit/4ffb922c9325b6fc312f1223f462b88d8e0739d1) Thanks [@chasset](https://github.com/chasset)! - Add branded types with validation for type-safe REDCap API
  - `RedcapUrl`: validates URL format without credentials/query/fragments
  - `RedcapToken`: validates 32-char uppercase hex format
  - `RecordId`: validates Appwrite ID format (20+ alphanumeric chars)
  - `InstrumentName`: validates REDCap naming convention (lowercase with underscores)

  Reorganize package into separate modules (`brands.ts`, `types.ts`, `errors.ts`, `client.ts`) and export directly from source modules.

- Updated dependencies [[`4ffb922`](https://github.com/univ-lehavre/atlas/commit/4ffb922c9325b6fc312f1223f462b88d8e0739d1)]:
  - @univ-lehavre/atlas-redcap-api@0.3.0

## 0.2.0

### Minor Changes

- [#1](https://github.com/univ-lehavre/atlas/pull/1) [`4d3e4e7`](https://github.com/univ-lehavre/atlas/commit/4d3e4e7d7e6e34e5fcca21a99f2f80495190c98b) Thanks [@chasset](https://github.com/chasset)! - Initial release of Atlas REDCap packages
  - @univ-lehavre/atlas-redcap-api: Type-safe REDCap client with Effect.ts
  - @univ-lehavre/atlas-redcap-service: Hono-based HTTP microservice

### Patch Changes

- Updated dependencies [[`4d3e4e7`](https://github.com/univ-lehavre/atlas/commit/4d3e4e7d7e6e34e5fcca21a99f2f80495190c98b)]:
  - @univ-lehavre/atlas-redcap-api@0.2.0
