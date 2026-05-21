---
"@univ-lehavre/atlas-amarre-sandbox": minor
"@univ-lehavre/atlas-amarre": patch
---

Closes phase G of the amarre test pyramid (post-level-5 housekeeping) and ships a per-user RUNBOOK so any new contributor can run the 5 levels end-to-end from a fresh clone.

**Cleanup**

- Drop the orphan drift-detector utility (`tests/utils/drift-detector.ts` + `tests/integration/drift-detection.test.ts` + `tests/baselines/` + the matching glob in the root `clean` script). Level-2 contract-amarre supersedes it.
- Drop the four legacy `scripts/test-e2e*.ts` (tsx scripts predating the Playwright migration). `start.sh`, sandbox README and the smoke spec now point to `pnpm test:smoke`.
- Move `tests/server/validators/auth.test.ts` to `tests/lib/server/validators/` so the unit test tree mirrors `src/lib/`.

**New RUNBOOK** (`apps/amarre/tests/RUNBOOK.md`)

- Machine prereqs + first-run recipe (clone → install → `playwright install chromium` → `start`).
- Real-data preload via `SEED_MODE=prod` / `.env.prod` with privacy notes.
- Per-level command / prereqs / failure-pattern matrix.
- Honest "integration in pre-commit / pre-push / CI" table that calls out the actual coverage (level 1 only — N3/N4 self-skip when no docker stack, N2/N5 not wired at all).

**DX fixes uncovered while running the new RUNBOOK end-to-end**

- `pnpm start` now auto-detects `SEED_MODE` from `PROD_CRF_URL` + `PROD_CRF_TOKEN` presence — no more silently defaulting to fake data when prod creds are sitting in `.env.prod`. Explicit `SEED_MODE=...` still overrides.
- Four cryptic failures are now structured errors guiding the recovery path :
  - `bootstrap-crf` / `seed-fake-data` when the gitignored `data-dictionaries/127-amarre-v1.json` is missing (`pnpm crf:dictionaries:export --apply` hint).
  - `pull-from-prod` when the prod project uses a primary key that differs from the local data dictionary's first field.
  - `pull-from-prod` reads `record_autonumbering_enabled` from the local project and matches `forceAutoNumber` automatically.
  - The Playwright smoke surfaces the response body when `POST /api/v1/surveys/new` returns non-2xx.
- Fix a race in the Playwright smoke : Bootstrap JS is dynamic-imported in `apps/amarre/src/routes/+layout.svelte`'s `onMount`, the click for the signup modal could fire before `data-bs-toggle` was wired. Test now gates on `window.bootstrap` before the first modal interaction.
- `+layout.svelte` re-exposes the Bootstrap exports on `window.bootstrap` after the dynamic import so the contract matches what the raw UMD bundle did pre-Vite (the ESM wrapper otherwise hides them).
- Document that `pnpm start` does not leave the amarre dev server running (Playwright spawns and kills its own webServer for the smoke) — both the start.sh final message and the RUNBOOK "Services up" table now spell it out.

**Docker pins**

- `axllent/mailpit:latest` was timing out SMTP sessions before Appwrite's `baas-worker-mails` could finish its `MAIL FROM` exchange. Pin to `axllent/mailpit:v1.20`, add `MP_SMTP_AUTH_ALLOW_INSECURE=true` + `MP_SMTP_DISABLE_RDNS=true`.
- Pin `appwrite/appwrite:1.9.0` exact (was floating `:1.9` series tag) so future patch releases don't run schema migrations silently across `docker compose pull`.
