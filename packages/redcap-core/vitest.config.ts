import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    coverage: coverageConfig({
      thresholds: { statements: 91, branches: 91, functions: 96, lines: 90 },
    }),
  },
});
