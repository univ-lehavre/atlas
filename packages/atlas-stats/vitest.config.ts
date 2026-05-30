import { coverageConfig } from "@univ-lehavre/atlas-shared-config/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: coverageConfig({
      // Include élargi de `src/compute.ts` à tout `src/**`. Les seuils
      // ci-dessous sont temporairement abaissés à la couverture réelle
      // observée le 2026-05-30 (6.72 / 2.16 / 9.37 / 6.34) moins une marge
      // d'un point, le temps que la Phase 3 du plan de résorption ajoute
      // les tests manquants (cache.ts, cli.ts, github.ts, npm.ts).
      // Voir docs/decisions/0019-derogations-workspace-audit.md.
      include: ["src/**/*.ts"],
      thresholds: { statements: 6, branches: 2, functions: 9, lines: 6 },
    }),
  },
});
