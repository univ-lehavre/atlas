import type { Handle } from '@sveltejs/kit';
import { AppwriteException } from 'node-appwrite';

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

  // Security headers — Phase 6.3 DevSecOps. CSP est gérée par kit.csp dans
  // svelte.config.js (avec nonces auto pour les scripts d'hydration).
  if (event.url.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  // X-Frame-Options redondant avec CSP `frame-ancestors 'none'`, conservé
  // en defense-in-depth pour les vieux navigateurs.
  response.headers.set('X-Frame-Options', 'DENY');

  return response;
};
