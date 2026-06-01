import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

// Merge vitest with the vite/SvelteKit config so the SvelteKit plugin
// transforms `.ts` sources (and resolves `$lib`/`$env/*` aliases) during
// the coverage remap step. Without it, vitest's v8 coverage provider hands
// the raw `hooks.server.ts` to rolldown, which can't parse `import type {`
// and aborts the run (cf. Phase 9.2 — the only test here is the security
// headers assertion on `hooks.server.ts`).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      passWithNoTests: true,
      coverage: coverageConfig({
        // Dashboard interne `private: true` (ADR 0011 / 0019) : exempté de
        // seuils. Seul `hooks.server.ts` est testé (security headers).
        thresholds: { statements: 0, branches: 0, functions: 0, lines: 0 },
      }),
    },
  })
);
