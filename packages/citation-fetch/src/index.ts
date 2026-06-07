export { fetchAPIQueue, fetchAPIResults, type FetchAPIConfig } from "./api.js";

// Re-export the FetchOnePage service tag + live layer (écart E14, ADR 0049)
// so consumers provide the network implementation from this package without a
// direct dependency on the lower-level fetch-one-api-page.
export {
  FetchOnePage,
  FetchOnePageLive,
} from "@univ-lehavre/atlas-fetch-one-api-page";

export { type FetchAPIMinimalConfig, type RateLimitInfo } from "./helpers.js";

export { type APIResponse, initialState, type IState, Store } from "./store.js";

export {
  searchInstitutions,
  type CitationConfig,
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
