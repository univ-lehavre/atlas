import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: coverageConfig({
      thresholds: { statements: 55, branches: 55, functions: 50, lines: 55 },
    }),
  },
});
