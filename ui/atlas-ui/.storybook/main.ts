import type { StorybookConfig } from "@storybook/sveltekit";
import type { Plugin } from "vite";

/**
 * Storybook 10 still declares `@sveltejs/vite-plugin-svelte: ^2-6` as a
 * peer ; we run v7 (latest SvelteKit). Two interactions break out of
 * the box, both worked around in `viteFinal` :
 *
 *   1. esbuild pre-bundle can't load Storybook's internal `.svelte`
 *      files (`PreviewRender.svelte`, etc.). `optimizeDeps.exclude`
 *      routes them through the regular Vite/Svelte pipeline.
 *
 *   2. `@storybook/sveltekit` ships `.svelte.js` files that use Svelte
 *      5 runes (`$state` in `app-state-mock.svelte.js`). They live in
 *      node_modules so vite-plugin-svelte's default include skips them,
 *      and Svelte then errors at runtime with `rune_outside_svelte`.
 *      The custom plugin below catches those files and runs them
 *      through `svelte/compiler#compileModule`, which is exactly what
 *      vite-plugin-svelte would do if its include caught them.
 */
const compileStorybookRuneMocks = (): Plugin => ({
  name: "compile-storybook-rune-mocks",
  enforce: "pre",
  async transform(code, id) {
    if (!id.includes("@storybook/sveltekit")) return null;
    if (!id.endsWith(".svelte.js") && !id.endsWith(".svelte.ts")) return null;
    const { compileModule } = await import("svelte/compiler");
    const result = compileModule(code, { filename: id, generate: "client" });
    return { code: result.js.code, map: result.js.map };
  },
});

const config: StorybookConfig = {
  stories: ["../src/lib/**/*.stories.@(ts|svelte)"],
  framework: "@storybook/sveltekit",
  typescript: {
    check: false,
  },
  viteFinal: async (cfg) => {
    cfg.optimizeDeps = {
      ...cfg.optimizeDeps,
      exclude: [
        ...(cfg.optimizeDeps?.exclude ?? []),
        "@storybook/svelte",
        "@storybook/sveltekit",
      ],
    };
    cfg.plugins = [compileStorybookRuneMocks(), ...(cfg.plugins ?? [])];
    return cfg;
  },
};

export default config;
