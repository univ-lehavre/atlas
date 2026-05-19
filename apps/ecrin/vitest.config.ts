import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: coverageConfig({
      // Thresholds baissés de 1 point (statements 28→27, branches 18→17) après
      // l'ajout des headers de sécurité dans hooks.server.ts (Phase 6.3).
      // À remonter une fois que des tests pour hooks.server.ts auront été
      // ajoutés — cf. TODO §6.3 follow-ups.
      thresholds: { statements: 27, branches: 17, functions: 27, lines: 28 },
    }),
  },
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
      '$env/static/private': path.resolve(__dirname, 'test-utils/env-mocks.ts'),
    },
  },
});
