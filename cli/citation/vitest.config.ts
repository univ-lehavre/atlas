import { coverageConfig } from "@univ-lehavre/atlas-shared-config/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: coverageConfig({
      // Phase 3.3 — Seuils relevés après ajout de 20 tests (config/args,
      // prompts, commands). Réel mesuré 2026-05-30 :
      // 98.13/93.75/96.07/98.01. Marge de 3 pts.
      thresholds: { statements: 95, branches: 90, functions: 93, lines: 95 },
    }),
  },
});
