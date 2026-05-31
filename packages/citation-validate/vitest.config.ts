import { coverageConfig } from "@univ-lehavre/atlas-shared-config/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: coverageConfig({
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    }),
  },
});
