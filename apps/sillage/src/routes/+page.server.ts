import { mockResearcherPool } from '$lib/mocks/researchers';
import { mockProjectPool, priorityQuestionnaires } from '$lib/mocks/projects';
import { shuffle } from '$lib/utils/shuffle';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  return {
    userId: locals.userId ?? null,
    // Anonymous home : full pool, shuffled (component slices to 8 + rotates).
    researchers: shuffle(mockResearcherPool),
    // Authenticated home : pre-shuffled, the carousel takes the first 3.
    // Shuffling server-side keeps the random seed consistent for the
    // SSR + hydration roundtrip (no hydration mismatch).
    projects: shuffle(mockProjectPool),
    questionnaires: priorityQuestionnaires,
  };
};
