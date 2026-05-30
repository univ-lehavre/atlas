import { coverageConfig } from "@univ-lehavre/atlas-shared-config/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: coverageConfig({
      // Phase 3.7 — Seuils relevés après ajout de 47 tests sur cache, cli,
      // github, npm. Réel mesuré 2026-05-30 : 95.96/89.18/100.00/96.97.
      // Marge de 3 pts.
      include: ["src/**/*.ts"],
      thresholds: { statements: 92, branches: 86, functions: 95, lines: 93 },
    }),
  },
});
