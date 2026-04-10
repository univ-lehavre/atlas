---
'@univ-lehavre/atlas-dashboard': patch
'@univ-lehavre/atlas-stats': patch
'@univ-lehavre/atlas-stats-cli': patch
---

Harden Atlas stats collection and consumption across dashboard, shared library, and CLI.

- make cache parsing resilient and resolve cache file from workspace root
- fix UTC period boundary computation to avoid timezone drift
- harden dashboard refresh flow (dedupe, cooldown, safer force behavior)
- align dashboard routes with non-forced refresh endpoint
- clean CLI typing/lint issues in JSON mode
