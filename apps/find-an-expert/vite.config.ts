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
      // Phase 2.3 — Seuils à (réel mesuré 2026-05-30 avec include
      // élargi à `src/**/*.{ts,svelte}` − 2 pts) :
      // 19.34/10.86/14.31/21.10. La baisse vs avant (~58/41/40/58)
      // vient du dénominateur ×4 : `src/routes/**` et composants
      // Svelte étaient invisibles auparavant. Renforcement en Phase 3.
      // Voir docs/decisions/0019-derogations-workspace-audit.md.
      thresholds: {
        statements: 17,
        branches: 8,
        functions: 12,
        lines: 19,
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
