import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: coverageConfig({
      // Phase 4.3 — Resserrés après ajout de 10 fichiers test endpoint
      // (200/401/payload malformé). Réel mesuré 2026-05-30 (post-Phase
      // 4) : 54.18/36.56/39.81/55.78. Marge de 2 pts.
      thresholds: { statements: 52, branches: 34, functions: 37, lines: 53 },
    }),
  },
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
      '$env/static/private': path.resolve(__dirname, 'test-utils/env-mocks.ts'),
    },
  },
});
