import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchGraphForRecord } from '$lib/server/services/graphsService';

// Public endpoint: requires `record` query param, no auth
export const GET: RequestHandler = async ({ url }) => {
  try {
    const id = url.searchParams.get('record');
    if (!id)
      return json(
        { data: null, error: { code: 'missing_parameter', message: 'Missing record parameter' } },
        { status: 400 }
      );
    const graph = await fetchGraphForRecord(id);
    console.log(graph);
    return json({ data: { graph }, error: null });
  } catch {
    return json(
      { data: null, error: { code: 'internal_error', message: 'Unexpected error' } },
      { status: 500 }
    );
  }
};
