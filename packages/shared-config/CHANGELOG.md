# @univ-lehavre/atlas-shared-config

## 0.3.0
### Minor Changes



- [#47](https://github.com/univ-lehavre/atlas/pull/47) [`2eeb821`](https://github.com/univ-lehavre/atlas/commit/2eeb821e52946197b944cbbca2cb9942c413ef75) Thanks [@chasset](https://github.com/chasset)! - Add svelte-relaxed ESLint preset and import find-an-expert package
  
  ### @univ-lehavre/atlas-shared-config
  - New `svelteRelaxed` preset for less strict SvelteKit linting
  - Suitable for imported projects or rapid development
  - No functional programming requirements
  - Relaxed TypeScript rules (unsafe-* rules disabled)
  - Export available via `@univ-lehavre/atlas-shared-config/eslint/svelte-relaxed`
  
  ### find-an-expert (new package)
  - SvelteKit application for researcher expertise analysis
  - OpenAlex API integration for publications
  - GitHub API integration for code contributions
  - Appwrite backend integration
  - Svelte 5 with runes, Tailwind CSS 4
  - i18n support (FR/EN)
  - Accessibility testing with vitest-axe

### Patch Changes



- [#48](https://github.com/univ-lehavre/atlas/pull/48) [`164e0cb`](https://github.com/univ-lehavre/atlas/commit/164e0cb99c3bb544426d6976529007e6d56a74aa) Thanks [@chasset](https://github.com/chasset)! - Remove `private` field from package.json to allow future publishing
