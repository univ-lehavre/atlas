---
"@univ-lehavre/atlas-crf-sandbox": minor
"@univ-lehavre/atlas-amarre": patch
---

Level-2 of the amarre test pyramid : REDCap contract tests scoped to the amarre data dictionary.

`@univ-lehavre/atlas-crf-sandbox` — minor

- New `tests/fixtures/redcap-admin.ts` : API-only helpers that mint a REDCap super-API token via the Control Center AJAX endpoint (the sandbox runs with `auth_meth_global=none`, so the super-user is implicit), then use it to create a project via `POST /api/?content=project&action=import` and import the amarre data dictionary via `POST /api/?content=metadata&action=import`. No SQL executed — REDCap is touched exclusively through HTTP.
- `tests/fixtures/setup-test-projects.ts` extended with a `setupAmarreProject()` step (idempotent : a cached token still pointing at a project titled `amarre` is reused as-is).
- New `tests/contract-amarre/` directory with two suites :
  - `metadata.test.ts` : 113 fields imported, instruments present, branching logic preserved, redacted field names correctly rejected on record import.
  - `records.test.ts` : record import + export with `filterLogic`, delete lifecycle, empty filter results.
- New `pnpm test:contract:amarre` script that runs only the amarre subset (the existing `test:contract` runs both).
- `vitest.contract.config.ts` extended to include the new directory.

Housekeeping :

- `docker/config/.env.test` removed from git (it contains REDCap tokens scoped to a local sandbox, regenerated every `pnpm test:setup`); `.env.test.example` documents the shape including the new `REDCAP_TOKEN_PROJECT_AMARRE` slot.
- New `sandbox/crf-sandbox/.gitignore` (no `.gitignore` existed before).

`@univ-lehavre/atlas-amarre` — patch

- `apps/amarre/vitest.config.ts` : `coverage.include` overridden to include `.svelte` files, so the level-1 UI tests added in #178 are actually measured. The branches threshold is lowered from 52 → 40 to absorb conditional branches in components not yet covered (Collaborate, Footer, MainTitle, …); it will be raised again as level-1 coverage expands.
