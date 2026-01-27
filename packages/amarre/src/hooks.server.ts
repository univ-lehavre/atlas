import type { Handle } from '@sveltejs/kit';
import { AppwriteException } from 'node-appwrite';

import { SessionError } from '$lib/errors';
import { createSessionClient } from '$lib/server/appwrite';

export const handle: Handle = async ({ event, resolve }) => {
  try {
    const { account } = createSessionClient(event.cookies);
    const user = await account.get();
    event.locals.userId = user.$id;
  } catch (error: unknown) {
    // Ne pas lancer l'erreur ici pour éviter de faire planter toute la requête.
    // On considère l'utilisateur comme non authentifié si la récupération échoue.
    const isSessionError = error instanceof SessionError;
    const isAppwriteAuthError = error instanceof AppwriteException && error.code === 401;
    if (!isSessionError && !isAppwriteAuthError) {
      console.error('Unexpected error while retrieving session', error);
    }
  }
  const response = await resolve(event);
  return response;
};
