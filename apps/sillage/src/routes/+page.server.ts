import { mockResearcherPool } from '$lib/mocks/researchers';
import { mockProjectPool, priorityQuestionnaires } from '$lib/mocks/projects';
import { applyGating } from '$lib/server/gating';
import { shuffle } from '$lib/utils/shuffle';
import { EMPTY_PROFILE_STATE, type ProfileState } from '$lib/types/api/profile';

import type { PageServerLoad } from './$types';

const readProfileState = async (fetch: typeof globalThis.fetch): Promise<ProfileState> => {
  try {
    const res = await fetch('/api/v1/profile/state');
    if (!res.ok) return EMPTY_PROFILE_STATE;
    const payload = (await res.json()) as {
      data: ProfileState | null;
      error: unknown;
    };
    return payload.data ?? EMPTY_PROFILE_STATE;
  } catch {
    // REDCap unreachable / fresh user / dict mismatch — fall back to
    // empty so the home renders the default gating (only researcher_
    // profile active).
    return EMPTY_PROFILE_STATE;
  }
};

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const baseData = {
    userId: locals.userId ?? null,
    researchers: shuffle(mockResearcherPool),
    projects: shuffle(mockProjectPool),
  };

  if (!locals.userId) {
    // Anonymous : the gating doesn't matter (questionnaires aren't
    // rendered), but we still pass the default list for consumers
    // that may inspect the data shape.
    return {
      ...baseData,
      profileState: EMPTY_PROFILE_STATE,
      questionnaires: applyGating(priorityQuestionnaires, EMPTY_PROFILE_STATE),
    };
  }

  const profileState = await readProfileState(fetch);
  return {
    ...baseData,
    profileState,
    questionnaires: applyGating(priorityQuestionnaires, profileState),
  };
};
