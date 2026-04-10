# @univ-lehavre/ecrin

## 2.0.3

### Patch Changes

- Updated dependencies [[`35dec18`](https://github.com/univ-lehavre/atlas/commit/35dec1802d501625c14f4f83e167e881040b1f19)]:
  - @univ-lehavre/atlas-appwrite@0.2.3
  - @univ-lehavre/atlas-errors@0.2.3
  - @univ-lehavre/atlas-validators@0.2.3

## 2.0.2

### Patch Changes

- [#87](https://github.com/univ-lehavre/atlas/pull/87) [`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da) Thanks [@chasset](https://github.com/chasset)! - chore(deps): upgrade all dependencies to latest (eslint v10, typescript v6, vite v8, @effect/platform v0.96, @clack/prompts v1, csv-parse v6, pdfkit v0.18, node-appwrite v23, appwrite v24)

- Updated dependencies [[`cd38531`](https://github.com/univ-lehavre/atlas/commit/cd38531d422afa9c1e47c88d0a617dbaf8c753da)]:
  - @univ-lehavre/atlas-appwrite@0.2.2
  - @univ-lehavre/atlas-errors@0.2.2
  - @univ-lehavre/atlas-validators@0.2.2

## 2.0.1

### Patch Changes

- [#64](https://github.com/univ-lehavre/atlas/pull/64) [`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6) Thanks [@chasset](https://github.com/chasset)! - ## Documentation
  - Translate all documentation to English for international accessibility
  - Add Microservices project with K3s installation procedure
  - Infrastructure: Cilium, Longhorn, Authelia, Mattermost, REDCap, ECRIN, Gitea, ArgoCD
  - Configure REDCap access control (public surveys, protected admin)

- Updated dependencies [[`393220c`](https://github.com/univ-lehavre/atlas/commit/393220c64c77a7cc13f4c57eb665555c588522a6), [`a67fbc0`](https://github.com/univ-lehavre/atlas/commit/a67fbc038561190cd982873c41cf0ca0030fa4ee)]:
  - @univ-lehavre/atlas-validators@0.2.1
  - @univ-lehavre/atlas-appwrite@0.2.1
  - @univ-lehavre/atlas-errors@0.2.1
  - @univ-lehavre/atlas-logos@1.1.1

## 2.0.0

### Major Changes

- [#47](https://github.com/univ-lehavre/atlas/pull/47) [`78a8e8a`](https://github.com/univ-lehavre/atlas/commit/78a8e8a2cc9f2f24b181fdf82b3f3d215ae390b4) Thanks [@chasset](https://github.com/chasset)! - Import ecrin and amarre packages into atlas monorepo

  ### @univ-lehavre/atlas-logos
  - Add AMARRE logos (amarre.png, amarre-icon.png)
  - Add France 2030 and Région Normandie partner logos

  ### @univ-lehavre/atlas-ecrin (new package)
  - SvelteKit application for research collaboration
  - Appwrite backend integration
  - REDCap integration for surveys
  - Graph visualization (Sigma, Graphology)
  - Svelte 5 with runes

  ### @univ-lehavre/atlas-amarre (new package)
  - SvelteKit application for clinical research data management
  - Appwrite backend integration
  - REDCap integration
  - Zod schema validation with OpenAPI generation
  - Svelte 5 with runes

### Patch Changes

- [#47](https://github.com/univ-lehavre/atlas/pull/47) [`57244db`](https://github.com/univ-lehavre/atlas/commit/57244db507023838f05cf13ea93db471d00f4e1b) Thanks [@chasset](https://github.com/chasset)! - Remove unused exports and enable knip exports check
  - Enable knip to detect unused exports (remove --exclude exports flag)
  - Clean up 105 unused exports across packages
  - Configure knip to ignore public API files in crf package

- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa) Thanks [@chasset](https://github.com/chasset)! - Remove `private` field from package.json to allow future publishing

- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`9ad9099`](https://github.com/univ-lehavre/atlas/commit/9ad9099d3861a6595d2acd6ecb10cf29d46a6d63) Thanks [@chasset](https://github.com/chasset)! - Add test:coverage script to packages

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

## 1.2.0

### Minor Changes

- 8ba0e31: openapi.json has now its own endpoint
- 986c540: Remove all unused code

### Patch Changes

- 14864a2: All services have now their own tests

## 1.1.0

### Minor Changes

- c19bbfd: Adapt signup flow to match appwrite 1.8

### Patch Changes

- 63e3d9d: Remove all card images
- a8eb381: Graph are now displayed on the whole canvas

## 1.0.2

### Patch Changes

- 20e4037: Mise à jour de la documentation

## 1.0.1

### Patch Changes

- dea0b67: Mise en place de changeset
- 122f51b: Mise à jour des dépendancesw
