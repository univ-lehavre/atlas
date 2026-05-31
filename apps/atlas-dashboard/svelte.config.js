import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defaultCspDirectives } from '@univ-lehavre/atlas-sveltekit-csp';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),

    // Content Security Policy — ajoutée Phase 9.2 pour parité DevSecOps
    // avec les autres apps SvelteKit du monorepo. Directives par défaut
    // de `@univ-lehavre/atlas-sveltekit-csp` ; voir packages/sveltekit-
    // csp/src/csp.ts pour la justification et la dérogation `style-src
    // 'unsafe-inline'` documentée dans ADR 0019. Aucun override : le
    // dashboard sert un `+page.server.ts` qui fetch côté serveur, le
    // browser ne fait aucun appel externe.
    csp: {
      mode: 'auto',
      directives: defaultCspDirectives(),
    },
  },
};

export default config;
