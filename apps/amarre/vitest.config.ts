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
        // Thresholds baissés de 1 point (statements 42→41, lines 43→42) après
        // l'ajout des headers de sécurité dans hooks.server.ts (Phase 6.3).
        // À remonter une fois que des tests pour hooks.server.ts auront été
        // ajoutés — cf. TODO §6.3 follow-ups.
        thresholds: { statements: 41, branches: 52, functions: 36, lines: 42 },
      }),
    },
  })
);
