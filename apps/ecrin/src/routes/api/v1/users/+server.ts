import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { listUsersFromCrf } from '$lib/server/services/userService';

// Migration vers `withHandler` (Phase 9.1) :
// - 401 `unauthenticated` quand `locals.userId` est absent (préservé),
// - 500 mappé par `@univ-lehavre/atlas-errors` quand le service amont
//   échoue (le message est désormais celui de l'erreur, et non plus
//   la chaîne générique 'Unexpected error' qui masquait l'origine).
export const GET: RequestHandler = withHandler(async ({ locals, fetch }) => {
  if (!locals.userId) throw new ApplicationError('unauthenticated', 401, 'User not authenticated');

  const users = await listUsersFromCrf(fetch);
  return { data: users, error: null };
});
