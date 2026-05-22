import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Merge vitest with the vite/SvelteKit config so `$lib`, `$env/*` and
// other virtual aliases resolve in tests. Three projects co-exist :
//
//   - unit         : pure-Node tests of `src/lib/` utilities, mocks, etc.
//   - ui           : Svelte components rendered through happy-dom + the
//                    @testing-library/svelte mount API. Covers atlas-ui
//                    composables consumed by the home page until we
//                    migrate them to ui/atlas-ui/tests/ (cf. TODO).
//   - integration  : route handlers under `src/routes/api/**`, run in a
//                    Node env with mocked Appwrite / fetch as needed.
//
// `pnpm test` runs the three. Individual projects via `test:unit`,
// `test:ui`, `test:integration`.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      coverage: coverageConfig({
        include: ['src/**/*.{ts,tsx,js,jsx,svelte}'],
        // `+page.svelte` orchestre uniquement (data → AnonymousHome +
        // SignupModal), composants déjà testés en `tests/ui/`. Le
        // composant route page nécessiterait un setup SvelteKit lourd
        // pour SSR — exclu pour l'instant, à recouvrir avec un test
        // E2E (sandbox/sillage-sandbox/tests/e2e/) une fois la stack
        // up.
        exclude: ['src/routes/+page.svelte'],
        thresholds: { statements: 70, branches: 65, functions: 70, lines: 70 },
      }),
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['tests/**/*.test.ts'],
            exclude: ['tests/ui/**', 'tests/integration/**', 'node_modules/**'],
          },
        },
        {
          extends: true,
          resolve: {
            // Svelte 5 ships an SSR build by default in Node. That build
            // explodes with `lifecycle_function_unavailable` as soon as
            // @testing-library/svelte tries to `mount(...)`. Force the
            // browser build for component tests.
            conditions: ['browser'],
          },
          test: {
            name: 'ui',
            environment: 'happy-dom',
            include: ['tests/ui/**/*.test.ts'],
            setupFiles: ['./tests/ui/setup.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            environment: 'node',
            include: ['tests/integration/**/*.test.ts'],
          },
        },
      ],
    },
  })
);
