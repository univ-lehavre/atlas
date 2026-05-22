/**
 * Public-facing shape of a community project surfaced by the
 * authenticated home carousel. Mirrors `@univ-lehavre/atlas-ui`'s
 * `ProjectSnapshot` ; kept locally so we don't drag the barrel.
 *
 * Source of truth : REDCap `project_proposal` records with
 * `project_proposal_complete = "2"` (validated). The shape below is
 * the result of `mapRedcapToProjectSnapshot()` ; consumers shouldn't
 * see the raw REDCap rows.
 */
export type CommunityProject = {
  id: string;
  title: string;
  lead: string;
  abstract: string;
  tags: readonly string[];
  date: string;
  href: string;
};

export type CommunityProjectList = readonly CommunityProject[];
