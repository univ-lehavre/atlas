import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { fetchGlobalGraph } from '$lib/server/services/graphsService';

export const GET: RequestHandler = withHandler(async ({ locals }) => {
  const id = locals.userId;
  if (!id) throw new ApplicationError('unauthenticated', 401, 'No authenticated user');
  const graph = await fetchGlobalGraph();
  console.log(graph);
  return { data: { graph }, error: null };
});
