---
"@univ-lehavre/atlas-crf": minor
"@univ-lehavre/atlas-redcap": minor
---

Consolidate REDCap packages into unified structure

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
