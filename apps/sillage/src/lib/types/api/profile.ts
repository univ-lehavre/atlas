/**
 * REDCap status for one questionnaire. Mirror of the
 * `{instrument}_complete` field semantics :
 *   - `'0'` : Incomplete
 *   - `'1'` : Unverified
 *   - `'2'` : Complete
 *   - `null` : no record yet (fresh user, never opened the form)
 */
export type CompleteStatus = '0' | '1' | '2' | null;

/**
 * Aggregated profile state for the four priority instruments of the
 * ECRIN v2-alpha dictionary. Drives the gating of the questionnaires
 * invite on the authenticated home.
 */
export interface ProfileState {
  researcher_profile_complete: CompleteStatus;
  research_questions_complete: CompleteStatus;
  publications_complete: CompleteStatus;
  project_proposal_complete: CompleteStatus;
}

/**
 * Empty state surfaced to fresh users — the four instruments are
 * unstarted. Used as the default when REDCap returns no record for
 * the userid.
 */
export const EMPTY_PROFILE_STATE: ProfileState = {
  researcher_profile_complete: null,
  research_questions_complete: null,
  publications_complete: null,
  project_proposal_complete: null,
};
