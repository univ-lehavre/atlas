import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["*.test.{ts,js}"],
    coverage: {
      provider: "v8",
      include: [],
      thresholds: { statements: 0, branches: 0, functions: 0, lines: 0 },
    },
  },
});
