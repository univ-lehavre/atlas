# @univ-lehavre/atlas-find-an-expert

## 2.0.1

### Patch Changes

- Updated dependencies [[`3229d56`](https://github.com/univ-lehavre/atlas/commit/3229d56df92f880e112dfba6158fc48523699d36)]:
  - @univ-lehavre/atlas-auth@2.1.0
  - @univ-lehavre/atlas-logos@1.2.0
  - @univ-lehavre/atlas-baas@2.0.1
  - @univ-lehavre/atlas-errors@1.0.2
  - @univ-lehavre/atlas-validators@1.0.2

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

- [#125](https://github.com/univ-lehavre/atlas/pull/125) [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3) Thanks [@chasset](https://github.com/chasset)! - Renommage du cluster OpenAlex en cluster `citation` pour retirer la marque OpenAlex des identifiants publics du monorepo (suite de la migration commencée avec `citation-types`).

  **Packages renommés**

  | Avant (npm)                             | Après (npm)                             |
  | --------------------------------------- | --------------------------------------- |
  | `@univ-lehavre/atlas-fetch-openalex`    | `@univ-lehavre/atlas-citation-fetch`    |
  | `@univ-lehavre/atlas-openalex`          | `@univ-lehavre/atlas-citation`          |
  | `@univ-lehavre/atlas-validate-openalex` | `@univ-lehavre/atlas-citation-validate` |
  | `@univ-lehavre/atlas-openalex-cli`      | `@univ-lehavre/atlas-citation-cli`      |

  Les anciens packages npm seront dépréciés vers les nouveaux noms.

  **Bin renommé**
  - `atlas-openalex` → `atlas-citation` (dans `@univ-lehavre/atlas-citation-cli`)

  **Identifiants publics renommés**
  - Types : `OpenAlexConfig` → `CitationConfig`, `OpenalexResponse` → `CitationResponse`, `OpenalexSearchAuthorAffiliationResult` → `CitationSearchAuthorAffiliationResult`
  - Erreurs : `OpenAlexSearchError` (exporté par `@univ-lehavre/atlas-researcher-profiles`) → `CitationSearchError`
  - Champs : `openalex_api_url` → `citation_api_url`, `openalex_api_key` → `citation_api_key`
  - Fichiers : `fetch-openalex.ts`, `fetch-openalex-entities.ts`, `types/openalex.ts` → `fetch-citation.ts`, `fetch-citation-entities.ts`, `types/citation.ts`
  - Apps : `apps/find-an-expert/src/lib/server/openalex/` → `apps/find-an-expert/src/lib/server/citation/`

  **Conservé (texte descriptif uniquement)**
  - URLs d'API (`https://openalex.org/...`) — réelle adresse d'API tierce
  - Messages d'erreur et JSDoc mentionnant "OpenAlex" — texte explicatif
  - Variables d'environnement `OPENALEX_*` — convention imposée par le service tiers

  **Migration côté consommateur**

  ```diff
  - import { type OpenAlexConfig } from '@univ-lehavre/atlas-fetch-openalex';
  + import { type CitationConfig } from '@univ-lehavre/atlas-citation-fetch';
  ```

  ```diff
  - import { type OpenalexSearchAuthorAffiliationResult } from '@univ-lehavre/atlas-openalex';
  + import { type CitationSearchAuthorAffiliationResult } from '@univ-lehavre/atlas-citation';
  ```

  **Note sur `@univ-lehavre/atlas-find-an-expert`** : l'app n'est pas publiée sur npm, mais reçoit un bump major car ses imports et la structure de ses dossiers `lib/server/citation/` changent — utile pour le suivi changelog interne.

### Patch Changes

- Updated dependencies [[`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3), [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3), [`c616cab`](https://github.com/univ-lehavre/atlas/commit/c616cabd29561b50e2dac26bedd489378bee65b3)]:
  - @univ-lehavre/atlas-baas@2.0.0
  - @univ-lehavre/atlas-citation-fetch@2.0.0

## 1.0.3

### Patch Changes

- Updated dependencies []:
  - @univ-lehavre/atlas-fetch-openalex@1.0.3

## 1.0.2

### Patch Changes

- [#115](https://github.com/univ-lehavre/atlas/pull/115) [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25) Thanks [@chasset](https://github.com/chasset)! - Update dependency ranges and lockfile entries, and make the version audit fail when outdated dependencies are detected.

- Updated dependencies [[`eae5e1c`](https://github.com/univ-lehavre/atlas/commit/eae5e1c54e7e231acd9566221dd1926983e920ea), [`61bebae`](https://github.com/univ-lehavre/atlas/commit/61bebaeb579e42539937befb3fc344f631d81e98), [`fee2990`](https://github.com/univ-lehavre/atlas/commit/fee2990d90ef48667e6f4bd10de3478768f81b25)]:
  - @univ-lehavre/atlas-appwrite@1.0.2
  - @univ-lehavre/atlas-fetch-openalex@1.0.2
  - @univ-lehavre/atlas-logos@1.1.3
  - @univ-lehavre/atlas-errors@1.0.1
  - @univ-lehavre/atlas-validators@1.0.1

## 1.0.1

### Patch Changes

- [#113](https://github.com/univ-lehavre/atlas/pull/113) [`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310) Thanks [@chasset](https://github.com/chasset)! - Document code units with accurate README summaries.

- Updated dependencies [[`6f6e5db`](https://github.com/univ-lehavre/atlas/commit/6f6e5db80769bf9b375510e37c5ed0dba2f3c310)]:
  - @univ-lehavre/atlas-appwrite@1.0.1
  - @univ-lehavre/atlas-errors@1.0.1
  - @univ-lehavre/atlas-fetch-openalex@1.0.1
  - @univ-lehavre/atlas-logos@1.1.2
  - @univ-lehavre/atlas-validators@1.0.1

## 1.0.0

### Major Changes

- [`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4) Thanks [@chasset](https://github.com/chasset)! - Bump all packages to v1.0.0 — stabilisation des API publiques.

### Patch Changes

- [`dc70780`](https://github.com/univ-lehavre/atlas/commit/dc707802c2dc220e9eba4b6089b090a91cbf7465) Thanks [@chasset](https://github.com/chasset)! - Extract CLI interaction from `packages/openalex` into new `cli/openalex` workspace.

  `@univ-lehavre/atlas-openalex` is now a proper reusable library (adds `exports`/`main`/`types` fields, removes `@clack/prompts`, `yargs`, `picocolors` dependencies). The interactive researcher curation program moves to `@univ-lehavre/atlas-openalex-cli`.

  `@univ-lehavre/atlas-crf`: extract `projectResponses` helper and refactor `createApp` to reduce duplication.

  `@univ-lehavre/atlas-find-an-expert`: add consent and user service test coverage.

- Updated dependencies [[`885539b`](https://github.com/univ-lehavre/atlas/commit/885539b9ba8c013680cb9784ccf8d124c8b73ce4)]:
  - @univ-lehavre/atlas-appwrite@1.0.0
  - @univ-lehavre/atlas-errors@1.0.0
  - @univ-lehavre/atlas-validators@1.0.0
  - @univ-lehavre/atlas-fetch-openalex@1.0.0

## 0.5.6

### Patch Changes

- [#109](https://github.com/univ-lehavre/atlas/pull/109) [`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec) Thanks [@chasset](https://github.com/chasset)! - Mise à jour des dépendances (minor/patch) : svelte, vite, vitest, typescript, eslint, prettier, effect, @sveltejs/kit, appwrite, knip, turbo, lefthook, et autres.

- Updated dependencies [[`2373654`](https://github.com/univ-lehavre/atlas/commit/2373654c0267e728c87807786b4b311cae29b4ec)]:
  - @univ-lehavre/atlas-appwrite@0.2.4
  - @univ-lehavre/atlas-errors@0.2.4
  - @univ-lehavre/atlas-fetch-openalex@0.4.4
  - @univ-lehavre/atlas-validators@0.2.4

## 0.5.5

### Patch Changes

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-appwrite@0.2.3
  - @univ-lehavre/atlas-errors@0.2.3
  - @univ-lehavre/atlas-fetch-openalex@0.4.3
  - @univ-lehavre/atlas-validators@0.2.3

## 0.5.4

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

- Updated dependencies [[`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da)]:
  - @univ-lehavre/atlas-appwrite@0.2.2
  - @univ-lehavre/atlas-errors@0.2.2
  - @univ-lehavre/atlas-fetch-openalex@0.4.2
  - @univ-lehavre/atlas-validators@0.2.2

## 0.5.3

### Patch Changes

- Updated dependencies []:
  - @univ-lehavre/atlas-fetch-openalex@0.4.1

## 0.5.2

### Patch Changes

- [#64](https://github.com/univ-lehavre/atlas/pull/64) [`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6) Thanks [@chasset](https://github.com/chasset)! - ## Documentation
  - Translate all documentation to English for international accessibility
  - Add Microservices project with K3s installation procedure
  - Infrastructure: Cilium, Longhorn, Authelia, Mattermost, REDCap, ECRIN, Gitea, ArgoCD
  - Configure REDCap access control (public surveys, protected admin)

- Updated dependencies [[`2ed6a4a`](https://github.com/univ-lehavre/atlas/commit/2ed6a4a03c5ceb65932a4eb2f5e8ae5dce1f3b03), [`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6), [`a67fbc0`](https://github.com/univ-lehavre/atlas/commit/a67fbc038561190cd982873c41cf0ca0030fa4ee), [`c772a94`](https://github.com/univ-lehavre/atlas/commit/c772a94eb3c4126834723b926824ee8e4a3afeec)]:
  - @univ-lehavre/atlas-fetch-openalex@0.4.0
  - @univ-lehavre/atlas-validators@0.2.1
  - @univ-lehavre/atlas-appwrite@0.2.1
  - @univ-lehavre/atlas-errors@0.2.1
  - @univ-lehavre/atlas-logos@1.1.1

## 0.5.1

### Patch Changes

- [#47](https://github.com/univ-lehavre/atlas/pull/47) [`57244db`](https://github.com/univ-lehavre/atlas/commit/57244db507023838f05cf13ea93db471d00f4e1b) Thanks [@chasset](https://github.com/chasset)! - Remove unused exports and enable knip exports check
  - Enable knip to detect unused exports (remove --exclude exports flag)
  - Clean up 105 unused exports across packages
  - Configure knip to ignore public API files in crf package

- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa) Thanks [@chasset](https://github.com/chasset)! - Remove `private` field from package.json to allow future publishing

- [#47](https://github.com/univ-lehavre/atlas/pull/47) [`9d0028a`](https://github.com/univ-lehavre/atlas/commit/9d0028af67634f284f73cd5473a9a3e8f6757b3c) Thanks [@chasset](https://github.com/chasset)! - feat: create shared packages for auth, errors, validators, and appwrite

  New shared packages to eliminate code duplication across SvelteKit apps:
  - `@univ-lehavre/atlas-errors`: ApplicationError base class and typed HTTP errors
  - `@univ-lehavre/atlas-appwrite`: Appwrite client utilities and UserRepository
  - `@univ-lehavre/atlas-validators`: Email, hex, JSON validation (RFC 5322, ReDoS-safe)
  - `@univ-lehavre/atlas-auth`: Authentication service with magic URL login

  Migrated amarre, ecrin, and find-an-expert to use shared packages via re-exports,
  maintaining backward compatibility for existing imports.

- Updated dependencies [[`78a8e8a`](https://github.com/univ-lehavre/atlas/commit/78a8e8a2cc9f2f24b181fdf82b3f3d215ae390b4), [`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa), [`9ad9099`](https://github.com/univ-lehavre/atlas/commit/9ad9099d3861a6595d2acd6ecb10cf29d46a6d63), [`9d0028a`](https://github.com/univ-lehavre/atlas/commit/9d0028af67634f284f73cd5473a9a3e8f6757b3c)]:
  - @univ-lehavre/atlas-logos@1.1.0
  - @univ-lehavre/atlas-appwrite@0.2.0
  - @univ-lehavre/atlas-errors@0.2.0
  - @univ-lehavre/atlas-validators@0.2.0
