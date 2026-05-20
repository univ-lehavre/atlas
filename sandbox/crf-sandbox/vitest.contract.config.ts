import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Match the generic REDCap contract tests AND the amarre-specific
    // ones. They share fixtures + the REDCap-up prerequisite, so the
    // same vitest config covers both. To run only the amarre subset,
    // use `pnpm test:contract:amarre`.
    include: ['tests/contract/**/*.test.ts', 'tests/contract-amarre/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
