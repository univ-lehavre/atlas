import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],

  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  build: {
    // Swagger UI is ~1.6MB but loaded dynamically only on /api/docs
    chunkSizeWarningLimit: 1700,
  },

  test: {
    expect: { requireAssertions: true },

    coverage: coverageConfig({
      reporter: process.env.CI ? 'text' : ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/**/*.test.ts',
        'src/lib/**/*.spec.ts',
        'src/lib/**/index.ts',
        'src/lib/**/*.d.ts',
      ],
      // Seuils baissés après dédup validators (les branches de validation ont
      // migré dans @univ-lehavre/atlas-auth, hors périmètre de coverage local).
      // À remonter en migrant aussi les tests des validators dans le package.
      thresholds: {
        statements: 58,
        branches: 41,
        functions: 40,
        lines: 58,
      },
    }),

    projects: [
      {
        extends: './vite.config.ts',

        test: {
          name: 'server',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.a11y.{test,spec}.{js,ts}'],
        },
      },
      {
        extends: './vite.config.ts',

        test: {
          name: 'a11y',
          environment: 'jsdom',
          include: ['src/**/*.a11y.{test,spec}.{js,ts}'],
        },
      },
    ],
  },
});
