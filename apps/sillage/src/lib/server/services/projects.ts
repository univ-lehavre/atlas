import type { Fetch } from '$lib/types';
import type { CommunityProject, CommunityProjectList } from '$lib/types/api/community-project';
import { fetchCrfJSON } from '$lib/server/crf';

/**
 * Fields pulled from REDCap for one validated `project_proposal`
 * record. The shape lines up with the dictionary
 * `data-dictionaries/136-ecrin-v2-alpha.json` (form_name=project_proposal).
 *
 * ECRIN v2-alpha uses `userid` as its record identifier (first field
 * of the dict — REDCap convention when no `record_id` field is
 * declared). The mapper surfaces it as `CommunityProject.id` (treated
 * as opaque on the client ; consent gating in a later phase will
 * pseudonymise it for projects whose `project_proposal_identification_
 * level` is not `Identifiable`).
 */
type RawProjectRow = {
  userid?: string;
  acronym?: string;
  title?: string;
  abstract?: string;
  keyword1?: string;
  keyword2?: string;
  keyword3?: string;
  project_proposal_complete?: string;
};

const PROJECT_FIELDS = [
  'userid',
  'acronym',
  'title',
  'abstract',
  'keyword1',
  'keyword2',
  'keyword3',
  'project_proposal_complete',
] as const;

const stripTags = (raw: string | undefined): string => {
  if (!raw) return '';
  // REDCap returns rich-text labels with stripped <div class="…"> chrome
  // already, but legacy rows or notes fields can contain leftover tags.
  // Iterate until stable to defeat nested patterns like `<sc<script>ript>`
  // where a single greedy pass would leave dangerous residue.
  let out = raw;
  let prev: string;
  do {
    prev = out;
    out = out.replace(/<[^>]*>/g, '');
  } while (out !== prev);
  return out.replace(/[<>]/g, '').trim();
};

export const mapRedcapToProjectSnapshot = (row: RawProjectRow): CommunityProject | null => {
  const id = row.userid?.trim();
  const title = stripTags(row.title);
  if (!id || !title) return null;

  const tags = [row.keyword1, row.keyword2, row.keyword3]
    .map((k) => stripTags(k))
    .filter((k): k is string => k.length > 0);

  return {
    id,
    title,
    lead: stripTags(row.acronym) || title,
    abstract: stripTags(row.abstract) || '—',
    tags,
    // REDCap doesn't expose a date on project_proposal at this stage.
    // We surface the current year to keep the card layout consistent
    // ; tighten this once the dictionary adds a `submitted_at` field.
    date: `${new Date().getFullYear()}-01-01`,
    href: `/coming-soon?project=${encodeURIComponent(id)}`,
  };
};

/**
 * Reads validated community projects from REDCap. Returns an empty
 * array when REDCap is unreachable or contains no validated row (the
 * caller decides whether to fall back to a mock pool).
 *
 * Filter logic : `[project_proposal_complete] = "2"`. We intentionally
 * skip in-progress projects ("0" / "1") so the carousel only shows
 * scoped, author-approved proposals.
 */
export const getCommunityProjects = async (context: {
  fetch: Fetch;
}): Promise<CommunityProjectList> => {
  try {
    const rows = await fetchCrfJSON<RawProjectRow[]>(
      {
        content: 'record',
        action: 'export',
        format: 'json',
        type: 'flat',
        fields: PROJECT_FIELDS.join(','),
        forms: 'project_proposal',
        filterLogic: '[project_proposal_complete] = "2"',
      },
      context
    );
    if (!Array.isArray(rows)) return [];
    return rows.map(mapRedcapToProjectSnapshot).filter((p): p is CommunityProject => p !== null);
  } catch (err: unknown) {
    // REDCap not bootstrapped yet, or transient outage. Log so the
    // operator can investigate, then surrender to the caller's
    // fallback (`+page.server.ts` swaps in the mock pool when this
    // returns empty).
    // eslint-disable-next-line no-console
    console.error('getCommunityProjects: REDCap read failed', err);
    return [];
  }
};
