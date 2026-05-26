/**
 * One questionnaire entry surfaced by `QuestionnairesInvite`.
 *
 * `slug` is the REDCap instrument name (e.g. `researcher_profile`) —
 * consumers use it to build the destination URL. The component itself
 * doesn't know about routing ; the parent passes the final `href`.
 */
export type QuestionnaireEntry = {
  /** Stable identifier — typically the REDCap instrument slug. */
  id: string;
  /** Short, action-oriented label ("Mon profil"). */
  label: string;
  /** One-line teaser for the questionnaire. */
  description: string;
  /** Destination URL (typically `/coming-soon?form=${slug}` until the
   *  form rendering ships). */
  href: string;
  /** Whether the entry is currently active. Disabled entries render
   *  greyed out with a tooltip-style hint. */
  disabled?: boolean;
};

export type QuestionnaireEntryList = readonly QuestionnaireEntry[];
