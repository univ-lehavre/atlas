import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: process.env.CI ? 'text' : ['text', 'html', 'json'],
      thresholds: { statements: 95, functions: 95 },
    },
  },
});
