---
'@univ-lehavre/atlas-net': minor
---

Refactor types architecture and improve type safety

- Merge `brands.ts` into `types.ts` for simpler module structure
- Add branded types to function signatures (`Hostname`, `Host`, `Port`, `TimeoutMs`)
- Add `Host` union type (`Hostname | IpAddress`) for flexible host parameters
- Use `TimeoutMs` branded type in options interfaces
- Remove redundant tests (index.spec.ts, constants.spec.ts)
- Remove vitest 4.x incompatible tests (tcpPing, checkInternet)
