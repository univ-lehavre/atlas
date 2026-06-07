import { Schema, type Effect } from "effect";
import type {
  FetchError,
  FetchOnePage,
  ResponseParseError,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import type {
  AuthorsResult,
  WorksResult,
  CitationID,
  FetchCitationAPIOptions,
} from "@univ-lehavre/atlas-citation-types";
import type { ORCID } from "@univ-lehavre/atlas-citation-types";
import { fetchAPIResults } from "./api.js";
import type { FetchAPIMinimalConfig } from "./helpers.js";
import type { CitationConfig } from "./institutions.js";

const OPENALEX_BASE_URL = "https://api.openalex.org";

const DEFAULT_RATE_LIMIT = { limit: 1, interval: "1 seconds" } as const;
const DEFAULT_PER_PAGE = 100;

/**
 * Branded `CitationID` schema: decoded as a plain `string`, retyped to the
 * branded type so item schemas match the `@univ-lehavre/atlas-citation-types`
 * interfaces (écart E13, ADR 0047).
 */
const CitationIDSchema = Schema.String as unknown as Schema.Schema<CitationID>;

/**
 * Effect `Schema` for a single OpenAlex `/authors` result item, matching the
 * `AuthorsResult` interface (écart E13, ADR 0047). Only the fields declared by
 * the interface are validated; OpenAlex's extra keys are dropped at decode.
 */
const AuthorsResultSchema: Schema.Schema<AuthorsResult> = Schema.Struct({
  id: Schema.String,
  orcid: Schema.String,
  display_name: Schema.String,
  display_name_alternatives: Schema.Array(Schema.String),
  affiliations: Schema.Array(
    Schema.Struct({
      institution: Schema.Struct({
        id: Schema.String,
        ror: Schema.String,
        display_name: Schema.String,
        country_code: Schema.String,
        type: Schema.String,
        lineage: Schema.Array(Schema.String),
      }),
      years: Schema.Array(Schema.Number),
    }),
  ),
  works_api_url: Schema.String,
  updated_date: Schema.String,
  created_date: Schema.String,
}) as unknown as Schema.Schema<AuthorsResult>;

/**
 * Effect `Schema` for a single OpenAlex `/works` result item, matching the
 * `WorksResult` interface (écart E13, ADR 0047). Only the fields declared by
 * the interface are validated; OpenAlex's extra keys are dropped at decode.
 */
const WorksResultSchema: Schema.Schema<WorksResult> = Schema.Struct({
  id: CitationIDSchema,
  doi: Schema.NullOr(Schema.String),
  title: Schema.String,
  display_name: Schema.String,
  publication_year: Schema.Number,
  type: Schema.String,
  authorships: Schema.Array(
    Schema.Struct({
      author_position: Schema.String,
      author: Schema.Struct({
        id: Schema.String,
        display_name: Schema.NullOr(Schema.String),
        orcid: Schema.String,
      }),
      institutions: Schema.Array(
        Schema.Struct({
          id: CitationIDSchema,
          display_name: Schema.String,
          ror: Schema.String,
          country_code: Schema.String,
          type: Schema.String,
          lineage: Schema.Array(Schema.String),
        }),
      ),
      raw_author_name: Schema.String,
      raw_affiliation_strings: Schema.Array(Schema.String),
      affiliations: Schema.Array(
        Schema.Struct({
          raw_affiliation_string: Schema.String,
          institution_ids: Schema.Array(CitationIDSchema),
        }),
      ),
    }),
  ),
  topics: Schema.optional(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        display_name: Schema.String,
        score: Schema.Number,
        subfield: Schema.Struct({
          id: Schema.String,
          display_name: Schema.String,
        }),
        field: Schema.Struct({
          id: Schema.String,
          display_name: Schema.String,
        }),
        domain: Schema.Struct({
          id: Schema.String,
          display_name: Schema.String,
        }),
      }),
    ),
  ),
  keywords: Schema.optional(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        display_name: Schema.String,
        score: Schema.Number,
      }),
    ),
  ),
}) as unknown as Schema.Schema<WorksResult>;

