import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: coverageConfig({
      thresholds: { statements: 70, branches: 75, functions: 60, lines: 70 },
    }),
  },
});
