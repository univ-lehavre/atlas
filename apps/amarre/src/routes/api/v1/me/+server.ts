import { createMeHandler } from '@univ-lehavre/atlas-auth';
import { getProfile } from '$lib/server/services/profile';

export const GET = createMeHandler({ getProfile });
