import { mockResearcherPool } from '$lib/mocks/researchers';
import { mockProjectPool, priorityQuestionnaires } from '$lib/mocks/projects';
import { applyGating } from '$lib/server/gating';
import { shuffle } from '$lib/utils/shuffle';
import { EMPTY_PROFILE_STATE, type ProfileState } from '$lib/types/api/profile';
import type { CommunityProjectList } from '$lib/types/api/community-project';

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
    return EMPTY_PROFILE_STATE;
  }
};

const readCommunityProjects = async (
  fetch: typeof globalThis.fetch
): Promise<CommunityProjectList> => {
  try {
    const res = await fetch('/api/v1/projects/community');
    if (!res.ok) return [];
    const payload = (await res.json()) as {
      data: CommunityProjectList | null;
      error: unknown;
    };
    return payload.data ?? [];
  } catch {
    return [];
  }
};

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const researchers = shuffle(mockResearcherPool);

  // Community projects : primary source is REDCap (validated
  // `project_proposal` records). Until enough records exist, we fall
  // back to the curated mock pool so the carousel still has something
  // to show — explicit log on the server side so the operator knows.
  const fromRedcap = await readCommunityProjects(fetch);
  const projects = shuffle(
    fromRedcap.length > 0 ? fromRedcap : (mockProjectPool as CommunityProjectList)
  );

  const baseData = {
    userId: locals.userId ?? null,
    researchers,
    projects,
  };

  if (!locals.userId) {
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
