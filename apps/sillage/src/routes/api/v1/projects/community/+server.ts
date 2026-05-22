import { json } from '@sveltejs/kit';

import { mapErrorToResponse } from '$lib/errors/mapper';
import { getCommunityProjects } from '$lib/server/services/projects';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch }) => {
  try {
    const projects = await getCommunityProjects({ fetch });
    return json({ data: projects, error: null });
  } catch (error: unknown) {
    return mapErrorToResponse(error);
  }
};
