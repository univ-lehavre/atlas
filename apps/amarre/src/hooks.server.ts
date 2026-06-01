import type { Handle } from '@sveltejs/kit';
import { AppwriteException } from 'node-appwrite';
import { applySecurityHeaders } from '@univ-lehavre/atlas-sveltekit-csp';

import { SessionError } from '$lib/errors';
import { createSessionClient } from '$lib/server/baas';

export const handle: Handle = async ({ event, resolve }) => {
  try {
    const { account } = createSessionClient(event.cookies);
    const user = await account.get();
    event.locals.userId = user.$id;
  } catch (error: unknown) {
    // Ne pas lancer l'erreur ici pour éviter de faire planter toute la requête.
    // On considère l'utilisateur comme non authentifié si la récupération échoue.
    const isSessionError = error instanceof SessionError;
    const isBaasAuthError = error instanceof AppwriteException && error.code === 401;
    if (!isSessionError && !isBaasAuthError) {
      console.error('Unexpected error while retrieving session', error);
    }
  }
  const response = await resolve(event);

  // Security headers — Phase 6.3 DevSecOps, factorisée Phase 9.2.
  // CSP est gérée par kit.csp dans svelte.config.js (avec nonces auto
  // pour les scripts d'hydration). Les cinq autres headers statiques
  // viennent de `@univ-lehavre/atlas-sveltekit-csp` pour rester alignés
  // entre toutes les apps SvelteKit du monorepo.
  applySecurityHeaders(response, event);

  return response;
};
