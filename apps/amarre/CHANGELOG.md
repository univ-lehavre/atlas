# @univ-lehavre/amarre

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

## 1.7.0

### Minor Changes

- 47c914c: Add an AMARRE favicon

## 1.6.0

### Minor Changes

- 37b7513: Replace main title to a logo
- ad56973: Add the "follow" in the top navbar

### Patch Changes

- 1dbf533: Les liens ouvrent maintenant des nouveaux onglets

## 1.5.3

### Patch Changes

- 24cbd0b: Fix the UI validation presentation
- c5078b8: Suppression du champ confirmation dans le formulaire REDCap

## 1.5.2

### Patch Changes

- ec1a082: Fix the destination UI label in request title
- 5b395c4: Fix Follow title in UI
- ea478aa: Fix request status when form is empty

## 1.5.1

### Patch Changes

- f38e1ba: Fix an issue: users now get the same userid even if appwrite is reset. A new userid is set only if there is no records in REDCap for this user

## 1.5.0

### Minor Changes

- 90a0309: Add health API, and adjust the UI behavior

## 1.4.0

### Minor Changes

- 2942f58: Ajout d'un agent IA dédié à la sécurité

### Patch Changes

- 725bd67: Fix test on /api/v1/surveys/new

## 1.3.0

### Minor Changes

- 42f45ff: Ajout d'une méthode API liée à la santé de l'application
- 4cbfa3e: Ajout des liens d'enquête pour chaque demande et chaque instrument dans chaque demande

## 1.2.0

### Minor Changes

- 3f712af: La création d'une nouvelle requête n'est pas possible uniquement que si les dernières ont un formulaire complété
- cc93f5f: Replace Swagger UI with RapiDoc for API documentation. RapiDoc offers a modern, customizable interface with better user experience. Added anti-derive tests for survey endpoints to ensure OpenAPI schemas match actual API responses.
- c34f53b: add UI cards for each request

### Patch Changes

- 13fd770: /api/v1/surveys/download retrieves now all requests.

## 1.1.0

### Minor Changes

- 8e4676c: /api/v1/surveys/new Ajoute désormais l'identifiant de l'utilisateur
- 08608c2: Add /api/v1/surveys/new
- 43494a0: /api/v1/surveys/list is now implemented

### Patch Changes

- e70b05d: Mise à jour de la description de l'API dans /api/docs

## 1.0.0

### Major Changes

- 10d948c: Simplification du code et mise en place des bonnes pratiques

### Patch Changes

- 9d12227: Refactorisation des messages d'erreur dans l'interface graphique
- 436cfd0: Mise à jour de /api/docs en fonction des modifications de l'API
