import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['vitest/**/*.test.{ts,js}'],
    coverage: {
      provider: 'v8',
      include: ['vitest/index.js'],
      thresholds: { statements: 90, branches: 80, functions: 100, lines: 90 },
    },
  },
});
