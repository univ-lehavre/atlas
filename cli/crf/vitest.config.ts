import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: coverageConfig({
      // Phase 2.6 — Seuils resserrés depuis 0 vers le réel mesuré le
      // 2026-05-30 (64.59/64.70/78.43/62.71) moins 2 pts de marge.
      // Renforcement Phase 3 reporté : les bin entry points (api/index,
      // server/index) ont un setup @effect/cli plus lourd qui n'a pas
      // pu être instrumenté dans le scope de la PR Phase 3.
      thresholds: { statements: 62, branches: 62, functions: 76, lines: 60 },
    }),
  },
});
