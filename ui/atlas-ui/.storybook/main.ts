import type { StorybookConfig } from "@storybook/sveltekit";

const config: StorybookConfig = {
  stories: ["../src/lib/**/*.stories.@(ts|svelte)"],
  framework: "@storybook/sveltekit",
  typescript: {
    check: false,
  },
  // Storybook 10 still declares `@sveltejs/vite-plugin-svelte: ^2-6` as
  // a peer ; we run v7 (latest SvelteKit). The mismatch makes Vite's
  // esbuild pre-bundle choke on the `.svelte` files Storybook ships
  // internally (`PreviewRender.svelte`, etc.) because esbuild has no
  // loader for that extension. Excluding the Storybook packages from
  // pre-bundling lets the regular Vite/Svelte pipeline handle them.
  viteFinal: async (cfg) => {
    cfg.optimizeDeps = {
      ...cfg.optimizeDeps,
      exclude: [
        ...(cfg.optimizeDeps?.exclude ?? []),
        "@storybook/svelte",
        "@storybook/sveltekit",
      ],
    };
    return cfg;
  },
};

export default config;
