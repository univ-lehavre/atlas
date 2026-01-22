---
'@univ-lehavre/atlas-net': minor
---

Add branded types, constants, and comprehensive test suite

- Add branded types (IpAddress, Port, TimeoutMs) with runtime validation using Effect's Brand module
- Extract constants for default timeouts and network configuration
- Extract helper functions for TLS error formatting
- Separate types into dedicated files for better organization
- Add comprehensive test suite with vitest (31 tests for diagnostics)
- Update documentation (README and JSDoc)
