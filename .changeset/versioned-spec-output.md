---
'@univ-lehavre/atlas-redcap': patch
---

fix(redcap): output spec to versioned file path

- `extract-api.ts` now writes to `specs/versions/redcap-${VERSION}.yaml`
- `compare-spec.ts` now compares two REDCap versions instead of extracted vs CRF
- Supports `REDCAP_VERSION_OLD` and `REDCAP_VERSION_NEW` env vars
