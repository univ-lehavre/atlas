# @univ-lehavre/atlas-find-an-expert

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
