import { mockResearcherPool } from '$lib/mocks/researchers';
import { shuffle } from '$lib/utils/shuffle';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  return {
    userId: locals.userId ?? null,
    researchers: shuffle(mockResearcherPool),
  };
};
