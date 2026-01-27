---
"@univ-lehavre/atlas-shared-config": minor
---

Add svelte-relaxed ESLint preset and import find-an-expert package

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
