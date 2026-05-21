import type { StorybookConfig } from "@storybook/svelte-vite";
import { fileURLToPath } from "node:url";

const here = (p: string): string =>
  fileURLToPath(new URL(`./stubs/${p}`, import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/lib/**/*.stories.@(ts|svelte)"],
  framework: "@storybook/svelte-vite",
  typescript: {
    check: false,
  },
  // Components depend on a handful of SvelteKit-scoped modules. We're
  // running plain `@storybook/svelte-vite` (not the SvelteKit framework)
  // to dodge the vite-plugin-svelte v7 peer-dep mismatch, so we stub
  // those imports with minimal local versions in `./stubs/`. The
  // contract used by the components is read-only (`resolve` returns
  // the path, `enhance` is a no-op) — enough for visual review.
  viteFinal: async (cfg) => {
    cfg.resolve = {
      ...cfg.resolve,
      alias: {
        ...(cfg.resolve?.alias ?? {}),
        "$app/paths": here("app-paths.ts"),
        "$app/forms": here("app-forms.ts"),
      },
    };
    return cfg;
  },
};

export default config;
