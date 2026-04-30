import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{spec,test}.ts'],
    coverage: coverageConfig({
      thresholds: { statements: 12, branches: 9, functions: 11, lines: 12 },
    }),
  },
});
