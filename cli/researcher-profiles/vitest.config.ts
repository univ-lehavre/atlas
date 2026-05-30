import { coverageConfig } from "@univ-lehavre/atlas-shared-config/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: coverageConfig({
      // Phase 3.6 — Seuils relevés après ajout de 103 tests sur 9 fichiers
      // commands/prompts/output. Réel mesuré 2026-05-30 :
      // 94.49/88.14/86.53/95.33. Marge de 3 pts (functions plus large
      // car certains chemins quota/showQuota peu testés).
      thresholds: { statements: 91, branches: 85, functions: 83, lines: 92 },
    }),
  },
});
