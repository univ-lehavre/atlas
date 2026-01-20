---
'@univ-lehavre/atlas-redcap-api': minor
'@univ-lehavre/atlas-redcap-service': minor
---

### @univ-lehavre/atlas-redcap-api

- Add `getInstruments()` to retrieve available instruments/forms
- Add `getFields()` to retrieve field metadata
- Add `getExportFieldNames()` to retrieve export field name mappings

### @univ-lehavre/atlas-redcap-service

- Add `/health/detailed` endpoint with connectivity checks, latency measurement, and project introspection
- Change import records endpoint from POST to PUT (proper upsert semantics)
- Move Docker and test scripts locally for better organization
