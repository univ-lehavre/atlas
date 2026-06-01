import { coverageConfig } from "@univ-lehavre/atlas-shared-config/vitest";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// atlas-ui is the shared Svelte 5 component library. It is NOT a
// SvelteKit app, so there's no `vite.config.ts` to merge with — we build
// a standalone Vitest config here.
//
// Level-1 component tests (cf. the test pyramid in apps/amarre/tests/
// README.md) render components through happy-dom + the
// @testing-library/svelte `mount` API. They live in `tests/` and split
// into two flavours :
//   - `*.test.ts`      : behaviour / DOM-contract tests.
//   - `*.a11y.test.ts` : axe-core accessibility assertions (vitest-axe).
//
// Both flavours need the same runtime (happy-dom + browser-resolved
// Svelte), so a single project covers them.
//
// Some components import SvelteKit-scoped modules (`$app/forms`'s
// `enhance`). We're not running the SvelteKit plugin here, so we alias
// that import to the same no-op stub Storybook uses for visual review
// (.storybook/stubs/app-forms.ts).
export default defineConfig({
  // Cast through `unknown`: @sveltejs/vite-plugin-svelte pins Vite 7's
  // `Plugin` type while we run Vite 8. The structural diff is a no-op at
  // runtime (same as .storybook/main.ts does for the Storybook preset).
  plugins: [svelte() as unknown as import("vite").PluginOption],
  resolve: {
    // Svelte 5 ships an SSR build by default in Node. That build explodes
    // with `lifecycle_function_unavailable` as soon as
    // @testing-library/svelte tries to `mount(...)`. Force the browser
    // build for component tests.
    conditions: ["browser"],
    alias: {
      "$app/forms": fileURLToPath(
        new URL("./.storybook/stubs/app-forms.ts", import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    coverage: coverageConfig({
      // Count the rendered Svelte components. Without this, level-1 tests
      // execute but their coverage isn't measured (v8 only tracks files
      // in `include`, and the shared default is ts/tsx/js/jsx only). The
      // shared default `exclude` already drops `*.test.ts`,
      // `*.a11y.test.ts` and `*.d.ts`.
      include: ["src/lib/**/*.{ts,svelte}"],
      // Stories are visual review scaffolding, not shipped code.
      exclude: ["src/lib/**/*.stories.*"],
    }),
  },
});
