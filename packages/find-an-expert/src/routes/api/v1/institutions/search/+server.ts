import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { searchInstitutions } from '$lib/server/openalex';
import { mapErrorToResponse } from '$lib/server/http';

/**
 * GET /api/v1/institutions/search
 * Searches for research institutions using the OpenAlex API.
 * @param q - Search query string (required)
 */
export const GET: RequestHandler = async ({ url }) => {
  try {
    const query = url.searchParams.get('q') ?? '';
    const results = await searchInstitutions(query);
    return json(results);
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
