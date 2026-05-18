import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: coverageConfig({
      include: ['src/core/comparator.ts'],
      thresholds: { statements: 80, branches: 55, functions: 80, lines: 80 },
    }),
  },
});
