---
"@univ-lehavre/atlas-shared-config": patch
"@univ-lehavre/atlas-stats-cli": patch
"@univ-lehavre/atlas-biblio-cli": patch
"@univ-lehavre/atlas-crf-cli": patch
"@univ-lehavre/atlas-net-cli": patch
"@univ-lehavre/atlas-openalex-cli": patch
"@univ-lehavre/atlas-redcap-openapi": patch
"@univ-lehavre/atlas-redcap-stats-cli": patch
"@univ-lehavre/atlas-researcher-profiles-cli": patch
"@univ-lehavre/atlas-appwrite": patch
"@univ-lehavre/atlas-stats": patch
"@univ-lehavre/atlas-auth": patch
"@univ-lehavre/atlas-fetch-one-api-page": patch
"@univ-lehavre/atlas-fetch-openalex": patch
"@univ-lehavre/atlas-logos": patch
"@univ-lehavre/atlas-openalex": patch
"@univ-lehavre/atlas-researcher-profiles": patch
"@univ-lehavre/atlas-validate-openalex": patch
"@univ-lehavre/atlas-crf": patch
---

Add `architectureCategory` option to ESLint presets in `shared-config` to enforce per-category import restrictions at lint time. All workspace packages receive their category assignment, enabling detection of CLI I/O in `packages/` and `*-cli` imports in `apps/` and `services/`. Normalize dependency specifiers and add `audit:dep-versions` script.
