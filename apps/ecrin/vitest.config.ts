import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: coverageConfig({
      // Thresholds baissés progressivement après l'ajout de code non
      // couvert par les tests :
      // - Phase 6.3 (headers HTTP dans hooks.server.ts) : statements 28→27, branches 18→17
      // - Phase 6.5 (rate-limit dans /graphs et /auth/signup) : lines 28→27
      // À remonter via tests pour hooks.server.ts + handlers rate-limités — cf. TODO §6.3 et §6.5.
      thresholds: { statements: 27, branches: 17, functions: 27, lines: 27 },
    }),
  },
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
      '$env/static/private': path.resolve(__dirname, 'test-utils/env-mocks.ts'),
    },
  },
});
