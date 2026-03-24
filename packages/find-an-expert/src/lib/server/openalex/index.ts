// Note: this module handles HTTP autocomplete/stats for the SvelteKit UI.
// For bulk batch CLI use cases, see @univ-lehavre/atlas-fetch-openalex.
export { type TInstitution, type TInstitutionStatsResponse } from './types';

export { searchInstitutions } from './service';

export { getWorksCount, getInstitutionStats } from './works';
