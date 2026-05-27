import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),

    // Content Security Policy — Phase 6.3 DevSecOps.
    // - `mode: 'auto'` : hash en prerender, nonce en SSR (adapter-node).
    // - `script-src 'self'` strict : SvelteKit injecte automatiquement des
    //   nonces dans ses scripts d'hydration ; tout autre script inline ou
    //   externe est bloqué.
    // - `style-src 'unsafe-inline'` : nécessaire pour les `style="..."` des
    //   templates Svelte et les utility classes Tailwind. À durcir plus tard.
    // - `connect-src 'self'` : aucune fetch client-side vers un service externe
    //   (les appels Appwrite/OpenAlex passent tous par les routes `/api/v1/`
    //   du serveur SvelteKit). Vérifié 2026-05-26 — pas d'import du SDK
    //   browser `appwrite`, uniquement `node-appwrite` côté serveur.
    csp: {
      mode: 'auto',
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:'],
        'font-src': ["'self'"],
        'connect-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'"],
        'base-uri': ["'self'"],
        'object-src': ["'none'"],
      },
    },
  },
};

export default config;
