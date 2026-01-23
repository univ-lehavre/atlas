---
"@univ-lehavre/atlas-crf": minor
---

Add version-adaptive REDCap client with adapter pattern

The REDCap client now automatically detects the server version on first API call and adapts its requests accordingly:

- Auto-detection via the `/version` endpoint with lazy caching
- Adapter pattern with version-specific implementations (v14, v15, v16)
- Version-specific parameter transformations for export/import operations
- New error types: `VersionParseError` and `UnsupportedVersionError`

The CRF package maintains a stable v1 API while internally adapting to the connected REDCap server version.
