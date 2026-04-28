import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    coverage: coverageConfig({
      thresholds: { statements: 100, branches: 60, functions: 100, lines: 100 },
    }),
  },
});
