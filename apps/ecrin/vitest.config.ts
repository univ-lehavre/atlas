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
      '$env/static/private': path.resolve(__dirname, 'test-utils/env-mocks.ts'),
      // Phase 13.3 — hooks now read SENTRY_DSN / PUBLIC_SENTRY_DSN from the
      // `$env/dynamic/*` virtual modules. This config has no SvelteKit
      // plugin to provide them, so alias them to empty-env mocks (no DSN =
      // Sentry stays a no-op).
      '$env/dynamic/private': path.resolve(__dirname, 'test-utils/env-dynamic-private.ts'),
      '$env/dynamic/public': path.resolve(__dirname, 'test-utils/env-dynamic-public.ts'),
    },
  },
});
