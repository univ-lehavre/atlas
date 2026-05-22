---
"@univ-lehavre/atlas-dashboard": patch
"@univ-lehavre/atlas-crf-dashboard": patch
"@univ-lehavre/atlas-crf-sandbox": patch
---

Mark `atlas-dashboard`, `atlas-crf-dashboard`, and `atlas-crf-sandbox` as `"private": true` to prevent accidental npm publication. The two dashboards are SvelteKit apps deployed via Appwrite Sites ; the sandbox is a Docker-only local environment, not a distributable npm package. No runtime impact — these packages were never on the publish list, this just makes the intent explicit.

Also cleans up `TODO.md` :

- Mark "Examine the 7 Dependabot alerts" complete : all 7 were auto-fixed on 2026-05-21 by the Dependabot bumps (cookie, esbuild, js-yaml, ajv, vite, ws, protobufjs). Verified on 2026-05-22 : 0 open Dependabot alerts.
- Mark Phase 6.5 (rate limiting) complete in the "DevSecOps" summary list : the work is live in `packages/auth/src/rate-limit.ts` + consumers in amarre/ecrin/find-an-expert. The detailed section was already marked done, only the summary line was stale.
- Mark "Verify CodeQL alerts surface in the Security tab" complete : confirmed via the successive triages (#194 + #198).
