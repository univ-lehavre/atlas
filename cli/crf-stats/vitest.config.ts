import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: coverageConfig({
      thresholds: { statements: 0, branches: 0, functions: 0, lines: 0 },
    }),
  },
});
