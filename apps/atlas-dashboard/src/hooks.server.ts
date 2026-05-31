import type { Handle } from '@sveltejs/kit';
import { applySecurityHeaders } from '@univ-lehavre/atlas-sveltekit-csp';

/**
 * Atlas-dashboard est un dashboard interne `private: true` (ADR 0011),
 * pas déployé en prod. Ajouté en Phase 9.2 pour cohérence DevSecOps :
 * tout le monorepo SvelteKit applique les mêmes security headers via
 * `@univ-lehavre/atlas-sveltekit-csp`. Aucune logique de session ici
 * (le dashboard est en lecture seule de stats publiques).
 */
export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  applySecurityHeaders(response, event);
  return response;
};
