# @univ-lehavre/atlas-amarre-sandbox

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
