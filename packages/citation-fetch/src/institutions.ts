import { Effect, Schema } from "effect";
import type {
  FetchError,
  ResponseParseError,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import { FetchOnePage } from "@univ-lehavre/atlas-fetch-one-api-page";
import type { RateLimitInfo } from "@univ-lehavre/atlas-citation-types";

const OPENALEX_BASE_URL = "https://api.openalex.org";

interface CitationConfig {
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

/**
 * Effect `Schema` for a single OpenAlex autocomplete institution item
 * (écart E13, ADR 0047). Unknown payload keys are dropped at decode time, so
 * keeping the Struct to the interface's fields is correct and safe.
 */
const AutocompleteInstitutionSchema: Schema.Schema<AutocompleteInstitution> =
  Schema.Struct({
    id: Schema.String,
    display_name: Schema.String,
    hint: Schema.NullOr(Schema.String),
    cited_by_count: Schema.Number,
    works_count: Schema.NullOr(Schema.Number),
    entity_type: Schema.Literal("institution"),
    external_id: Schema.NullOr(Schema.String),
  });

/**
 * Effect `Schema` for the autocomplete page body. `meta.db_response_time_ms` is
 * an autocomplete-specific field (kept typed), so the response shape is built
 * directly rather than via the generic `apiResponseSchema`.
 */
const AutocompleteResponseSchema = Schema.Struct({
  meta: Schema.Struct({
    count: Schema.Number,
    db_response_time_ms: Schema.Number,
    page: Schema.Number,
    per_page: Schema.Number,
  }),
  results: Schema.Array(AutocompleteInstitutionSchema),
  // Schema.Array yields a `readonly` element type; the interface uses a mutable
  // array, so the decoded shape is structurally equivalent (same as store.ts).
}) as unknown as Schema.Schema<AutocompleteResponse>;

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
  config: CitationConfig,
): Effect.Effect<
  InstitutionSearchResult,
  FetchError | ResponseParseError,
  FetchOnePage
> =>
  query.trim().length === 0
    ? Effect.succeed(EMPTY_RESULT)
    : Effect.gen(function* () {
        const fetchOnePage = yield* FetchOnePage;
        const baseURL = config.apiURL ?? OPENALEX_BASE_URL;
        const endpointURL = new URL(`${baseURL}/autocomplete/institutions`);
        const params = {
          q: query,
          ...(config.apiKey === undefined ? {} : { api_key: config.apiKey }),
        };

        const { data, rateLimit } = yield* fetchOnePage(
          endpointURL,
          params,
          config.userAgent,
          AutocompleteResponseSchema,
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
  type CitationConfig,
  type Institution,
  type InstitutionSearchResult,
};
