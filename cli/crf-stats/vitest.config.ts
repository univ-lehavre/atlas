import { coverageConfig } from "@univ-lehavre/atlas-shared-config/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: coverageConfig({
      // Phase 3.5 — Seuils relevés après ajout de 36 tests (config, output,
      // commands). Réel mesuré 2026-05-30 : 94.90/91.66/95.00/96.59.
      // Marge de 3 pts.
      thresholds: { statements: 91, branches: 88, functions: 92, lines: 93 },
    }),
  },
});
