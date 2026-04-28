import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    coverage: coverageConfig({
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    }),
  },
});
