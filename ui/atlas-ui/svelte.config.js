import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Static adapter: the SvelteKit app exists only to host Storybook and
    // a minimal demo page. We never deploy this app — it's a workspace
    // package that re-exports Svelte components.
    adapter: adapter({ fallback: "index.html" }),
  },
};

export default config;
