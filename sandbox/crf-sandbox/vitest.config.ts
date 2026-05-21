import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Exclude contract tests by default (require Docker)
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/contract/**', 'tests/contract-amarre/**'],
    testTimeout: 30000, // 30s timeout for API calls
    hookTimeout: 30000,
    passWithNoTests: true, // All tests require Docker, so pass if none found
    coverage: coverageConfig({
      include: ['tests/**/*.{ts,tsx,js,jsx}'],
      thresholds: { statements: 0, branches: 0, functions: 0, lines: 0 },
    }),
  },
});
