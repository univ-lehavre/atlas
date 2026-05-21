# @univ-lehavre/atlas-redcap-sandbox

## 2.1.0

### Minor Changes

- [#179](https://github.com/univ-lehavre/atlas/pull/179) [`97c6af9`](https://github.com/univ-lehavre/atlas/commit/97c6af9a3a5a9ae069a0f1dbe3199f782d59bceb) Thanks [@chasset](https://github.com/chasset)! - Level-2 of the amarre test pyramid : REDCap contract tests scoped to the amarre data dictionary.

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
  - `apps/amarre/vitest.config.ts` : `coverage.include` overridden to include `.svelte` files, so the level-1 UI tests added in [#178](https://github.com/univ-lehavre/atlas/issues/178) are actually measured. The branches threshold is lowered from 52 → 40 to absorb conditional branches in components not yet covered (Collaborate, Footer, MainTitle, …); it will be raised again as level-1 coverage expands.

## 2.0.1

### Patch Changes

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

## 2.0.0

### Major Changes

- [#125](https://github.com/univ-lehavre/atlas/pull/125) [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3) Thanks [@chasset](https://github.com/chasset)! - Fin de la migration anti-marque REDCap : renommage des 4 packages restants utilisant `redcap-*` dans leur nom.

  **Packages renommés (npm + dossiers + workspace)**

  | Avant (npm)                            | Après (npm)                         |
  | -------------------------------------- | ----------------------------------- |
  | `@univ-lehavre/atlas-redcap-dashboard` | `@univ-lehavre/atlas-crf-dashboard` |
  | `@univ-lehavre/atlas-redcap-openapi`   | `@univ-lehavre/atlas-crf-openapi`   |
  | `@univ-lehavre/atlas-redcap-stats-cli` | `@univ-lehavre/atlas-crf-stats-cli` |
  | `@univ-lehavre/atlas-redcap-sandbox`   | `@univ-lehavre/atlas-crf-sandbox`   |

  **Bins renommés**
  - `redcap` → `crf-openapi` (dans `@univ-lehavre/atlas-crf-openapi`)
  - `atlas-redcap-stats` → `atlas-crf-stats` (dans `@univ-lehavre/atlas-crf-stats-cli`)

  **Fichiers internes renommés**

  | Avant                                                    | Après                                               |
  | -------------------------------------------------------- | --------------------------------------------------- |
  | `cli/crf-openapi/src/bin/redcap.ts`                      | `cli/crf-openapi/src/bin/crf-openapi.ts`            |
  | `cli/crf-stats/src/bin/atlas-redcap-stats.ts`            | `cli/crf-stats/src/bin/atlas-crf-stats.ts`          |
  | `cli/crf-openapi/specs/versions/redcap-{14,15,16}*.yaml` | `cli/crf-openapi/specs/versions/v{14,15,16}*.yaml`  |
  | `sandbox/crf-sandbox/scripts/install-redcap.sh`          | `sandbox/crf-sandbox/scripts/install-crf.sh`        |
  | `sandbox/crf-sandbox/scripts/prepare-redcap-source.sh`   | `sandbox/crf-sandbox/scripts/prepare-crf-source.sh` |

  **Cache file renommé**
  - `.redcap-stats.json` (fichier de cache local créé par `@univ-lehavre/atlas-crf-logs`) → `.crf-stats.json` — patch sur `crf-logs` pour le nouveau chemin par défaut.

  **Conservé (texte descriptif / dépendances tierces / data REDCap)**
  - Fichiers vendored dans `cli/crf-openapi/upstream/` (sources REDCap PHP) — non trackés, gitignored
  - Fichiers Docker `database.php`, `init.sql`, `php.ini` dans `sandbox/crf-sandbox/docker/` — infrastructure de test pour instance REDCap réelle
  - Tokens REDCap de test dans `sandbox/crf-sandbox/docker/config/.env.test` (auto-générés par `docker:install`, sandbox jetable)
  - Variables d'environnement (`REDCAP_API_URL`, `REDCAP_API_TOKEN`)
  - Champs natifs REDCap (`redcap_event_name`, `redcap_v`, etc.)
  - URLs (`projectredcap.org`)
  - README, JSDoc, libellés utilisateur

  **Migration côté consommateur**

  Aucun consommateur externe dans le monorepo n'utilise ces packages (apps et CLIs autonomes). Pour les utilisateurs externes :

  ```diff
  - pnpm add @univ-lehavre/atlas-redcap-openapi
  + pnpm add @univ-lehavre/atlas-crf-openapi
  ```

  ```diff
  - npx atlas-redcap-stats
  + npx atlas-crf-stats
  ```

## 1.0.5

### Patch Changes

- [#121](https://github.com/univ-lehavre/atlas/pull/121) [`c763add`](https://github.com/univ-lehavre/atlas/commit/c763addd36a484a0686c53e087138d31414cd214) Thanks [@chasset](https://github.com/chasset)! - Add REDCap 16.1.9 OpenAPI coverage and make the extractor read upstream REDCap ZIP archives.

  Strengthen the REDCap sandbox contract fixtures and assertions so optional project capabilities, reports, surveys, uploads, XML exports, logs, mappings, and metadata imports are exercised with stricter checks.

## 1.0.4

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

## 1.0.3

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

## 1.0.2

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

## 1.0.1

### Patch Changes

- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa) Thanks [@chasset](https://github.com/chasset)! - Remove `private` field from package.json to allow future publishing
