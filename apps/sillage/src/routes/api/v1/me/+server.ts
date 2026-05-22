import { json } from '@sveltejs/kit';

import { mapErrorToResponse } from '$lib/errors/mapper';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return json(
        { data: null, error: { code: 'unauthenticated', message: 'User not authenticated' } },
        { status: 401 }
      );
    }
    // Phase 4 : pas encore de profil REDCap (phase 6) — on renvoie
    // juste l'userId Appwrite, suffisant pour le hooks.server.ts +
    // /api/v1/me consumer côté homepage.
    return json({ data: { userId }, error: null });
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
