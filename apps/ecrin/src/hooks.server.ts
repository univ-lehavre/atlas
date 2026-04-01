import { SessionError } from '$lib/errors';
import { createSessionClient } from '$lib/appwrite/server';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  try {
    const { account } = createSessionClient(event.cookies);
    const user = await account.get();
    event.locals.userId = user.$id;
  } catch (error) {
    // Ne pas lancer l'erreur ici pour éviter de faire planter toute la requête.
    // On considère l'utilisateur comme non authentifié si la récupération échoue.
    if (!(error instanceof SessionError))
      console.error('Unexpected error while retrieving session', error);
  }
  const response = await resolve(event);
  return response;
};
