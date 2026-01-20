---
'@univ-lehavre/atlas-redcap-api': minor
'@univ-lehavre/atlas-redcap-service': patch
---

Add branded types with validation for type-safe REDCap API

- `RedcapUrl`: validates URL format without credentials/query/fragments
- `RedcapToken`: validates 32-char uppercase hex format
- `RecordId`: validates Appwrite ID format (20+ alphanumeric chars)
- `InstrumentName`: validates REDCap naming convention (lowercase with underscores)

Reorganize package into separate modules (`brands.ts`, `types.ts`, `errors.ts`, `client.ts`) and export directly from source modules.
