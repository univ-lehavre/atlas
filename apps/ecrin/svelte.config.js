import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defaultCspDirectives } from '@univ-lehavre/atlas-sveltekit-csp';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),

    // Content Security Policy — Phase 6.3 DevSecOps, factorisée Phase 9.2.
    // Les directives par défaut viennent de `@univ-lehavre/atlas-sveltekit-csp`
    // (voir packages/sveltekit-csp/src/csp.ts pour la justification de
    // chaque directive et la dérogation `style-src 'unsafe-inline'`
    // documentée dans ADR 0019). Aucun override : ecrin n'appelle
    // aucun service externe depuis le browser (tous les appels Appwrite
    // passent par les routes `/api/v1/` du serveur SvelteKit ; vérifié
    // 2026-05-26 — pas d'import du SDK browser `appwrite`).
    csp: {
      mode: 'auto',
      directives: defaultCspDirectives(),
    },
  },
};

export default config;
