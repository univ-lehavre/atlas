# @univ-lehavre/atlas-net

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
