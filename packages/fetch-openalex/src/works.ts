import { Effect } from "effect";
import type {
  FetchError,
  ResponseParseError,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import { fetchOnePage } from "@univ-lehavre/atlas-fetch-one-api-page";
import type { RateLimitInfo } from "@univ-lehavre/atlas-openalex-types";
import type { OpenAlexConfig } from "./institutions.js";

const OPENALEX_BASE_URL = "https://api.openalex.org";
const YEARS_LOOKBACK = 5;

interface WorksMetaResponse {
  meta: {
    count: number;
    db_response_time_ms: number;
  };
}

interface WorksGroupByItem {
  key: string;
  key_display_name: string;
  count: number;
}

interface WorksGroupByResponse {
  meta: {
    count: number;
    db_response_time_ms: number;
  };
  group_by: WorksGroupByItem[];
}

interface YearlyArticleCount {
  year: number | "before";
  count: number;
}

interface WorksCountResult {
  count: number;
  responseTimeMs: number;
  fromDate: string;
  institutionCount: number;
  rateLimit?: RateLimitInfo;
}

interface InstitutionStatsResult {
  worksCount: number;
  articlesCount: number;
  articlesByYear: YearlyArticleCount[];
  authorsCount: number;
  responseTimeMs: number;
  institutionCount: number;
  rateLimit?: RateLimitInfo;
}

const getYearsToQuery = (): readonly number[] =>
  Array.from(
    { length: YEARS_LOOKBACK + 1 },
    (_, i) => new Date().getFullYear() - YEARS_LOOKBACK + i,
  );

const getYearsAgoDate = (years: number): string => {
  const now = new Date();
  const past = new Date(
    now.getFullYear() - years,
    now.getMonth(),
    now.getDate(),
  );
  return past.toISOString().split("T")[0] ?? "";
};

const buildParams = (
  filter: string,
  extra: Record<string, string | number | boolean | undefined>,
  apiKey: string | undefined,
): Record<string, string | number | boolean | undefined> => ({
  filter,
  ...extra,
  ...(apiKey === undefined ? {} : { api_key: apiKey }),
});

/**
 * Gets the count of articles from selected institutions over the last N years.
 * @param institutionIds - Array of OpenAlex institution IDs
 * @param config - OpenAlex API configuration
 * @returns Effect containing works count with rate limit info
 */
const getWorksCount = (
  institutionIds: string[],
  config: OpenAlexConfig,
): Effect.Effect<WorksCountResult, FetchError | ResponseParseError> => {
  const fromDate = getYearsAgoDate(YEARS_LOOKBACK);

  return institutionIds.length === 0
    ? Effect.succeed({
        count: 0,
        responseTimeMs: 0,
        fromDate,
        institutionCount: 0,
      })
    : Effect.gen(function* () {
        const baseURL = config.apiURL ?? OPENALEX_BASE_URL;
        const endpointURL = new URL(`${baseURL}/works`);
        const filter = `authorships.institutions.id:${institutionIds.join("|")},from_publication_date:${fromDate},type:article`;
        const params = buildParams(
          filter,
          { select: "id", per_page: 1 },
          config.apiKey,
        );

        const { data, rateLimit } = yield* fetchOnePage<WorksMetaResponse>(
          endpointURL,
          params,
          config.userAgent,
        );

        return {
          count: data.meta.count,
          responseTimeMs: data.meta.db_response_time_ms,
          fromDate,
          institutionCount: institutionIds.length,
          rateLimit,
        };
      });
};

interface YearAccumulator {
  readonly yearCountMap: ReadonlyMap<number, number>;
  readonly beforeCount: number;
}

const buildYearCounts = (
  items: readonly WorksGroupByItem[],
  oldestYear: number,
  currentYear: number,
): YearAccumulator =>
  // eslint-disable-next-line unicorn/no-array-reduce -- functional accumulation without mutation
  items.reduce<YearAccumulator>(
    (acc, item) => {
      const year = Number.parseInt(item.key, 10);
      return Number.isNaN(year)
        ? acc
        : year < oldestYear
          ? {
              yearCountMap: acc.yearCountMap,
              beforeCount: acc.beforeCount + item.count,
            }
          : year <= currentYear
            ? {
                yearCountMap: new Map([
                  ...acc.yearCountMap,
                  [year, item.count],
                ]),
                beforeCount: acc.beforeCount,
              }
            : acc;
    },
    { yearCountMap: new Map(), beforeCount: 0 },
  );

/**
 * Gets comprehensive statistics for selected institutions.
 * Fetches works count, articles by year, and authors count in parallel.
 * @param institutionIds - Array of OpenAlex institution IDs
 * @param config - OpenAlex API configuration
 * @returns Effect containing institution statistics with rate limit info
 */
const getInstitutionStats = (
  institutionIds: string[],
  config: OpenAlexConfig,
): Effect.Effect<InstitutionStatsResult, FetchError | ResponseParseError> => {
  const years = getYearsToQuery();

  return institutionIds.length === 0
    ? Effect.succeed({
        worksCount: 0,
        articlesCount: 0,
        articlesByYear: [
          { year: "before" as const, count: 0 },
          ...years.map((year) => ({ year, count: 0 })),
        ],
        authorsCount: 0,
        responseTimeMs: 0,
        institutionCount: 0,
      })
    : Effect.gen(function* () {
        const baseURL = config.apiURL ?? OPENALEX_BASE_URL;
        const institutionsFilter = institutionIds.join("|");
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- years always has YEARS_LOOKBACK+1 elements
        const oldestYear = years[0]!;
        const currentYear = years.at(-1)!; // eslint-disable-line @typescript-eslint/no-non-null-assertion -- same

        const worksParams = buildParams(
          `authorships.institutions.id:${institutionsFilter},publication_year:${String(oldestYear)}-${String(currentYear)}`,
          { select: "id", per_page: 1 },
          config.apiKey,
        );
        const articlesGroupByParams = buildParams(
          `authorships.institutions.id:${institutionsFilter},type:article`,
          { group_by: "publication_year" },
          config.apiKey,
        );
        const authorsParams = buildParams(
          `affiliations.institution.id:${institutionsFilter}`,
          { select: "id", per_page: 1 },
          config.apiKey,
        );

        const [worksResult, articlesResult, authorsResult] = yield* Effect.all(
          [
            fetchOnePage<WorksMetaResponse>(
              new URL(`${baseURL}/works`),
              worksParams,
              config.userAgent,
            ),
            fetchOnePage<WorksGroupByResponse>(
              new URL(`${baseURL}/works`),
              articlesGroupByParams,
              config.userAgent,
            ),
            fetchOnePage<WorksMetaResponse>(
              new URL(`${baseURL}/authors`),
              authorsParams,
              config.userAgent,
            ),
          ],
          { concurrency: "unbounded" },
        );

        const { yearCountMap, beforeCount } = buildYearCounts(
          articlesResult.data.group_by,
          oldestYear,
          currentYear,
        );

        const articlesByYear: YearlyArticleCount[] = [
          { year: "before", count: beforeCount },
          ...years.map((year) => ({
            year,
            count: yearCountMap.get(year) ?? 0,
          })),
        ];

        const totalArticles = years.reduce(
          (sum, year) => sum + (yearCountMap.get(year) ?? 0),
          0,
        );

        return {
          worksCount: worksResult.data.meta.count,
          articlesCount: totalArticles,
          articlesByYear,
          authorsCount: authorsResult.data.meta.count,
          responseTimeMs:
            worksResult.data.meta.db_response_time_ms +
            articlesResult.data.meta.db_response_time_ms +
            authorsResult.data.meta.db_response_time_ms,
          institutionCount: institutionIds.length,
          rateLimit: authorsResult.rateLimit,
        };
      });
};

export {
  getWorksCount,
  getInstitutionStats,
  type WorksCountResult,
  type InstitutionStatsResult,
  type YearlyArticleCount,
};
