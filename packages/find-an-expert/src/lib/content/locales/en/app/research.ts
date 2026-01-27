/**
 * Research content - English.
 * Content for research organization search and research output features.
 */

import type { ResearchContent } from '$lib/content/types';

/**
 * English research content.
 */
export const en: ResearchContent = {
  organization: {
    title: 'Organization search',
    consentRequired: 'Consent required',
    consentMessage:
      'Grant consent in the "Data consent" card to search for research organizations.',
    searchPlaceholder: 'Search research organizations...',
    maxReached: 'Maximum number of organizations reached',
    noResults: 'No organizations found for',
    selectedTitle: 'Selected organizations',
    maxLabel: 'max',
    noSelection: 'No organizations selected. Use the search above to add some.',
    works: 'works',
    citations: 'citations',
    removeLabel: 'Remove',
  },
  output: {
    title: 'Research output',
    consentMessage: 'Grant consent in the "Data consent" card to view output statistics.',
    selectOrganizations: 'Select organizations above to view their research output.',
    loading: 'Loading statistics...',
    articlesByYear: 'Articles by year',
    before: 'Before',
    affiliatedAuthors: 'Affiliated authors',
    total: 'Total',
  },
};
