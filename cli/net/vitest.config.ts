import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: coverageConfig({
      // Phase 2.6 — Seuils resserrés depuis 0 vers le réel mesuré le
      // 2026-05-30 (50.48/44.11/40.00/51.51) moins 2 pts de marge.
      // Renforcement Phase 3 (alignement sur cli/crf).
      thresholds: { statements: 48, branches: 42, functions: 38, lines: 49 },
    }),
  },
});
