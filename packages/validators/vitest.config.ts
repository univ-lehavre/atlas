import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: coverageConfig({
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    }),
  },
});
