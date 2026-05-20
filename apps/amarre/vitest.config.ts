import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Merge Vitest config with Vite/SvelteKit config so that `$lib`, `$env/*` and
// other virtual aliases are properly resolved in tests.
//
// Two test projects co-exist :
//   - `unit` : tests of lib/, routes/, server/ in a pure Node environment.
//             Existing tests, untouched.
//   - `ui`   : tests of Svelte components under `tests/ui/` rendered with
//             happy-dom and @testing-library/svelte. Level-1 of the test
//             pyramid (cf. apps/amarre/tests/README.md).
//
// Run a single project: `pnpm test:unit` or `pnpm test:ui`. The default
// `pnpm test` runs both.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      coverage: coverageConfig({
        // Seuils restaurés à leur valeur d'origine après ajout des tests
        // handler /auth/signup (Phase 7.2). hooks.server.ts reste partiellement
        // non couvert mais la couverture globale repasse au-dessus du seuil
        // grâce aux nouveaux tests.
        thresholds: { statements: 42, branches: 52, functions: 36, lines: 43 },
      }),
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            // Everything except the `tests/ui/` tree. Keeps the original
            // pre-pyramid test layout working unchanged.
            include: ['tests/**/*.test.ts'],
            exclude: ['tests/ui/**', 'node_modules/**', 'dist/**'],
          },
        },
        {
          extends: true,
          resolve: {
            // Svelte 5 ships two builds — the SSR build (default for Node)
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
      ],
    },
  })
);
