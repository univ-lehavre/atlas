# @univ-lehavre/atlas-amarre-sandbox

## 0.3.0

### Minor Changes

- [#193](https://github.com/univ-lehavre/atlas/pull/193) [`e1beb61`](https://github.com/univ-lehavre/atlas/commit/e1beb61bb7704749e2da2d3e63a5f7eb28cd0c9c) Thanks [@chasset](https://github.com/chasset)! - Level-5 of the amarre test pyramid : Playwright `@playwright/test` smoke E2E driving the full stack (Appwrite + Mailpit + REDCap + amarre dev) end-to-end in a real browser.
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

- [#195](https://github.com/univ-lehavre/atlas/pull/195) [`d253870`](https://github.com/univ-lehavre/atlas/commit/d2538701dc2b0dcba2ba4bdaaa29db91e1b4cffd) Thanks [@chasset](https://github.com/chasset)! - Closes phase G of the amarre test pyramid (post-level-5 housekeeping) and ships a per-user RUNBOOK so any new contributor can run the 5 levels end-to-end from a fresh clone.

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

### Patch Changes

- [#197](https://github.com/univ-lehavre/atlas/pull/197) [`86499cd`](https://github.com/univ-lehavre/atlas/commit/86499cdac6280ded47cd506a67f794d869ac0883) Thanks [@chasset](https://github.com/chasset)! - Auto-fallback to fake seed when the prod REDCap is unreachable, instead of dying half-way through `pnpm bootstrap`.

  `bootstrap.sh` under `set -e` previously exited 1 when `pull:prod` failed (off-VPN → 302 → 403 on the ULHN reverse proxy, rotated token, server down), leaving step [4/4] `apps/amarre/.env.local` unwritten and the sandbox in an unusable half-state. The script now probes `PROD_CRF_URL` with a 5s timeout `content=version` call before committing to `pull:prod` and falls back to `pnpm seed` (synthetic data) when the probe doesn't return HTTP 200. `SEED_MODE=prod` stays explicit when forced, but the auto-detection becomes resilient.

  Out-of-band : recorded the SDK 25 + `appwrite/appwrite:1.9.0` alignment decision in `TODO.md` (downgrade ruled out, would break `apps/ecrin` which consumes `TablesDB` introduced in 1.9.x).

## 0.2.0

### Minor Changes

- [#175](https://github.com/univ-lehavre/atlas/pull/175) [`bd208c7`](https://github.com/univ-lehavre/atlas/commit/bd208c7f995e4e607da4386ff1bce30dcc0e6b06) Thanks [@chasset](https://github.com/chasset)! - Zero-touch amarre-sandbox: full Appwrite 1.9 + REDCap stack with magic-link smoke test.

  `@univ-lehavre/atlas-amarre-sandbox` — minor
  - **Complete Appwrite 1.9 stack** in `docker-compose.yaml`: switch from MariaDB to MongoDB (the 1.9 default), add the separate console SPA container (`appwrite/console:8`, exposed on `:8091`), and a dedicated `worker-mails` worker so magic-link emails actually leave Redis. SMTP wires straight to the Mailpit instance from `crf-sandbox` via a shared `redcap-net` network.
  - **Headless Appwrite bootstrap** (`scripts/bootstrap-baas.ts`): provisions root account, organisation, `amarre` project (region `default`) and a server API key with the minimum scopes (`users.read`, `users.write`, `sessions.write`). All idempotent. Replaces the previous semi-manual `bootstrap-baas.sh`.
  - **REDCap bootstrap** (`scripts/bootstrap-crf.ts`): leaves the crf-sandbox default project (id=1) intact for its contract tests and provisions a brand-new `amarre` REDCap project alongside (SQL INSERT, generated API token, dictionary import). Replaces the previous shell version.
  - **Synthetic seed** (`scripts/seed-fake-data.ts`): 120 records by default, four scenarios (incomplete / awaiting reviews / validated / refused), branching-logic-aware so only visible fields are filled. Uses `@faker-js/faker` with `fr` locale.
  - **Opt-in prod pull** (`scripts/pull-from-prod.ts`): pulls real records from a production REDCap into the local sandbox, with interactive confirmation. Reads credentials from a gitignored `.env.prod` overrides file so they survive resets.
  - **E2E magic-link smoke test** (`scripts/test-e2e.ts`): drives the full flow (signup → Mailpit poll → /login → /me → cleanup), spawns its own amarre dev server when needed.
  - **Zero-touch orchestrator** (`scripts/start.sh`, `scripts/bootstrap.sh`): generates `_APP_OPENSSL_KEY_V1`, levés les conteneurs, enchaîne baas/crf/seed/e2e. `SEED_MODE=fake|prod|none` and `SKIP_E2E=1` knobs.
  - Scripts `up`/`down`/`reset`/`logs` renamed to `docker:*` to avoid shadowing the native `pnpm up` command. New `start`/`stop` aliases.
  - Add `tsx`, `typescript`, `@types/node`, `@faker-js/faker` as devDeps.

  `@univ-lehavre/atlas-crf-sandbox` — patch
  - `scripts/install-crf.sh` now auto-detects the running container names by suffix instead of hardcoding `docker-mariadb-1` / `docker-redcap-1`. This makes the install work when the compose project name isn't `docker` — typically when `crf-sandbox` is included from `amarre-sandbox`.
