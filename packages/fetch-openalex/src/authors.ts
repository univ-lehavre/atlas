import type { Effect } from "effect";
import type {
  FetchError,
  ResponseParseError,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import type {
  AuthorsResult,
  WorksResult,
  FetchOpenAlexAPIOptions,
} from "@univ-lehavre/atlas-openalex-types";
import type { ORCID } from "@univ-lehavre/atlas-openalex-types";
import { fetchAPIResults, type FetchAPIMinimalConfig } from "./api.js";
import type { OpenAlexConfig } from "./institutions.js";

const OPENALEX_BASE_URL = "https://api.openalex.org";

const DEFAULT_RATE_LIMIT = { limit: 1, interval: "1 seconds" } as const;
const DEFAULT_PER_PAGE = 100;

const buildConfig = (
  endpoint: string,
  fetchAPIOptions: FetchOpenAlexAPIOptions,
  config: OpenAlexConfig,
): FetchAPIMinimalConfig => ({
  userAgent: config.userAgent,
  rateLimit: DEFAULT_RATE_LIMIT,
  apiURL: config.apiURL ?? OPENALEX_BASE_URL,
  endpoint,
  fetchAPIOptions: {
    ...fetchAPIOptions,
    ...(config.apiKey === undefined ? {} : { api_key: config.apiKey }),
  },
  perPage: DEFAULT_PER_PAGE,
});

/**
 * Searches for authors by display name.
 * @param names - Array of names to search for
 * @param config - OpenAlex API configuration
 */
const searchAuthorsByName = (
  names: string[],
  config: OpenAlexConfig,
): Effect.Effect<readonly AuthorsResult[], FetchError | ResponseParseError> =>
  fetchAPIResults<AuthorsResult>(
    buildConfig("authors", { search: names.join("|") }, config),
  );

/**
 * Searches for authors by ORCID.
 * @param orcids - Array of ORCID identifiers
 * @param config - OpenAlex API configuration
 */
const searchAuthorsByORCID = (
  orcids: string[],
  config: OpenAlexConfig,
): Effect.Effect<readonly AuthorsResult[], FetchError | ResponseParseError> =>
  fetchAPIResults<AuthorsResult>(
    buildConfig("authors", { filter: `orcid:${orcids.join("|")}` }, config),
  );

/**
 * Searches for works by author OpenAlex IDs.
 * @param ids - Array of author OpenAlex IDs
 * @param config - OpenAlex API configuration
 */
const searchWorksByAuthorIDs = (
  ids: string[],
  config: OpenAlexConfig,
): Effect.Effect<readonly WorksResult[], FetchError | ResponseParseError> =>
  fetchAPIResults<WorksResult>(
    buildConfig("works", { filter: `author.id:${ids.join("|")}` }, config),
  );

/**
 * Searches for works by a single author OpenAlex ID.
 * Prefer this over searchWorksByAuthorIDs when fetching for multiple authors,
 * as the multi-ID filter is unreliable with many IDs.
 * @param id - Author OpenAlex ID
 * @param config - OpenAlex API configuration
 */
const searchWorksByAuthorID = (
  id: string,
  config: OpenAlexConfig,
): Effect.Effect<readonly WorksResult[], FetchError | ResponseParseError> =>
  fetchAPIResults<WorksResult>(
    buildConfig("works", { filter: `author.id:${id}` }, config),
  );

/**
 * Searches for works by author ORCID.
 * @param orcid - Author ORCID
 * @param config - OpenAlex API configuration
 */
const searchWorksByORCID = (
  orcid: ORCID,
  config: OpenAlexConfig,
): Effect.Effect<readonly WorksResult[], FetchError | ResponseParseError> =>
  fetchAPIResults<WorksResult>(
    buildConfig("works", { filter: `author.orcid:${orcid}` }, config),
  );

/**
 * Searches for works by DOI.
 * @param dois - Array of DOIs
 * @param config - OpenAlex API configuration
 */
const searchWorksByDOI = (
  dois: string[],
  config: OpenAlexConfig,
): Effect.Effect<readonly WorksResult[], FetchError | ResponseParseError> =>
  fetchAPIResults<WorksResult>(
    buildConfig("works", { filter: `doi:${dois.join("|")}` }, config),
  );

export {
  searchAuthorsByName,
  searchAuthorsByORCID,
  searchWorksByAuthorID,
  searchWorksByAuthorIDs,
  searchWorksByORCID,
  searchWorksByDOI,
};
