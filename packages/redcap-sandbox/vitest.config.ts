import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Exclude contract tests by default (require Docker)
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/contract/**'],
    testTimeout: 30000, // 30s timeout for API calls
    hookTimeout: 30000,
    passWithNoTests: true, // All tests require Docker, so pass if none found
  },
});
