import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: coverageConfig({
      // Phase 2.2 — Resserrés à (réel mesuré 2026-05-30 − 2 pts) :
      // 40.14/27.61/33.33/41.13. La couverture réelle dépasse les
      // anciens seuils de 12 points (statements) ; on ferme l'écart
      // pour que toute régression de routes/handlers soit signalée
      // immédiatement. Renforcement supplémentaire en Phase 3.
      thresholds: { statements: 38, branches: 25, functions: 31, lines: 39 },
    }),
  },
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
      '$env/static/private': path.resolve(__dirname, 'test-utils/env-mocks.ts'),
    },
  },
});
