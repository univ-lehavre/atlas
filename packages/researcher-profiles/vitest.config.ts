import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{spec,test}.ts'],
    coverage: {
      provider: 'v8',
      reporter: process.env.CI ? 'text' : ['text', 'html', 'json'],
      thresholds: { statements: 50, functions: 50 },
    },
  },
});
