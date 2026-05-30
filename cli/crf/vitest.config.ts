import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: coverageConfig({
      // Phase 2.6 — Seuils resserrés depuis 0 vers le réel mesuré le
      // 2026-05-30 (64.59/64.70/78.43/62.71) moins 2 pts de marge.
      // L'ajout des tests des bin entry points (commands/api/index.ts,
      // commands/server/index.ts) en Phase 3 fera remonter ces seuils.
      thresholds: { statements: 62, branches: 62, functions: 76, lines: 60 },
    }),
  },
});
