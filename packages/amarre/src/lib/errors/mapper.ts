import { json } from '@sveltejs/kit';
import { mapErrorToApiResponse } from '@univ-lehavre/atlas-errors';

/**
 * Maps an error to a SvelteKit JSON Response.
 * Uses the shared mapErrorToApiResponse and wraps it in json().
 */
export const mapErrorToResponse = (error: unknown): Response => {
  const { body, status } = mapErrorToApiResponse(error);
  return json(body, { status });
};
