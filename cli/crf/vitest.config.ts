import { coverageConfig } from '@univ-lehavre/atlas-shared-config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: coverageConfig({
      // Seuils ≥ 80 % (objectif global) après exclusion des bin entry points :
      // réel mesuré 2026-06-30 sur le code métier seul = 90.21/80.48/97.56/89.69.
      // Marge ~1-2 pts pour absorber la volatilité du mock client REDCap.
      thresholds: { statements: 88, branches: 80, functions: 95, lines: 88 },
      // Bin entry points @effect/cli : orchestration pure (Command.make +
      // Command.run + serve()/Effect.never), non instrumentable en unit — la
      // logique testable est extraite dans `commands.ts` (couverte). Même
      // posture que `services/crf` (exclut `src/server/index.ts`). Dérogation
      // actée dans l'ADR 0019.
      exclude: ['src/commands/api/index.ts', 'src/commands/server/index.ts'],
    }),
  },
});
