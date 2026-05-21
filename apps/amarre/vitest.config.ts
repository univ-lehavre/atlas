import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Merge Vitest config with Vite/SvelteKit config so that `$lib`, `$env/*` and
// other virtual aliases are properly resolved in tests.
//
// Three test projects co-exist :
//   - `unit` : tests of lib/, routes/, server/ in a pure Node environment.
//             Existing tests, untouched.
//   - `ui`   : tests of Svelte components under `tests/ui/` rendered with
//             happy-dom and @testing-library/svelte. Level-1 of the test
//             pyramid (cf. apps/amarre/tests/README.md).
//   - `integration` : tests under `tests/integration/` that hit a real
//             REDCap docker (level 3). They self-skip when REDCap is
//             unreachable, so they're safe to leave in `pnpm test`. To
//             actually exercise them, bring docker up via the
//             crf-sandbox / amarre-sandbox scripts before running.
//
// Run a single project: `pnpm test:unit`, `pnpm test:ui` or
// `pnpm test:integration`. The default `pnpm test` runs all three.
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
        // Re-baselined after the 15 UI components moved to
        // @univ-lehavre/atlas-ui. The denominator dropped (no more
        // src/lib/ui/ tree) so absolute % shifted. The remaining amarre
        // code is mostly routes + services. Raise these as those layers
        // get more covered.
        thresholds: { statements: 50, branches: 58, functions: 32, lines: 53 },
      }),
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            // Everything except the `tests/ui/` and `tests/integration/`
            // trees. Keeps the original pre-pyramid test layout working
            // unchanged.
            include: ['tests/**/*.test.ts'],
            exclude: ['tests/ui/**', 'tests/integration/**', 'node_modules/**', 'dist/**'],
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
        {
          extends: true,
          test: {
            name: 'integration',
            environment: 'node',
            include: ['tests/integration/**/*.test.ts'],
            // Real network calls to REDCap on localhost:8888 — allow time
            // for the docker container to respond + project queries to
            // resolve. Suites self-skip when REDCap is unreachable.
            testTimeout: 30_000,
            hookTimeout: 30_000,
          },
        },
      ],
    },
  })
);
