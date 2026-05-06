import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: coverageConfig({
      include: ['src/compute.ts'],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    }),
  },
});
