---
"@univ-lehavre/atlas-amarre-sandbox": minor
"@univ-lehavre/atlas-amarre": patch
---

Level-5 of the amarre test pyramid : Playwright `@playwright/test` smoke E2E driving the full stack (Appwrite + Mailpit + REDCap + amarre dev) end-to-end in a real browser.

- New `sandbox/amarre-sandbox/tests/e2e/smoke.spec.ts` (1 test) : signup via the modal → poll Mailpit → visit magic-link → assert authenticated → create a request via the `/api/v1/surveys/new` endpoint → reload and assert the Compléter section appears → logout → assert anonymous state.
- New `sandbox/amarre-sandbox/playwright.config.ts` : Chromium project, `webServer` auto-spawns amarre dev with `reuseExistingServer: true`, traces / screenshots / videos retained on failure.
- New helpers in `sandbox/amarre-sandbox/tests/e2e/fixtures/` :
  - `preflight.ts` — Mailpit + Appwrite reachability probes (read `apps/amarre/.env.local` for project + key).
  - `mailpit.ts` — purge, polling, magic-link extraction.
  - `appwrite.ts` — admin-API user cleanup.
- New scripts in `sandbox/amarre-sandbox/package.json` : `test:smoke`, `test:smoke:headed`.
- `apps/amarre/src/routes/+layout.svelte` : Bootstrap JS dynamic-imported in `onMount` so SSR doesn't choke on the UMD bundle's `window` references. CSS still loads at module init via `@univ-lehavre/atlas-ui/client`.

The suite self-skips via `test.skip(!stackReady, …)` when Mailpit or Appwrite aren't reachable, so `pnpm test:smoke` is safe to run without docker — it just reports "skipped". To exercise the full flow :

```bash
pnpm -F @univ-lehavre/atlas-amarre-sandbox start         # docker up + bootstrap
pnpm -F @univ-lehavre/atlas-amarre-sandbox test:smoke    # runs the smoke
```

The legacy `scripts/test-e2e-ui.ts` (a raw tsx Playwright script with the same scenario) is left in place for now — phase G of the pyramid plan will remove it once the @playwright/test suite has stabilised in CI.
