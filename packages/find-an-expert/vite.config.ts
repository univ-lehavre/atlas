import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    sveltekit(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@univ-lehavre/atlas-logos/*.{png,svg}',
          dest: 'logos',
        },
      ],
    }),
  ],

  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  build: {
    // Swagger UI is ~1.6MB but loaded dynamically only on /api/docs
    chunkSizeWarningLimit: 1700,
  },

  test: {
    expect: { requireAssertions: true },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/**/*.test.ts',
        'src/lib/**/*.spec.ts',
        'src/lib/**/index.ts',
        'src/lib/**/*.d.ts',
      ],
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 34,
        lines: 50,
      },
    },

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
