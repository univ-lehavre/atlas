/**
 * Mock project snapshots used as a development fallback for the
 * authenticated homepage carousel.
 *
 * **Not the source of truth** — projects are meant to be read from
 * REDCap (project_proposal instrument, records where
 * `project_proposal_complete = 2`). This pool is the fallback when
 * REDCap is empty or unreachable, and it powers Storybook stories +
 * vitest UI tests.
 *
 * Shape mirrored from `@univ-lehavre/atlas-ui` (ProjectSnapshot).
 * Inlined to avoid pulling the barrel import — see the comment in
 * `mocks/researchers.ts` for the rationale.
 */
type ProjectSnapshot = {
  id: string;
  title: string;
  lead: string;
  abstract: string;
  tags: readonly string[];
  date: string;
  href: string;
  coverUrl?: string;
};
type ProjectSnapshotList = readonly ProjectSnapshot[];

export const mockProjectPool: ProjectSnapshotList = [
  {
    id: 'proj-fishports',
    title: 'Shifting Norman fishing ports',
    lead: 'Supply chains across Dieppe, Fécamp and Cherbourg',
    abstract:
      'A field survey of the economic shifts seen between 2015 and 2023 in three Norman ports. The study weaves together statistical records, semi-structured interviews and flow mapping.',
    tags: ['Economics', 'Geography', 'Ports'],
    date: '2024-03-12',
    href: '/coming-soon?project=fishports',
  },
  {
    id: 'proj-micropollutants',
    title: 'Mapping coastal micropollutants',
    lead: 'Biological sentinels along the eastern Channel',
    abstract:
      'Seasonal sampling of bivalves and benthic fish along the Le Havre coastline. The analysis seeks to correlate concentration peaks with documented industrial discharges.',
    tags: ['Ecotoxicology', 'Coastline'],
    date: '2024-06-05',
    href: '/coming-soon?project=micropollutants',
  },
  {
    id: 'proj-shipyards',
    title: 'Workers’ memory of the shipyards',
    lead: 'Oral archives from former employees of Le Trait',
    abstract:
      'A corpus of interviews and photographs gathered around the end of the lower Seine shipyards. The project weaves industrial history, anthropology and tangible heritage.',
    tags: ['History', 'Heritage', 'Anthropology'],
    date: '2025-01-20',
    href: '/coming-soon?project=shipyards',
  },
  {
    id: 'proj-erosion',
    title: 'Accelerated erosion of the chalk cliffs',
    lead: 'From Cap d’Ailly to Étretat: thirty years of retreat',
    abstract:
      'Diachronic reconstruction of the cliff face from IGN aerial photographs. Modelling of the meteorological and lithological parameters that account for the erosion bursts.',
    tags: ['Geomorphology', 'Climate'],
    date: '2024-09-18',
    href: '/coming-soon?project=erosion',
  },
  {
    id: 'proj-offshore-wind',
    title: 'Social acceptance of offshore wind',
    lead: 'A mixed-methods survey around the Fécamp wind farm',
    abstract:
      'Combines a survey (800 respondents) with interviews of local associations. Mapping of positions across social categories and visual exposure.',
    tags: ['Sociology', 'Energy'],
    date: '2024-11-02',
    href: '/coming-soon?project=offshore-wind',
  },
  {
    id: 'proj-norman-language',
    title: 'Diatopic variation of maritime Norman',
    lead: 'Spoken corpus from retired fishermen',
    abstract:
      'Recording and transcription of open-ended interviews with retired fishermen from the three main ports. Lexical analysis of the names given to species and to fishing manoeuvres.',
    tags: ['Linguistics', 'Intangible heritage'],
    date: '2023-12-08',
    href: '/coming-soon?project=norman-language',
  },
  {
    id: 'proj-maritime-law',
    title: 'Contemporary maritime-law disputes',
    lead: 'The Rotterdam Rules, ten years on',
    abstract:
      'Survey of French court cases citing the Convention. Analysis of the friction points between carriers and shippers.',
    tags: ['Law', 'International'],
    date: '2025-02-14',
    href: '/coming-soon?project=maritime-law',
  },
  {
    id: 'proj-biodiv',
    title: 'Biodiversity of the rocky shore',
    lead: 'Citizen-science monitoring with primary schools',
    abstract:
      'A simplified counting protocol for indicator species on 12 sites along the Seine-Maritime coast. The data feeds the regional SINP and a public-facing teaching tool.',
    tags: ['Ecology', 'Outreach'],
    date: '2024-05-22',
    href: '/coming-soon?project=biodiv',
  },
  {
    id: 'proj-tourism',
    title: 'Coastal tourism: post-pandemic shifts',
    lead: 'Three seasons (2021-2023) through big-data lenses',
    abstract:
      'Use of digital traces (bookings, mobility data) to characterise the new tourist flows. Comparison with classical attendance indicators.',
    tags: ['Geography', 'Economics'],
    date: '2024-08-30',
    href: '/coming-soon?project=tourism',
  },
  {
    id: 'proj-alloys',
    title: 'High-performance alloys for the offshore industry',
    lead: 'Behaviour in chloride environments under stress',
    abstract:
      'Experimental study of the ageing of three alloy families used in floating wind structures. Characterisation via electron microscopy and fatigue tests.',
    tags: ['Materials', 'Energy'],
    date: '2025-03-11',
    href: '/coming-soon?project=alloys',
  },
  {
    id: 'proj-digital-port',
    title: 'The digital port: towards a regional platform',
    lead: 'Customs and logistics interoperability',
    abstract:
      'Mapping of the information systems currently in use across Le Havre terminals. Specification of a common reference framework to reduce administrative friction.',
    tags: ['Computer Science', 'Logistics'],
    date: '2024-12-17',
    href: '/coming-soon?project=digital-port',
  },
  {
    id: 'proj-nitrogen',
    title: 'Diffuse sources of nitrogen pollution',
    lead: 'The Lézarde watershed, Seine-Maritime',
    abstract:
      'Isotopic characterisation of nitrogen across 24 sampling stations, from the agricultural plateau down to the estuary. Identification of agricultural vs urban contributions.',
    tags: ['Hydrology', 'Agronomy'],
    date: '2023-10-04',
    href: '/coming-soon?project=nitrogen',
  },
];

/**
 * Four priority instruments inviting the researcher to fill their
 * declarations. The gating engine (`$lib/server/gating.ts`) decides
 * which ones are active based on REDCap profile state ; the defaults
 * below match the documented matrix (only `researcher_profile` is
 * active for a fresh user).
 *
 * Shape mirrored from `@univ-lehavre/atlas-ui` (QuestionnaireEntry).
 */
type QuestionnaireEntry = {
  id: string;
  label: string;
  description: string;
  href: string;
  disabled?: boolean;
};
type QuestionnaireEntryList = readonly QuestionnaireEntry[];

export const priorityQuestionnaires: QuestionnaireEntryList = [
  {
    id: 'researcher_profile',
    label: 'My profile',
    description: 'Identity, affiliation, research disciplines.',
    href: '/coming-soon?form=researcher_profile',
  },
  {
    id: 'research_questions',
    label: 'My research questions',
    description: 'Lines of enquiry, hypotheses, intended partnerships.',
    href: '/coming-soon?form=research_questions',
    disabled: true,
  },
  {
    id: 'publications',
    label: 'My references',
    description: 'Publications, talks, ORCID.',
    href: '/coming-soon?form=publications',
    disabled: true,
  },
  {
    id: 'project_proposal',
    label: 'My project',
    description: 'A scoped research-project proposal.',
    href: '/coming-soon?form=project_proposal',
    disabled: true,
  },
];
