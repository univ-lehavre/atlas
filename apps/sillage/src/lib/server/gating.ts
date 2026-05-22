import type { ProfileState } from '$lib/types/api/profile';

/**
 * Shape of a questionnaire entry the gating engine consumes. Mirrors
 * `@univ-lehavre/atlas-ui` (QuestionnaireEntry) — kept here without
 * importing the barrel to avoid the side-effects observed in phase 5.
 */
type QuestionnaireEntry = {
  id: string;
  label: string;
  description: string;
  href: string;
  disabled?: boolean;
};

const isComplete = (status: string | null | undefined): boolean => status === '2';

/**
 * Decide which priority questionnaires should be active given the
 * current REDCap profile state. The matrix (per PROJECT.md gating
 * table) :
 *
 *   - researcher_profile : always active.
 *   - research_questions : active iff researcher_profile_complete == 2.
 *   - publications       : active iff researcher_profile_complete == 2.
 *   - project_proposal   : active iff publications_complete == 2.
 *
 * Returns a new list with the `disabled` field re-computed ; callers
 * are expected to pass in the canonical priorityQuestionnaires list
 * from the mocks (their `disabled` defaults are ignored).
 */
export const applyGating = (
  entries: ReadonlyArray<QuestionnaireEntry>,
  state: ProfileState
): QuestionnaireEntry[] => {
  const profileComplete = isComplete(state.researcher_profile_complete);
  const publicationsComplete = isComplete(state.publications_complete);

  const computeDisabled = (entry: QuestionnaireEntry): boolean => {
    switch (entry.id) {
      case 'researcher_profile':
        return false;
      case 'research_questions':
      case 'publications':
        return !profileComplete;
      case 'project_proposal':
        return !publicationsComplete;
      default:
        // Unknown instrument id — pass through whatever the entry had.
        return Boolean(entry.disabled);
    }
  };

  return entries.map((entry) => ({ ...entry, disabled: computeDisabled(entry) }));
};
