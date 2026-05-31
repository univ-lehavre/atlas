import { coverageConfig } from "@univ-lehavre/atlas-shared-config/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: coverageConfig({
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts"],
      // Phase 9.2 — helper de configuration CSP partagé. Code purement
      // déclaratif (objets + merge) testé à fond. Seuils sur la cible
      // générale 80% (ADR 0019).
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    }),
  },
});
