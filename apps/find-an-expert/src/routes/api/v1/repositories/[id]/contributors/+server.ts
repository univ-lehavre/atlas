import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { flatErrorMapper } from '$lib/server/http';

interface ContributorsResponse {
  contributors: never[];
  message: string;
}

/**
 * GET /api/v1/repositories/:id/contributors
 * Returns the list of contributors. Stub endpoint, full implementation pending.
 */
export const GET: RequestHandler = withHandler(
  async (): Promise<ContributorsResponse> => ({
    contributors: [],
    message: 'Contributors endpoint not yet implemented',
  }),
  { mapError: flatErrorMapper }
);
