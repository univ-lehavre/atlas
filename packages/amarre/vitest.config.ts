import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Merge Vitest config with Vite/SvelteKit config so that `$lib`, `$env/*` and
// other virtual aliases are properly resolved in tests.
export default mergeConfig(
  viteConfig,
  defineConfig({ test: { environment: 'node', globals: true, include: ['tests/**/*.test.ts'] } })
);
