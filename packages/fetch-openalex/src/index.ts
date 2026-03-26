export { fetchAPIQueue, fetchAPIResults, type FetchAPIConfig } from "./api.js";

export { type FetchAPIMinimalConfig, type RateLimitInfo } from "./helpers.js";

export { type APIResponse, initialState, type IState, Store } from "./store.js";

export {
  searchInstitutions,
  type OpenAlexConfig,
  type Institution,
  type InstitutionSearchResult,
} from "./institutions.js";

export {
  getWorksCount,
  getInstitutionStats,
  type WorksCountResult,
  type InstitutionStatsResult,
  type YearlyArticleCount,
} from "./works.js";

export {
  searchAuthorsByName,
  searchAuthorsByORCID,
  searchWorksByAuthorID,
  searchWorksByAuthorIDs,
  searchWorksByORCID,
  searchWorksByDOI,
} from "./authors.js";
