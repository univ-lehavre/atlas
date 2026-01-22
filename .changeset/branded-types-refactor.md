---
'@univ-lehavre/atlas-net': minor
'@univ-lehavre/atlas-redcap-api': minor
---

Add branded types and extract SafeApiUrl to atlas-net

### @univ-lehavre/atlas-net

- Add `SafeApiUrl` branded type for generic URL validation (HTTP/HTTPS, no credentials, no query string)

### @univ-lehavre/atlas-redcap-api

- `RedcapUrl` is now an alias for `SafeApiUrl` from `@univ-lehavre/atlas-net`
- Add new branded types: `UserId`, `Email`, `PositiveInt`, `NonEmptyString`, `IsoTimestamp`, `BooleanFlag`
- Apply branded types to `RedcapProjectInfo`, `RedcapInstrument`, and `RedcapField` interfaces
- Merge `brands.ts` into `types.ts` for consolidated type definitions
