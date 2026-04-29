---
"@univ-lehavre/atlas-biblio-cli": patch
"@univ-lehavre/atlas-openalex-cli": patch
"@univ-lehavre/atlas-fetch-one-api-page": patch
"@univ-lehavre/atlas-fetch-openalex": patch
"@univ-lehavre/atlas-openalex": patch
"@univ-lehavre/atlas-researcher-profiles": patch
"@univ-lehavre/atlas-validate-openalex": patch
---

Normalize dependency specifiers: pin `@clack/prompts` to `^1.2.0` (was exact alpha versions), add `^` to `@effect/vitest` and `@duckdb/node-api` exact pins. Add `audit:dep-versions` script to detect multi-version conflicts and unstable pinned dependencies across the workspace.
