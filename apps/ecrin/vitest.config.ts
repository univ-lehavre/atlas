import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: coverageConfig({
      // Seuils restaurés à leur valeur d'origine après ajout des tests
      // handlers /graphs et /auth/signup (Phase 7.2). hooks.server.ts reste
      // partiellement non couvert mais la couverture globale repasse au-dessus
      // du seuil grâce aux nouveaux tests.
      thresholds: { statements: 28, branches: 18, functions: 27, lines: 28 },
    }),
  },
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
      '$env/static/private': path.resolve(__dirname, 'test-utils/env-mocks.ts'),
    },
  },
});
