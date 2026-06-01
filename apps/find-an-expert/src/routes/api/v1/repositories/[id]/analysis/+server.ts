import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { flatErrorMapper } from '$lib/server/http';

interface AnalysisResponse {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message: string;
}

/**
 * POST /api/v1/repositories/:id/analysis
 * Triggers a repository analysis. Stub endpoint, full implementation pending.
 */
export const POST: RequestHandler = withHandler(
  async (): Promise<AnalysisResponse> => ({
    status: 'pending',
    message: 'Analysis endpoint not yet implemented',
  }),
  { mapError: flatErrorMapper, successStatus: 202 }
);
