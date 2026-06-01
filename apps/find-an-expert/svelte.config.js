import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defaultCspDirectives } from '@univ-lehavre/atlas-sveltekit-csp';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),

    // Content Security Policy — Phase 6.3 DevSecOps, factorisée Phase 9.2.
    // Les directives par défaut viennent de `@univ-lehavre/atlas-sveltekit-csp`
    // (voir packages/sveltekit-csp/src/csp.ts pour la justification de
    // chaque directive et la dérogation `style-src 'unsafe-inline'`
    // documentée dans ADR 0019). Aucun override : find-an-expert
    // n'appelle aucun service externe depuis le browser (tous les appels
    // Appwrite passent par les routes `/api/v1/` du serveur SvelteKit).
    csp: {
      mode: 'auto',
      directives: defaultCspDirectives(),
    },
  },
};

export default config;
