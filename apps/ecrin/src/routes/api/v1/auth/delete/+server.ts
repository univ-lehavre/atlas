import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { deleteUser } from '$lib/server/services/authService';
import { validateUserId } from '$lib/validators/server/auth';

export const POST: RequestHandler = withHandler(async ({ cookies, locals }) => {
  // Validate user ID
  const userId = validateUserId(locals.userId);

  // Delete user
  await deleteUser(userId, cookies);

  return { data: { deleted: true }, error: null };
});
