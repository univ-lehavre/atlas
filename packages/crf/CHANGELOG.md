# @univ-lehavre/atlas-crf

## 1.3.1

### Patch Changes

- [#68](https://github.com/univ-lehavre/atlas/pull/68) [`2ed6a4a`](https://github.com/univ-lehavre/atlas/commit/2ed6a4a03c5ceb65932a4eb2f5e8ae5dce1f3b03) Thanks [@chasset](https://github.com/chasset)! - ### New packages — biblio & openalex migration

  Six packages migrated from the `biblio` and `openalex` standalone repos into the atlas monorepo:
  - **`@univ-lehavre/atlas-openalex-types`** — Branded Effect types for OpenAlex entities (`ORCID`, `OpenAlexID`, API response shapes)
  - **`@univ-lehavre/atlas-fetch-one-api-page`** — Generic paginated fetch utility with typed `FetchError` / `ResponseParseError`
  - **`@univ-lehavre/atlas-fetch-openalex`** — Paginated OpenAlex API client with rate limiting and queue-based streaming
  - **`@univ-lehavre/atlas-validate-openalex`** — CLI tool for validating and updating OpenAlex affiliation data
  - **`@univ-lehavre/atlas-biblio-cli`** — Entry-point CLI for bibliography workflows
  - **`@univ-lehavre/atlas-openalex`** — DuckDB storage, ML embeddings (`@xenova/transformers`), author grouping by affiliation similarity

  All packages normalised to atlas toolchain conventions: `tsc` build, Vitest, `atlas-shared-config` ESLint/tsconfig, ESM-only exports, Effect `^3.20.0`.

  ### `@univ-lehavre/atlas-crf`
  - Fix type error in PDF download route: `parseRecordId` now accepts `string | undefined` to match hono 4.12+ `c.req.param()` return type

- [#64](https://github.com/univ-lehavre/atlas/pull/64) [`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6) Thanks [@chasset](https://github.com/chasset)! - ## Documentation
  - Translate all documentation to English for international accessibility
  - Add Microservices project with K3s installation procedure
  - Infrastructure: Cilium, Longhorn, Authelia, Mattermost, REDCap, ECRIN, Gitea, ArgoCD
  - Configure REDCap access control (public surveys, protected admin)

- Updated dependencies [[`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6)]:
  - @univ-lehavre/atlas-redcap-core@1.1.1
  - @univ-lehavre/atlas-net@0.7.1

## 1.3.0

### Minor Changes

- [#38](https://github.com/univ-lehavre/atlas/pull/38) [`445211d`](https://github.com/univ-lehavre/atlas/commit/445211d3bd8c59fdde45a43c3d108740b80c9487) Thanks [@chasset](https://github.com/chasset)! - Harmonize CLI tools with @effect/cli and @clack/prompts
  - Migrate all CLI tools (crf-redcap, crf-server, atlas-net) to @effect/cli
  - Add shared CLI utilities for consistent behavior across tools
  - Implement auto-detection of CI environments
  - Add standard options: --ci, --json, --verbose, --quiet, --help, --version
  - Create new crf-server CLI with port, host, and rate-limit options
  - Document exit codes: 0=success, 1=error, 2=config, 3=network, 4=auth
  - Add CLI.md documentation for both packages

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

- [#39](https://github.com/univ-lehavre/atlas/pull/39) [`1b814ac`](https://github.com/univ-lehavre/atlas/commit/1b814ac0b4bb2999d8271d503e78dd13b9973918) Thanks [@chasset](https://github.com/chasset)! - docs: restructure documentation and add GitHub Pages deployment
  - Separate researcher (user) and developer documentation
  - Add landing page with clear entry points for both audiences
  - Add GitHub Actions workflow for automatic documentation deployment
  - Configure VitePress for GitHub Pages at /atlas/

- [#47](https://github.com/univ-lehavre/atlas/pull/47) [`57244db`](https://github.com/univ-lehavre/atlas/commit/57244db507023838f05cf13ea93db471d00f4e1b) Thanks [@chasset](https://github.com/chasset)! - Remove unused exports and enable knip exports check
  - Enable knip to detect unused exports (remove --exclude exports flag)
  - Clean up 105 unused exports across packages
  - Configure knip to ignore public API files in crf package

- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`9ad9099`](https://github.com/univ-lehavre/atlas/commit/9ad9099d3861a6595d2acd6ecb10cf29d46a6d63) Thanks [@chasset](https://github.com/chasset)! - Add test:coverage script to packages

- Updated dependencies [[`445211d`](https://github.com/univ-lehavre/atlas/commit/445211d3bd8c59fdde45a43c3d108740b80c9487), [`0b83927`](https://github.com/univ-lehavre/atlas/commit/0b839274782f50632aea3dcfc38e4ef6816f21dc), [`1b814ac`](https://github.com/univ-lehavre/atlas/commit/1b814ac0b4bb2999d8271d503e78dd13b9973918), [`9ad9099`](https://github.com/univ-lehavre/atlas/commit/9ad9099d3861a6595d2acd6ecb10cf29d46a6d63)]:
  - @univ-lehavre/atlas-net@0.7.0
  - @univ-lehavre/atlas-redcap-core@1.1.0

## 1.2.1

### Patch Changes

- [#36](https://github.com/univ-lehavre/atlas/pull/36) [`9ce63eb`](https://github.com/univ-lehavre/atlas/commit/9ce63eb1ec489d1d0079162aa316e4bac68be262) Thanks [@chasset](https://github.com/chasset)! - Add extended test coverage for CRF package
  - Add comprehensive tests for branded types (RedcapToken, RecordId, InstrumentName, Email, etc.)
  - Add tests for error types (RedcapHttpError, RedcapApiError, RedcapNetworkError)
  - Add tests for version parsing, formatting, and comparison utilities
  - Add tests for version adapters (v14, v15, v16) and adapter selection
  - Extend client tests with mock fetch for all API methods
  - Add tests for Effect-to-Hono response handler
  - Add tests for server middleware and validation schemas

## 1.2.0

### Minor Changes

- [#34](https://github.com/univ-lehavre/atlas/pull/34) [`563dd83`](https://github.com/univ-lehavre/atlas/commit/563dd8329af5404c1ced55ee3e6065d6d6285120) Thanks [@chasset](https://github.com/chasset)! - Add version-adaptive REDCap client with adapter pattern

  The REDCap client now automatically detects the server version on first API call and adapts its requests accordingly:
  - Auto-detection via the `/version` endpoint with lazy caching
  - Adapter pattern with version-specific implementations (v14, v15, v16)
  - Version-specific parameter transformations for export/import operations
  - New error types: `VersionParseError` and `UnsupportedVersionError`

  The CRF package maintains a stable v1 API while internally adapting to the connected REDCap server version.

## 1.1.0

### Minor Changes

- [#29](https://github.com/univ-lehavre/atlas/pull/29) [`7782e18`](https://github.com/univ-lehavre/atlas/commit/7782e1823a17f52964f83448c01d2b15e469934f) Thanks [@chasset](https://github.com/chasset)! - Consolidate REDCap packages into unified structure

  ## @univ-lehavre/atlas-crf

  New unified package replacing scattered REDCap components:
  - Effect-based REDCap client with retry and typed errors
  - Hono HTTP server with routes (health, project, records, users)
  - CLI tools: `crf-redcap` and `crf-server`
  - Branded types: `RecordId`, `RedcapToken`, `RedcapUrl`, etc.
  - Multi-version support via `REDCAP_VERSION` env var

  ## @univ-lehavre/atlas-redcap

  New package for REDCap development tooling:
  - Docker environment (PHP 8.2, MariaDB 11.4, phpMyAdmin, Mailpit)
  - PHP source analyzer extracting OpenAPI specs from REDCap code
  - Multi-version support (14.5.10, 15.5.32, 16.0.8)
  - Contract tests (26 tests) validating API responses
  - Automated installation script

  ### Breaking Changes

  Removed packages (consolidated into above):
  - `cli/redcap`
  - `packages/redcap-api`
  - `services/redcap`
  - `tools/mock-redcap`

### Patch Changes

- [#29](https://github.com/univ-lehavre/atlas/pull/29) [`c5a5a55`](https://github.com/univ-lehavre/atlas/commit/c5a5a5536bb40425ee0f8dcc2e1ae5ee9ed2fff2) Thanks [@chasset](https://github.com/chasset)! - Migrate ESLint and Prettier to per-package configuration
  - Move ESLint config from root to each package/app with full rule set
  - Move Prettier config from root to each package/app
  - Update lefthook to use turbo tasks instead of direct eslint/prettier calls
  - Remove eslint and prettier from root devDependencies
  - Each package now has its own `.prettierrc`, `.prettierignore`, and `eslint.config.js`

- Updated dependencies [[`b444a82`](https://github.com/univ-lehavre/atlas/commit/b444a82d74ed76b1a372bdafaa69f96156e2ac65), [`c5a5a55`](https://github.com/univ-lehavre/atlas/commit/c5a5a5536bb40425ee0f8dcc2e1ae5ee9ed2fff2)]:
  - @univ-lehavre/atlas-net@0.6.0
