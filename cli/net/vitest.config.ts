import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: coverageConfig({
      // Seuils ≥ 80 % (objectif global) après : (1) tests du mode human de
      // `runDiagnostics` (spinner clack), (2) exclusion du bin entry point,
      // (3) `v8 ignore` sur l'orchestration @effect/cli non instrumentable.
      // Réel mesuré 2026-06-30 sur le code testable = 100/89.47/100/100.
      thresholds: { statements: 95, branches: 85, functions: 95, lines: 95 },
      // Bin entry point : 3 LOC qui n'appellent que `main()` — non testable en
      // unit (seul un e2e via process.argv le couvrirait). Même posture que
      // `services/crf` et `cli/crf`. Dérogation actée dans l'ADR 0019.
      exclude: ['src/bin/atlas-net.ts'],
    }),
  },
});
