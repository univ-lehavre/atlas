import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { performHealthCheck } from '$lib/server/health';

/**
 * GET /api/v1/health
 * Returns health status of all services (Appwrite, internet connectivity).
 */
export const GET: RequestHandler = async () => {
  const health = await performHealthCheck();

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return json(health, { status: statusCode });
};
