# @univ-lehavre/atlas-net

## 0.7.0
### Minor Changes



- [#38](https://github.com/univ-lehavre/atlas/pull/38) [`445211d`](https://github.com/univ-lehavre/atlas/commit/445211d3bd8c59fdde45a43c3d108740b80c9487) Thanks [@chasset](https://github.com/chasset)! - Harmonize CLI tools with @effect/cli and @clack/prompts
  
  - Migrate all CLI tools (crf-redcap, crf-server, atlas-net) to @effect/cli
  - Add shared CLI utilities for consistent behavior across tools
  - Implement auto-detection of CI environments
  - Add standard options: --ci, --json, --verbose, --quiet, --help, --version
  - Create new crf-server CLI with port, host, and rate-limit options
  - Document exit codes: 0=success, 1=error, 2=config, 3=network, 4=auth
  - Add CLI.md documentation for both packages

### Patch Changes



- [#39](https://github.com/univ-lehavre/atlas/pull/39) [`1b814ac`](https://github.com/univ-lehavre/atlas/commit/1b814ac0b4bb2999d8271d503e78dd13b9973918) Thanks [@chasset](https://github.com/chasset)! - docs: restructure documentation and add GitHub Pages deployment
  
  - Separate researcher (user) and developer documentation
  - Add landing page with clear entry points for both audiences
  - Add GitHub Actions workflow for automatic documentation deployment
  - Configure VitePress for GitHub Pages at /atlas/


- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`9ad9099`](https://github.com/univ-lehavre/atlas/commit/9ad9099d3861a6595d2acd6ecb10cf29d46a6d63) Thanks [@chasset](https://github.com/chasset)! - Add test:coverage script to packages

## 0.6.0
### Minor Changes



- [#30](https://github.com/univ-lehavre/atlas/pull/30) [`b444a82`](https://github.com/univ-lehavre/atlas/commit/b444a82d74ed76b1a372bdafaa69f96156e2ac65) Thanks [@chasset](https://github.com/chasset)! - Merge CLI into net package
  
  - Move CLI from `cli/net/` to `packages/net/src/cli/`
  - Add `bin.atlas-net` entry point
  - Export CLI module via `@univ-lehavre/atlas-net/cli`
  - Remove separate `@univ-lehavre/atlas-net-cli` package
  - Update eslint config with CLI-specific rules

### Patch Changes



- [#29](https://github.com/univ-lehavre/atlas/pull/29) [`c5a5a55`](https://github.com/univ-lehavre/atlas/commit/c5a5a5536bb40425ee0f8dcc2e1ae5ee9ed2fff2) Thanks [@chasset](https://github.com/chasset)! - Migrate ESLint and Prettier to per-package configuration
  
  - Move ESLint config from root to each package/app with full rule set
  - Move Prettier config from root to each package/app
  - Update lefthook to use turbo tasks instead of direct eslint/prettier calls
  - Remove eslint and prettier from root devDependencies
  - Each package now has its own `.prettierrc`, `.prettierignore`, and `eslint.config.js`

## 0.4.0

### Minor Changes

- [#22](https://github.com/univ-lehavre/atlas/pull/22) [`3dbc50b`](https://github.com/univ-lehavre/atlas/commit/3dbc50b4cdfe1b29ca5a2986069a7f6bfcbd00df) Thanks [@chasset](https://github.com/chasset)! - Add branded types and extract SafeApiUrl to atlas-net

  ### @univ-lehavre/atlas-net
  - Add `SafeApiUrl` branded type for generic URL validation (HTTP/HTTPS, no credentials, no query string)

  ### @univ-lehavre/atlas-redcap-api
  - `RedcapUrl` is now an alias for `SafeApiUrl` from `@univ-lehavre/atlas-net`
  - Add new branded types: `UserId`, `Email`, `PositiveInt`, `NonEmptyString`, `IsoTimestamp`, `BooleanFlag`
  - Apply branded types to `RedcapProjectInfo`, `RedcapInstrument`, and `RedcapField` interfaces
  - Merge `brands.ts` into `types.ts` for consolidated type definitions

## 0.3.0

### Minor Changes

- [#20](https://github.com/univ-lehavre/atlas/pull/20) [`b25723f`](https://github.com/univ-lehavre/atlas/commit/b25723f53414f4f00fc2d77f1fcbdf8e4dc1663e) Thanks [@chasset](https://github.com/chasset)! - Add branded types, constants, and comprehensive test suite
  - Add branded types (IpAddress, Port, TimeoutMs) with runtime validation using Effect's Brand module
  - Extract constants for default timeouts and network configuration
  - Extract helper functions for TLS error formatting
  - Separate types into dedicated files for better organization
  - Add comprehensive test suite with vitest (31 tests for diagnostics)
  - Update documentation (README and JSDoc)

- [#20](https://github.com/univ-lehavre/atlas/pull/20) [`55f9855`](https://github.com/univ-lehavre/atlas/commit/55f9855a424232d94722e95c6c935e435b5354ad) Thanks [@chasset](https://github.com/chasset)! - Refactor types architecture and improve type safety
  - Merge `brands.ts` into `types.ts` for simpler module structure
  - Add branded types to function signatures (`Hostname`, `Host`, `Port`, `TimeoutMs`)
  - Add `Host` union type (`Hostname | IpAddress`) for flexible host parameters
  - Use `TimeoutMs` branded type in options interfaces
  - Remove redundant tests (index.spec.ts, constants.spec.ts)
  - Remove vitest 4.x incompatible tests (tcpPing, checkInternet)

## 0.2.0

### Minor Changes

- [#17](https://github.com/univ-lehavre/atlas/pull/17) [`9a86934`](https://github.com/univ-lehavre/atlas/commit/9a869343f43c6b65bd66cb1bfae3e3ffa42b1047) Thanks [@chasset](https://github.com/chasset)! - Add @univ-lehavre/atlas-net package for network diagnostics
  - Create dedicated network diagnostics library with DNS, TCP, TLS, and internet checks
  - Add @univ-lehavre/atlas-net-cli package with interactive and CI modes
  - Add /health/diagnose SSE endpoint to redcap-service for progressive diagnostics
  - Restructure CLI packages into cli/ directory