const buildConfig = <T>(
  endpoint: string,
  fetchAPIOptions: FetchCitationAPIOptions,
  config: CitationConfig,
  itemSchema: Schema.Schema<T>,
  onRateLimit?: FetchAPIMinimalConfig<T>["onRateLimit"],
  onPage?: FetchAPIMinimalConfig<T>["onPage"],
): FetchAPIMinimalConfig<T> => ({
  userAgent: config.userAgent,
  rateLimit: DEFAULT_RATE_LIMIT,
  apiURL: config.apiURL ?? OPENALEX_BASE_URL,
  endpoint,
  fetchAPIOptions: {
    ...fetchAPIOptions,
    ...(config.apiKey === undefined ? {} : { api_key: config.apiKey }),
  },
  perPage: DEFAULT_PER_PAGE,
  itemSchema,
  onRateLimit,
  onPage,
});

/**
 * Searches for authors by display name.
 * @param names - Array of names to search for
 * @param config - OpenAlex API configuration
 */
const searchAuthorsByName = (
  names: string[],
  config: CitationConfig,
): Effect.Effect<
  readonly AuthorsResult[],
  FetchError | ResponseParseError,
  FetchOnePage
> =>
  fetchAPIResults<AuthorsResult>(
    buildConfig(
      "authors",
      { search: names.join("|") },
      config,
      AuthorsResultSchema,
    ),
  );

/**
 * Searches for authors by ORCID.
 * @param orcids - Array of ORCID identifiers
 * @param config - OpenAlex API configuration
 */
const searchAuthorsByORCID = (
  orcids: string[],
  config: CitationConfig,
): Effect.Effect<
  readonly AuthorsResult[],
  FetchError | ResponseParseError,
  FetchOnePage
> =>
  fetchAPIResults<AuthorsResult>(
    buildConfig(
      "authors",
      { filter: `orcid:${orcids.join("|")}` },
      config,
      AuthorsResultSchema,
    ),
  );

/**
 * Searches for works by author OpenAlex IDs.
 * @param ids - Array of author OpenAlex IDs
 * @param config - OpenAlex API configuration
 */
const searchWorksByAuthorIDs = (
  ids: string[],
  config: CitationConfig,
): Effect.Effect<
  readonly WorksResult[],
  FetchError | ResponseParseError,
  FetchOnePage
> =>
  fetchAPIResults<WorksResult>(
    buildConfig(
      "works",
      { filter: `author.id:${ids.join("|")}` },
      config,
      WorksResultSchema,
    ),
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
  config: CitationConfig,
  onRateLimit?: FetchAPIMinimalConfig<WorksResult>["onRateLimit"],
  onPage?: FetchAPIMinimalConfig<WorksResult>["onPage"],
): Effect.Effect<
  readonly WorksResult[],
  FetchError | ResponseParseError,
  FetchOnePage
> =>
  fetchAPIResults<WorksResult>(
    buildConfig(
      "works",
      { filter: `author.id:${id}` },
      config,
      WorksResultSchema,
      onRateLimit,
      onPage,
    ),
  );

/**
 * Searches for works by author ORCID.
 * @param orcid - Author ORCID
 * @param config - OpenAlex API configuration
 */
const searchWorksByORCID = (
  orcid: ORCID,
  config: CitationConfig,
): Effect.Effect<
  readonly WorksResult[],
  FetchError | ResponseParseError,
  FetchOnePage
> =>
  fetchAPIResults<WorksResult>(
    buildConfig(
      "works",
      { filter: `author.orcid:${orcid}` },
      config,
      WorksResultSchema,
    ),
  );

/**
 * Searches for works by DOI.
 * @param dois - Array of DOIs
 * @param config - OpenAlex API configuration
 */
const searchWorksByDOI = (
  dois: string[],
  config: CitationConfig,
): Effect.Effect<
  readonly WorksResult[],
  FetchError | ResponseParseError,
  FetchOnePage
> =>
  fetchAPIResults<WorksResult>(
    buildConfig(
      "works",
      { filter: `doi:${dois.join("|")}` },
      config,
      WorksResultSchema,
    ),
  );

export {
  searchAuthorsByName,
  searchAuthorsByORCID,
  searchWorksByAuthorID,
  searchWorksByAuthorIDs,
  searchWorksByORCID,
  searchWorksByDOI,
};
