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
      // 'json' requis dans les deux modes pour que `coverage-final.json`
      // soit lu par `scripts/audit/coverage-report.mjs`. 'lcov' conservé
      // en local pour les éventuels outils tiers ; le default de
      // shared-config est aussi ['text', 'json'] en CI.
      reporter: process.env.CI ? ['text', 'json'] : ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './coverage',
      // Phase 2.3 — include élargi à `src/**` pour mesurer aussi
      // routes/, endpoints et hooks.server.ts. Avant : seul `src/lib/**`
      // était mesuré, les routes restaient invisibles.
      include: ['src/**/*.{ts,svelte}'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/index.ts', 'src/**/*.d.ts'],
      // Phase 4.4 — Resserrés après ajout de 14 fichiers test endpoint
      // (200/401/anti-XSS sur 8 endpoints, payload malformé).
      // Réel mesuré 2026-05-30 (post-Phase 4) :
      // 24.80/14.58/17.89/27.38. Marge de 2 pts.
      thresholds: {
        statements: 22,
        branches: 12,
        functions: 15,
        lines: 25,
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
