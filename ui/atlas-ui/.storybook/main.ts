import type { StorybookConfig } from "@storybook/svelte-vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Plugin, PluginOption } from "vite";

const here = (p: string): string =>
  fileURLToPath(new URL(`./stubs/${p}`, import.meta.url));

/**
 * Storybook 10 declares `@sveltejs/vite-plugin-svelte: ^2-6` as a peer ;
 * we run v7. vite-plugin-svelte's default include skips `node_modules`,
 * so Storybook's internal `.svelte` / `.svelte.js` files
 * (`PreviewRender.svelte`, `app-state-mock.svelte.js`, etc.) reach the
 * browser uncompiled.
 *
 * We intercept them at the `load` hook (before Vite's import-analysis
 * looks at them) and hand back compiled JS, then let `transform` apply
 * the same fix to any second-pass invocation.
 */
const compileStorybookSvelteAssets = (): Plugin => {
  const matches = (id: string): "module" | "component" | null => {
    if (!id.includes("@storybook/")) return null;
    if (id.endsWith(".svelte.js") || id.endsWith(".svelte.ts")) return "module";
    if (id.endsWith(".svelte")) return "component";
    return null;
  };
  const compile = async (
    code: string,
    id: string,
    kind: "module" | "component",
  ): Promise<{ code: string; map: import("vite").Rollup.SourceMapInput }> => {
    const { compile: c, compileModule } = await import("svelte/compiler");
    const result =
      kind === "module"
        ? compileModule(code, { filename: id, generate: "client" })
        : c(code, { filename: id, generate: "client" });
    return {
      code: result.js.code,
      map: result.js.map as import("vite").Rollup.SourceMapInput,
    };
  };
  return {
    name: "compile-storybook-svelte-assets",
    enforce: "pre",
    async load(id) {
      const kind = matches(id);
      if (!kind) return null;
      const raw = await readFile(id, "utf-8");
      return compile(raw, id, kind);
    },
  };
};

const config: StorybookConfig = {
  stories: ["../src/lib/**/*.stories.@(ts|svelte)"],
  framework: "@storybook/svelte-vite",
  addons: ["@storybook/addon-a11y"],
  typescript: {
    check: false,
  },
  // Components depend on a handful of SvelteKit-scoped modules. We're
  // running plain `@storybook/svelte-vite` (not the SvelteKit framework)
  // so we stub those imports with minimal local versions in `./stubs/`.
  // The contract used by the components is read-only (`resolve` returns
  // the path, `enhance` is a no-op) — enough for visual review.
  viteFinal: async (cfg) => {
    // `@storybook/svelte-vite` doesn't auto-add vite-plugin-svelte ; the
    // preset only installs storybook's docgen plugin, which then tries
    // to parse raw `.svelte` source as JS and bombs ("Expression
    // expected") unless the svelte plugin compiles the file first.
    // Inject it explicitly so user components compile.
    // Cast via `unknown` because @storybook/svelte-vite's types pin
    // Vite 6's `Plugin` while our runtime is Vite 8 ; the structural
    // diff (HotUpdatePluginContext) tsc flags is a no-op at runtime.
    cfg.plugins = [
      ...([
        compileStorybookSvelteAssets(),
        svelte(),
      ] as unknown as PluginOption[]),
      ...(cfg.plugins ?? []),
    ];
    cfg.resolve = {
      ...cfg.resolve,
      alias: {
        ...cfg.resolve?.alias,
        "$app/paths": here("app-paths.ts"),
        "$app/forms": here("app-forms.ts"),
      },
    };
    return cfg;
  },
};

export default config;
