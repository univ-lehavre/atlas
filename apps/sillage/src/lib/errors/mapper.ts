import { json } from '@sveltejs/kit';
import { mapErrorToApiResponse } from '@univ-lehavre/atlas-errors';

export const mapErrorToResponse = (error: unknown): Response => {
  const { body, status } = mapErrorToApiResponse(error);
  return json(body, { status });
};
