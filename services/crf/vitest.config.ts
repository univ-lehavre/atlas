import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: coverageConfig({
      // Phase 2.4 — Seuils maintenus tels quels : déjà collés au réel
      // (17.54/14.70/24.56/18.29 mesuré le 2026-05-30). Le renforcement
      // est l'objet de la Phase 3.1 (cible : 70% statements minimum
      // — c'est le seul microservice exposé du dépôt).
      // Voir docs/decisions/0019-derogations-workspace-audit.md.
      thresholds: { statements: 17, branches: 14, functions: 24, lines: 18 },
    }),
  },
});
