# @univ-lehavre/atlas-crf

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
