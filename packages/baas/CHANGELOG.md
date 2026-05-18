# @univ-lehavre/atlas-appwrite

## 2.0.0

### Major Changes

- [#125](https://github.com/univ-lehavre/atlas/pull/125) [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3) Thanks [@chasset](https://github.com/chasset)! - Renommage du package Appwrite en `baas` (Backend-as-a-Service) pour retirer la marque Appwrite des identifiants publics du monorepo. Fin de la migration anti-marque (PR 1 citation-types, PR 2 cluster citation, PR 3 cluster crf).

  **Package renommé (npm + dossier + workspace)**

  | Avant (npm)                    | Après (npm)                |
  | ------------------------------ | -------------------------- |
  | `@univ-lehavre/atlas-appwrite` | `@univ-lehavre/atlas-baas` |

  **Identifiants publics renommés**

  Types et erreurs :
  - `AppwriteConfig` → `BaasConfig`

  Classes et fonctions :
  - `AppwriteUserRepository` → `BaasUserRepository`
  - `AppwriteCurrentConsentRepository` → `BaasCurrentConsentRepository`
  - `AppwriteConsentEventRepository` → `BaasConsentEventRepository`
  - `MockAppwriteUserRepository` → `MockBaasUserRepository`
  - `checkAppwrite` / `checkAppwriteDatabase` / `checkAppwriteEndpoint` → `checkBaas*`
  - `isAppwriteAuthError` → `isBaasAuthError`
  - `mapAppwriteUserToProfile` → `mapBaasUserToProfile`
  - `serviceAppwrite` → `serviceBaas`

  Schémas et clés de config :
  - `appwriteDatetime` (zod schema) → `baasDatetime`
  - Clé `appwrite` dans `AuthConfig` → `baas`
  - `NodeAppwrite` (alias d'import du SDK) → `BaasSdk`

  Codes d'état et traductions :
  - `'appwrite_unavailable'` (string code) → `'baas_unavailable'`
  - `appwriteUnavailable`, `appwriteUnavailableTitle`, `appwriteUnavailableDescription` (clés i18n) → `baas*`
  - `brand.appwrite` (clé d'objet) → `brand.baas`
  - `name: 'appwrite'` (service health) → `name: 'baas'`

  **Dossiers / fichiers renommés**

  | Avant                                                  | Après                                      |
  | ------------------------------------------------------ | ------------------------------------------ |
  | `packages/appwrite/`                                   | `packages/baas/`                           |
  | `apps/amarre/src/lib/server/appwrite/`                 | `apps/amarre/src/lib/server/baas/`         |
  | `apps/ecrin/src/lib/appwrite/`                         | `apps/ecrin/src/lib/baas/`                 |
  | `apps/find-an-expert/src/lib/server/appwrite/`         | `apps/find-an-expert/src/lib/server/baas/` |
  | `.env.dev.appwrite.example`                            | `.env.dev.baas.example`                    |
  | `.env.prod.appwrite.example`                           | `.env.prod.baas.example`                   |
  | `docs/projects/ecrin/find-an-expert/appwrite-setup.md` | `.../baas-setup.md`                        |

  **Conservé (texte descriptif uniquement)**
  - Dépendances npm tierces : `appwrite`, `node-appwrite`
  - Classe `AppwriteException` (du SDK officiel)
  - URLs Appwrite Cloud (`cloud.appwrite.io`)
  - Variables d'environnement `APPWRITE_*`, `PUBLIC_APPWRITE_*` (conventions choisies/imposées par les apps consommant le SDK)
  - Mots-clés npm `"appwrite"` (discoverability)
  - Messages d'erreur, JSDoc, libellés utilisateur

  **Migration locale requise**

  Les fichiers d'environnement locaux (gitignored) doivent être renommés :

  ```bash
  mv .env.dev.appwrite .env.dev.baas
  mv .env.prod.appwrite .env.prod.baas
  ```

  **Migration côté consommateur**

  ```diff
  - import { createAdminClient, type AppwriteConfig } from '@univ-lehavre/atlas-appwrite';
  + import { createAdminClient, type BaasConfig } from '@univ-lehavre/atlas-baas';
  ```

  ```diff
  - const auth = createAuthService({ appwrite: { ... }, ... });
  + const auth = createAuthService({ baas: { ... }, ... });
  ```

## 1.0.2

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea) Thanks [@chasset](https://github.com/chasset)! - Add `architectureCategory` option to ESLint presets in `shared-config` to enforce per-category import restrictions at lint time. All workspace packages receive their category assignment, enabling detection of CLI I/O in `packages/` and `*-cli` imports in `apps/` and `services/`. Normalize dependency specifiers and add `audit:dep-versions` script.

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25) Thanks [@chasset](https://github.com/chasset)! - Update dependency ranges and lockfile entries, and make the version audit fail when outdated dependencies are detected.

- Updated dependencies []:
  - @univ-lehavre/atlas-errors@1.0.1

## 1.0.1

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-errors@1.0.1

## 1.0.0

### Major Changes

- [`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4) Thanks [@chasset](https://github.com/chasset)! - Bump all packages to v1.0.0 — stabilisation des API publiques.

### Patch Changes

- Updated dependencies [[`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4)]:
  - @univ-lehavre/atlas-errors@1.0.0

## 0.2.4

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

- Updated dependencies [[`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec)]:
  - @univ-lehavre/atlas-errors@0.2.4

## 0.2.3

### Patch Changes

- [#103](https://github.com/univ-lehavre/atlas/pull/103) [`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19) Thanks [@chasset](https://github.com/chasset)! - Align dependency updates across the workspace packages, replace the license audit implementation at the root, and remove deprecated `@types/json-stable-stringify` from `@univ-lehavre/atlas-validate-openalex`.

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-errors@0.2.3

## 0.2.2

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

- Updated dependencies [[`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da)]:
  - @univ-lehavre/atlas-errors@0.2.2

## 0.2.1

### Patch Changes

- [#64](https://github.com/univ-lehavre/atlas/pull/64) [`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6) Thanks [@chasset](https://github.com/chasset)! - ## Documentation
  - Translate all documentation to English for international accessibility
  - Add Microservices project with K3s installation procedure
  - Infrastructure: Cilium, Longhorn, Authelia, Mattermost, REDCap, ECRIN, Gitea, ArgoCD
  - Configure REDCap access control (public surveys, protected admin)

- Updated dependencies [[`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6)]:
  - @univ-lehavre/atlas-errors@0.2.1

## 0.2.0

### Minor Changes

- [#47](https://github.com/univ-lehavre/atlas/pull/47) [`9d0028a`](https://github.com/univ-lehavre/atlas/commit/9d0028af67634f284f73cd5473a9a3e8f6757b3c) Thanks [@chasset](https://github.com/chasset)! - feat: create shared packages for auth, errors, validators, and appwrite

  New shared packages to eliminate code duplication across SvelteKit apps:
  - `@univ-lehavre/atlas-errors`: ApplicationError base class and typed HTTP errors
  - `@univ-lehavre/atlas-appwrite`: Appwrite client utilities and UserRepository
  - `@univ-lehavre/atlas-validators`: Email, hex, JSON validation (RFC 5322, ReDoS-safe)
  - `@univ-lehavre/atlas-auth`: Authentication service with magic URL login

  Migrated amarre, ecrin, and find-an-expert to use shared packages via re-exports,
  maintaining backward compatibility for existing imports.

### Patch Changes

- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa) Thanks [@chasset](https://github.com/chasset)! - Remove `private` field from package.json to allow future publishing

- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`9ad9099`](https://github.com/univ-lehavre/atlas/commit/9ad9099d3861a6595d2acd6ecb10cf29d46a6d63) Thanks [@chasset](https://github.com/chasset)! - Add test:coverage script to packages

- Updated dependencies [[`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa), [`9ad9099`](https://github.com/univ-lehavre/atlas/commit/9ad9099d3861a6595d2acd6ecb10cf29d46a6d63), [`9d0028a`](https://github.com/univ-lehavre/atlas/commit/9d0028af67634f284f73cd5473a9a3e8f6757b3c)]:
  - @univ-lehavre/atlas-errors@0.2.0
