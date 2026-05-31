import type { Fetch } from '$lib/types';
import {
  EMPTY_PROFILE_STATE,
  type CompleteStatus,
  type ProfileState,
} from '$lib/types/api/profile';
import { escapeFilterLogicValue, fetchCrfJSON } from '$lib/server/crf';

const COMPLETE_FIELDS = [
  'researcher_profile_complete',
  'research_questions_complete',
  'publications_complete',
  'project_proposal_complete',
] as const satisfies readonly (keyof ProfileState)[];

type RawRow = Partial<Record<(typeof COMPLETE_FIELDS)[number], string>>;

const coerce = (value: string | undefined): CompleteStatus => {
  if (value === '0' || value === '1' || value === '2') return value;
  return null;
};

/**
 * Reads the four `{instrument}_complete` fields for the given user
 * from REDCap. Returns `EMPTY_PROFILE_STATE` when no record matches
 * (fresh user, never opened a form). The first row wins when multiple
 * records exist — sillage's data model expects exactly one record per
 * user, so any duplicate is a sign something else has misbehaved (we
 * don't fail here ; phase 6+ may add a defensive log).
 */
export const getProfileState = async (
  userId: string,
  context: { fetch: Fetch }
): Promise<ProfileState> => {
  const rows = await fetchCrfJSON<RawRow[]>(
    {
      content: 'record',
      action: 'export',
      format: 'json',
      type: 'flat',
      fields: ['userid', ...COMPLETE_FIELDS].join(','),
      filterLogic: `[userid] = "${escapeFilterLogicValue(userId)}"`,
    },
    context
  );
  if (!Array.isArray(rows) || rows.length === 0) return EMPTY_PROFILE_STATE;
  const first = rows[0] ?? {};
  return {
    researcher_profile_complete: coerce(first.researcher_profile_complete),
    research_questions_complete: coerce(first.research_questions_complete),
    publications_complete: coerce(first.publications_complete),
    project_proposal_complete: coerce(first.project_proposal_complete),
  };
};
