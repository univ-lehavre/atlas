import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: coverageConfig({
      thresholds: { statements: 67, branches: 51, functions: 70, lines: 67 },
    }),
  },
});
