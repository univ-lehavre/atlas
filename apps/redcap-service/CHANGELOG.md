# @univ-lehavre/atlas-redcap-service

## 0.4.1

### Patch Changes

- Updated dependencies [[`b25723f`](https://github.com/univ-lehavre/atlas/commit/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e), [`55f9855`](https://github.com/univ-lehavre/atlas/commit/55f9855a424232d94722e95c6c935e435b5354ad)]:
  - @univ-lehavre/atlas-net@0.3.0

## 0.4.0

### Minor Changes

- [#17](https://github.com/univ-lehavre/atlas/pull/17) [`9a86934`](https://github.com/univ-lehavre/atlas/commit/9a869343f43c6b65bd66cb1bfae3e3ffa42b1047) Thanks [@chasset](https://github.com/chasset)! - Add @univ-lehavre/atlas-net package for network diagnostics
  - Create dedicated network diagnostics library with DNS, TCP, TLS, and internet checks
  - Add @univ-lehavre/atlas-net-cli package with interactive and CI modes
  - Add /health/diagnose SSE endpoint to redcap-service for progressive diagnostics
  - Restructure CLI packages into cli/ directory

### Patch Changes

- [#17](https://github.com/univ-lehavre/atlas/pull/17) [`2952a6d`](https://github.com/univ-lehavre/atlas/commit/2952a6d9a30333d079aecb8bf609c05597852a2c) Thanks [@chasset](https://github.com/chasset)! - Add `@univ-lehavre/atlas-redcap-cli` package for REDCap connectivity testing
  - New CLI tool built with `@effect/cli` for testing REDCap service connectivity
  - `redcap test` command with multiple test options: `--all`, `--quick`, `--json`
  - Individual test flags: `--service`, `--health`, `--project`, `--instruments`, `--fields`, `--records`
  - Configurable service URL via `--url` option
  - JSON output mode for CI integration
  - Built-in help and shell completions
  - Removed embedded `test-redcap.ts` script from `redcap-service` in favor of the new CLI

- Updated dependencies [[`9a86934`](https://github.com/univ-lehavre/atlas/commit/9a869343f43c6b65bd66cb1bfae3e3ffa42b1047)]:
  - @univ-lehavre/atlas-net@0.2.0

## 0.3.0

### Minor Changes

- [#15](https://github.com/univ-lehavre/atlas/pull/15) [`dac9758`](https://github.com/univ-lehavre/atlas/commit/dac975844f2036ed60c6531e20238a61f2e0b8e3) Thanks [@chasset](https://github.com/chasset)! - ### @univ-lehavre/atlas-redcap-api
  - Add `getInstruments()` to retrieve available instruments/forms
  - Add `getFields()` to retrieve field metadata
  - Add `getExportFieldNames()` to retrieve export field name mappings

  ### @univ-lehavre/atlas-redcap-service
  - Add `/health/detailed` endpoint with connectivity checks, latency measurement, and project introspection
  - Change import records endpoint from POST to PUT (proper upsert semantics)
  - Move Docker and test scripts locally for better organization

### Patch Changes

- Updated dependencies [[`dac9758`](https://github.com/univ-lehavre/atlas/commit/dac975844f2036ed60c6531e20238a61f2e0b8e3)]:
  - @univ-lehavre/atlas-redcap-api@0.4.0

## 0.2.4

### Patch Changes

- [#13](https://github.com/univ-lehavre/atlas/pull/13) [`3ecc5ec`](https://github.com/univ-lehavre/atlas/commit/3ecc5ec964fc33c391084057c4e6b6fa8d38c898) Thanks [@chasset](https://github.com/chasset)! - Add Docker infrastructure for local testing
  - Add Dockerfile for containerized deployment
  - Add docker-compose.yml with mock REDCap server
  - Add httpyac-based API tests (22 endpoints)
  - Add npm scripts: `docker`, `docker:build`, `docker:test`

## 0.2.3

### Patch Changes

- [#11](https://github.com/univ-lehavre/atlas/pull/11) [`559adeb`](https://github.com/univ-lehavre/atlas/commit/559adeb63a0f97c1835d6c58d422cfb40805c030) Thanks [@chasset](https://github.com/chasset)! - Add package metadata (author, license, repository) and README documentation

- Updated dependencies [[`559adeb`](https://github.com/univ-lehavre/atlas/commit/559adeb63a0f97c1835d6c58d422cfb40805c030)]:
  - @univ-lehavre/atlas-redcap-api@0.3.1

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
