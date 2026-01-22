# @univ-lehavre/atlas-redcap-api

## 0.5.0

### Minor Changes

- [#22](https://github.com/univ-lehavre/atlas/pull/22) [`3dbc50b`](https://github.com/univ-lehavre/atlas/commit/3dbc50b4cdfe1b29ca5a2986069a7f6bfcbd00df) Thanks [@chasset](https://github.com/chasset)! - Add branded types and extract SafeApiUrl to atlas-net

  ### @univ-lehavre/atlas-net
  - Add `SafeApiUrl` branded type for generic URL validation (HTTP/HTTPS, no credentials, no query string)

  ### @univ-lehavre/atlas-redcap-api
  - `RedcapUrl` is now an alias for `SafeApiUrl` from `@univ-lehavre/atlas-net`
  - Add new branded types: `UserId`, `Email`, `PositiveInt`, `NonEmptyString`, `IsoTimestamp`, `BooleanFlag`
  - Apply branded types to `RedcapProjectInfo`, `RedcapInstrument`, and `RedcapField` interfaces
  - Merge `brands.ts` into `types.ts` for consolidated type definitions

### Patch Changes

- Updated dependencies [[`3dbc50b`](https://github.com/univ-lehavre/atlas/commit/3dbc50b4cdfe1b29ca5a2986069a7f6bfcbd00df)]:
  - @univ-lehavre/atlas-net@0.4.0

## 0.4.0

### Minor Changes

- [#15](https://github.com/univ-lehavre/atlas/pull/15) [`dac9758`](https://github.com/univ-lehavre/atlas/commit/dac975844f2036ed60c6531e20238a61f2e0b8e3) Thanks [@chasset](https://github.com/chasset)! - ### @univ-lehavre/atlas-redcap-api
  - Add `getInstruments()` to retrieve available instruments/forms
  - Add `getFields()` to retrieve field metadata
  - Add `getExportFieldNames()` to retrieve export field name mappings

  ### @univ-lehavre/atlas-redcap-service
  - Add `/health/detailed` endpoint with connectivity checks, latency measurement, and project introspection
  - Change import records endpoint from POST to PUT (proper upsert semantics)
  - Move Docker and test scripts locally for better organization

## 0.3.1

### Patch Changes

- [#11](https://github.com/univ-lehavre/atlas/pull/11) [`559adeb`](https://github.com/univ-lehavre/atlas/commit/559adeb63a0f97c1835d6c58d422cfb40805c030) Thanks [@chasset](https://github.com/chasset)! - Add package metadata (author, license, repository) and README documentation

## 0.3.0

### Minor Changes

- [#7](https://github.com/univ-lehavre/atlas/pull/7) [`4ffb922`](https://github.com/univ-lehavre/atlas/commit/4ffb922c9325b6fc312f1223f462b88d8e0739d1) Thanks [@chasset](https://github.com/chasset)! - Add branded types with validation for type-safe REDCap API
  - `RedcapUrl`: validates URL format without credentials/query/fragments
  - `RedcapToken`: validates 32-char uppercase hex format
  - `RecordId`: validates Appwrite ID format (20+ alphanumeric chars)
  - `InstrumentName`: validates REDCap naming convention (lowercase with underscores)

  Reorganize package into separate modules (`brands.ts`, `types.ts`, `errors.ts`, `client.ts`) and export directly from source modules.

## 0.2.0

### Minor Changes

- [#1](https://github.com/univ-lehavre/atlas/pull/1) [`4d3e4e7`](https://github.com/univ-lehavre/atlas/commit/4d3e4e7d7e6e34e5fcca21a99f2f80495190c98b) Thanks [@chasset](https://github.com/chasset)! - Initial release of Atlas REDCap packages
  - @univ-lehavre/atlas-redcap-api: Type-safe REDCap client with Effect.ts
  - @univ-lehavre/atlas-redcap-service: Hono-based HTTP microservice
