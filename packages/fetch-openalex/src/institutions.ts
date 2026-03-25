import { Effect } from "effect";
import type {
  FetchError,
  ResponseParseError,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import { fetchOnePage } from "@univ-lehavre/atlas-fetch-one-api-page";
import type { RateLimitInfo } from "@univ-lehavre/atlas-openalex-types";

const OPENALEX_BASE_URL = "https://api.openalex.org";

interface OpenAlexConfig {
  apiKey?: string;
  userAgent: string;
  apiURL?: string;
}

interface AutocompleteInstitution {
  id: string;
  display_name: string;
  hint: string | null;
  cited_by_count: number;
  works_count: number | null;
  entity_type: "institution";
  external_id: string | null;
}

interface AutocompleteResponse {
  meta: {
    count: number;
    db_response_time_ms: number;
    page: number;
    per_page: number;
  };
  results: AutocompleteInstitution[];
}

interface Institution {
  id: string;
  displayName: string;
  location: string | null;
  citedByCount: number;
  worksCount: number | null;
}

interface InstitutionSearchResult {
  institutions: Institution[];
  meta: {
    count: number;
    responseTimeMs: number;
  };
  rateLimit?: RateLimitInfo;
}

const EMPTY_RESULT: InstitutionSearchResult = {
  institutions: [],
  meta: { count: 0, responseTimeMs: 0 },
};

/**
 * Searches for institutions using the OpenAlex autocomplete API.
 * @param query - The search query string
 * @param config - OpenAlex API configuration (apiKey, userAgent, apiURL)
 * @returns Effect containing search results with rate limit info
 */
const searchInstitutions = (
  query: string,
  config: OpenAlexConfig,
): Effect.Effect<InstitutionSearchResult, FetchError | ResponseParseError> =>
  query.trim().length === 0
    ? Effect.succeed(EMPTY_RESULT)
    : Effect.gen(function* () {
        const baseURL = config.apiURL ?? OPENALEX_BASE_URL;
        const endpointURL = new URL(`${baseURL}/autocomplete/institutions`);
        const params = {
          q: query,
          ...(config.apiKey === undefined ? {} : { api_key: config.apiKey }),
        };

        const { data, rateLimit } = yield* fetchOnePage<AutocompleteResponse>(
          endpointURL,
          params,
          config.userAgent,
        );

        return {
          institutions: data.results.map((inst) => ({
            id: inst.id,
            displayName: inst.display_name,
            location: inst.hint,
            citedByCount: inst.cited_by_count,
            worksCount: inst.works_count,
          })),
          meta: {
            count: data.meta.count,
            responseTimeMs: data.meta.db_response_time_ms,
          },
          rateLimit,
        };
      });

export {
  searchInstitutions,
  type OpenAlexConfig,
  type Institution,
  type InstitutionSearchResult,
};
