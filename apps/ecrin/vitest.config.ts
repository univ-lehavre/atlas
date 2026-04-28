import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: coverageConfig(),
  },
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
      '$env/static/private': path.resolve(__dirname, 'test-utils/env-mocks.ts'),
    },
  },
});
