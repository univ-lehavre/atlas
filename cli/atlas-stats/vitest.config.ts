import { coverageConfig } from "@univ-lehavre/atlas-shared-config/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: coverageConfig({
      // Phase 3.4 — Seuils relevés après ajout de 39 tests (config, output,
      // commands). Réel mesuré 2026-05-30 : 94.73/90.36/90.00/94.52.
      // Marge de 3 pts.
      thresholds: { statements: 91, branches: 87, functions: 87, lines: 91 },
    }),
  },
});
