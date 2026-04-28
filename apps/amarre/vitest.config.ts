import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Merge Vitest config with Vite/SvelteKit config so that `$lib`, `$env/*` and
// other virtual aliases are properly resolved in tests.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      globals: true,
      include: ['tests/**/*.test.ts'],
      coverage: coverageConfig({
        thresholds: { statements: 42, branches: 52, functions: 36, lines: 43 },
      }),
    },
  })
);
