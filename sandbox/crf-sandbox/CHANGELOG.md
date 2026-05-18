# @univ-lehavre/atlas-redcap-sandbox

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
