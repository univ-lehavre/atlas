import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{spec,test}.ts'],
    coverage: coverageConfig({
      thresholds: { statements: 90, branches: 80, functions: 90, lines: 90 },
    }),
  },
});
