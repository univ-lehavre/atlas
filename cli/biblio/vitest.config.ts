import { coverageConfig } from "@univ-lehavre/atlas-shared-config/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: coverageConfig({
      // Phase 3.2 — Seuils relevés à 95 après ajout de 7 tests couvrant
      // intégralement commands/index.ts. Réel mesuré 2026-05-30 : 100%
      // partout. Marge de 5 pts.
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    }),
  },
});
