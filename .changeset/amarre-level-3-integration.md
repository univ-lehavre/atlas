---
"@univ-lehavre/atlas-amarre": patch
---

Level-3 of the amarre test pyramid : integration tests for the REDCap services in `src/lib/server/services/surveys.ts`, exercised against a real REDCap docker.

- New `tests/integration/crf/surveys.test.ts` covering `newRequest`, `fetchUserId` (hit + miss), `listRequests` (hit + miss) and the `filterLogic` escaping path.
- New `tests/integration/helpers/redcap.ts` : reachability probe (`isRedcapReachable`), Node `Fetch` context, prefix-scoped cleanup.
- `vitest.config.ts` gains a third project `integration` (node env, 30s timeout). The suite self-skips via `describe.skipIf(!await isRedcapReachable())`, so the default `pnpm test` remains docker-free.
- New `pnpm test:integration` script.

To exercise the suite, start the sandbox stack first :

```bash
pnpm -F @univ-lehavre/atlas-amarre-sandbox start
pnpm -F @univ-lehavre/atlas-amarre test:integration
```
