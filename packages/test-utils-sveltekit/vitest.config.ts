import { coverageConfig } from "@univ-lehavre/atlas-shared-config/vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: coverageConfig({
      include: ["src/**/*.ts"],
      // Phase 4.2 — Réel mesuré 2026-05-30 : 85.71/100/40/85.
      // Functions à 40 parce que `noopCookies.{get,getAll,set,delete,
      // serialize}` (5 stubs requis par le type SvelteKit) ne sont
      // jamais appelés par les tests — ils existent juste pour
      // satisfaire la signature de `RequestEvent['cookies']`. À
      // remonter si on ajoute des stubs réellement invoqués.
      thresholds: { statements: 80, branches: 95, functions: 35, lines: 80 },
    }),
  },
});
