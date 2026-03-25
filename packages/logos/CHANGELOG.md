# @univ-lehavre/atlas-logos

## 1.1.1

### Patch Changes

- [#63](https://github.com/univ-lehavre/atlas/pull/63) [`a67fbc0`](https://github.com/univ-lehavre/atlas/commit/a67fbc038561190cd982873c41cf0ca0030fa4ee) Thanks [@chasset](https://github.com/chasset)! - docs: restructure documentation and add dynamic api sidebar
  - Add dynamic API sidebar generation from TypeDoc structure (219 items)
  - Split /guide/ into /guide/researchers/ and /guide/developers/
  - Add project status warnings to AMARRE, Citations, and Infrastructure
  - Replace docs/public/logos with symlink to packages/logos
  - Add "Me" card to ECRIN Introduce section
  - Update API index page with all 14 packages organized by category

## 1.1.0

### Minor Changes

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

- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa) Thanks [@chasset](https://github.com/chasset)! - Remove `private` field from package.json to allow future publishing
