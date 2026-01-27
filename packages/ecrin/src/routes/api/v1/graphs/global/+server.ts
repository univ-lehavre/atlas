import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchGlobalGraph } from '$lib/server/services/graphsService';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    const id = locals.userId;
    if (!id)
      return json(
        { data: null, error: { code: 'unauthenticated', message: 'No authenticated user' } },
        { status: 401 }
      );
    const graph = await fetchGlobalGraph();
    console.log(graph);
    return json({ data: { graph }, error: null });
  } catch {
    return json(
      { data: null, error: { code: 'internal_error', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
};
