import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{spec,test}.ts'],
    coverage: coverageConfig({
      thresholds: { statements: 18, branches: 12, functions: 18, lines: 17 },
    }),
  },
});
