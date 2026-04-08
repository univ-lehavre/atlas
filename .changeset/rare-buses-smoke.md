---
"@univ-lehavre/atlas-stats": patch
"@univ-lehavre/atlas-stats-cli": patch
---

Refactor Atlas stats CLI architecture and harden data collection/reporting.

- move non-UI logic (token/workspace resolution, collection, fallback, report building) to `@univ-lehavre/atlas-stats`
- keep CLI focused on user interactions and rendering
- improve npm downloads resilience under rate limiting (429) with smaller batches and best-effort fallbacks
- enrich report output (presence on npm/GitHub, release counts, monorepo split, totals)
- add optional npm publish history support in shared types
