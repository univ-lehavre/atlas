# @univ-lehavre/atlas-redcap-stats-cli

## 2.0.1

### Patch Changes

- [#250](https://github.com/univ-lehavre/atlas/pull/250) [`178dca4`](https://github.com/univ-lehavre/atlas/commit/178dca44aef7696c148adb6152b9f6885f25528e) Thanks [@chasset](https://github.com/chasset)! - Première publication de ces 8 CLIs sur les registres npm (npmjs.org +
  GitHub Packages). Le code est inchangé ; ce bump `patch` déclenche
  simplement leur release initiale via le pipeline Changesets existant
  (cf. [ADR 0017](docs/decisions/0017-releases-npm-oidc-deux-registres.md)).
  `atlas-biblio-cli` était déjà publié et n'est pas concerné.

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

### Patch Changes

- [#125](https://github.com/univ-lehavre/atlas/pull/125) [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3) Thanks [@chasset](https://github.com/chasset)! - Renommage du cluster REDCap (packages internes) en cluster `crf` pour retirer la marque REDCap des identifiants publics du monorepo. Suite de la migration commencée avec `citation-types` et le cluster `citation`.

  **Packages renommés (npm + dossiers + workspace)**

  | Avant (npm)                         | Après (npm)                      |
  | ----------------------------------- | -------------------------------- |
  | `@univ-lehavre/atlas-redcap-core`   | `@univ-lehavre/atlas-crf-core`   |
  | `@univ-lehavre/atlas-redcap-client` | `@univ-lehavre/atlas-crf-client` |
  | `@univ-lehavre/atlas-redcap-logs`   | `@univ-lehavre/atlas-crf-logs`   |

  Les packages restants nommés `redcap-*` (apps/redcap-dashboard, cli/redcap-openapi, cli/redcap-stats, sandbox/redcap-sandbox) seront traités dans la PR 4.

  **Identifiants publics renommés (PascalCase, ~798 occurrences)**

  Toutes les classes/types/erreurs avec préfixe `Redcap` → `Crf` :
  - `RedcapClient` → `CrfClient`, `RedcapClientError` → `CrfClientError`, `RedcapClientService` → `CrfClientService`
  - `RedcapConfig` → `CrfConfig`, `RedcapConnectionConfig` → `CrfConnectionConfig`
  - `RedcapAdapter` → `CrfAdapter`, `RedcapFeatures` → `CrfFeatures`
  - `RedcapToken` / `RedcapTokenType` / `RedcapUrl` / `RedcapUrlType` (brands) → `Crf*` correspondants
  - `RedcapApiError`, `RedcapHttpError`, `RedcapNetworkError`, `RedcapFetchError`, `RedcapError`, `RedcapWriteError` → `Crf*`
  - `RedcapLogEntry` → `CrfLogEntry`
  - Fonctions : `createRedcapClient`, `makeRedcapClient`, `makeRedcapClientLayer`, `isRedcapErrorResponse`, `isValidRedcapName`, `checkRedcapServer` → `*Crf*`

  **Variables / champs**
  - `redcapApiToken`, `redcapApiUrl`, `redcapConfig`, `redcapResult`, `redcapToken`, `redcapUrl` → `crf*`
  - `REDCAP_NAME_PATTERN` / `REDCAP_TOKEN_PATTERN` → `CRF_*`
  - Codes d'erreur HTTP : `redcap_http_error` → `crf_http_error`, `redcap_api_error` → `crf_api_error`, `redcap_error` → `crf_error`
  - Variable exportée dans `services/crf/src/server/client.ts` : `redcap` → `client`

  **Sous-commandes CLI**
  - `cli/researcher-profiles` : `from-redcap` → `from-crf`
  - `cli/crf` : `crf-redcap` → `crf-api`

  **Dossiers / fichiers renommés**

  | Avant                                                 | Après                                              |
  | ----------------------------------------------------- | -------------------------------------------------- |
  | `apps/amarre/src/lib/server/redcap/`                  | `apps/amarre/src/lib/server/crf/`                  |
  | `apps/ecrin/src/lib/redcap/`                          | `apps/ecrin/src/lib/crf/`                          |
  | `cli/crf/src/commands/redcap/`                        | `cli/crf/src/commands/api/`                        |
  | `services/crf/src/server/redcap.ts`                   | `services/crf/src/server/client.ts`                |
  | `cli/researcher-profiles/src/commands/from-redcap.ts` | `cli/researcher-profiles/src/commands/from-crf.ts` |

  **Conservé (texte descriptif uniquement)**
  - Variables d'environnement (`REDCAP_API_TOKEN`, `REDCAP_API_URL`, `REDCAP_URL`, `PUBLIC_REDCAP_URL`)
  - Champs de données REDCap natifs (`redcap_event_name`, `redcap_repeat_instance`, `redcap_repeat_instrument`, `redcap_v`, `redcap16`)
  - URLs (`redcap.example.com`, `projectredcap.org`)
  - Messages d'erreur, JSDoc, libellés utilisateur mentionnant REDCap
  - `apps/redcap-dashboard/.redcap-stats.json` (entrée `.gitignore`, sera traitée en PR 4)

  **Migration côté consommateur**

  ```diff
  - import { type RedcapClient, createRedcapClient } from '@univ-lehavre/atlas-redcap-client';
  + import { type CrfClient, createCrfClient } from '@univ-lehavre/atlas-crf-client';
  ```

- Updated dependencies [[`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3), [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3)]:
  - @univ-lehavre/atlas-crf-logs@2.0.0

## 1.0.3

### Patch Changes

- [#123](https://github.com/univ-lehavre/atlas/pull/123) [`fa67ef8`](https://github.com/univ-lehavre/atlas/commit/fa67ef80e128e127f5bf602686f78f44ba02668f) Thanks [@chasset](https://github.com/chasset)! - Organize CLI source layout around bin, commands, config, prompts, and output adapters.

## 1.0.2

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea) Thanks [@chasset](https://github.com/chasset)! - Add `architectureCategory` option to ESLint presets in `shared-config` to enforce per-category import restrictions at lint time. All workspace packages receive their category assignment, enabling detection of CLI I/O in `packages/` and `*-cli` imports in `apps/` and `services/`. Normalize dependency specifiers and add `audit:dep-versions` script.

- Updated dependencies []:
  - @univ-lehavre/atlas-redcap-logs@1.0.1

## 1.0.1

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-redcap-logs@1.0.1

## 1.0.0

### Major Changes

- [`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4) Thanks [@chasset](https://github.com/chasset)! - Bump all packages to v1.0.0 — stabilisation des API publiques.

### Patch Changes

- Updated dependencies [[`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4)]:
  - @univ-lehavre/atlas-redcap-logs@1.0.0

## 0.2.3

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

- Updated dependencies [[`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec)]:
  - @univ-lehavre/atlas-redcap-logs@0.3.2

## 0.2.2

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-redcap-logs@0.3.1

## 0.2.1

### Patch Changes

- [#100](https://github.com/univ-lehavre/atlas/pull/100) [`aced246`](https://github.com/univ-lehavre/atlas/commit/aced24617bdc0839a40d8a52e69d6222e96b609a) Thanks [@chasset](https://github.com/chasset)! - Move REDCap tooling packages into the unified `cli/*` layout.
  - relocate `atlas-redcap-openapi` from `tools/dev/redcap-openapi` to `cli/redcap-openapi`
  - relocate `atlas-redcap-stats-cli` from `tools/cli-redcap-stats` to `cli/redcap-stats`
  - update workspace and tooling references (pnpm lockfile, TypeDoc, Knip, package metadata)

- Updated dependencies [[`02f3bdc`](https://github.com/univ-lehavre/atlas/commit/02f3bdcf6777f5ebd4fd730020f3d4e87cbc247e)]:
  - @univ-lehavre/atlas-redcap-logs@0.3.0

## 0.2.0

### Minor Changes

- [#97](https://github.com/univ-lehavre/atlas/pull/97) [`754e9e0`](https://github.com/univ-lehavre/atlas/commit/754e9e0c3a1dd199bc933585496c53c2202a7ed1) Thanks [@chasset](https://github.com/chasset)! - **`atlas-redcap-stats-cli` — Initial release.** New CLI package to inspect REDCap project token and API health.

  **`atlas-redcap-logs`** — Switch cache to current working directory, write human-readable JSON cache files, improve action-category detection (French labels), simplify user categories to "loggé"/"enquêté", estimate surveyed users from survey/record identifiers, add calendar-month aggregations.

### Patch Changes

- Updated dependencies [[`754e9e0`](https://github.com/univ-lehavre/atlas/commit/754e9e0c3a1dd199bc933585496c53c2202a7ed1), [`99cec7f`](https://github.com/univ-lehavre/atlas/commit/99cec7f077aedbb10fc217a87ed7d4055d9cbf7d)]:
  - @univ-lehavre/atlas-redcap-logs@0.2.0
