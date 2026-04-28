import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: coverageConfig({
      include: ['src/compute.ts'],
      thresholds: { statements: 70, branches: 70, functions: 70, lines: 70 },
    }),
  },
});
