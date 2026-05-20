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
        // Override the shared default `include` to count the Svelte
        // components rendered by `tests/ui/`. Without this, level-1 UI
        // tests execute but their coverage isn't measured (v8 only
        // tracks files in `include`, and shared-config defaults to
        // ts/tsx/js/jsx only).
        include: ['src/**/*.{ts,tsx,js,jsx,svelte}'],
        // Adding the .svelte files surfaced a lot of conditional branches
        // in components the level-1 suite doesn't cover yet (Collaborate,
        // Footer, MainTitle, HorizontalScroller, etc.). We lower the
        // branches threshold from 52 → 40 to absorb that without masking
        // the gain on statements/functions/lines (which all went up
        // thanks to the new UI tests). The threshold will be raised
        // again as level-1 coverage expands to those components.
        thresholds: { statements: 42, branches: 40, functions: 36, lines: 43 },
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
