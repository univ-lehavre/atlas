import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: coverageConfig({
      // Phase 3.1 — Seuils relevés après ajout des tests d'intégration
      // routes (app, health, users, project, records, rate-limit).
      // Réel mesuré 2026-05-30 : 93.56/89.70/96.49/93.29.
      // Marge de 3 pts pour absorber la volatilité du mock client REDCap.
      thresholds: { statements: 90, branches: 86, functions: 93, lines: 90 },
    }),
  },
});
