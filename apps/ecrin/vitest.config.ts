import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: coverageConfig({
      // Phase 4.3 — Resserrés après ajout de 10 fichiers test endpoint
      // (200/401/payload malformé). Réel mesuré 2026-05-30 (post-Phase
      // 4) : 54.18/36.56/39.81/55.78.
      // Phase 13.3 — l'init Sentry opt-in dans hooks.server.ts/hooks.client.ts
      // ajoute des branches `if (dsn)` non couvertes en unit (init du SDK,
      // testable seulement avec injection d'env + mock SDK). branches
      // resserré 34 → 32 pour absorber ce nouveau dénominateur sans
      // masquer une régression réelle (réel ≈ 33.8 %). Voir ADR 0019.
      thresholds: { statements: 52, branches: 32, functions: 37, lines: 53 },
    }),
  },
  resolve: {
    alias: {
      $lib: path.resolve(__dirname, 'src/lib'),
      // Le code serveur lit ses secrets via `$lib/server/env` → `$env/dynamic/private`
      // (#324, migration depuis `$env/static/private`). Cette config n'a pas le
      // plugin SvelteKit pour fournir les modules virtuels `$env/dynamic/*`, on les
      // aliase vers des mocks : `env-dynamic-private.ts` porte les secrets de test
      // (et garde SENTRY_DSN absent → Sentry no-op, Phase 13.3).
      '$env/dynamic/private': path.resolve(__dirname, 'test-utils/env-dynamic-private.ts'),
      '$env/dynamic/public': path.resolve(__dirname, 'test-utils/env-dynamic-public.ts'),
    },
  },
});
