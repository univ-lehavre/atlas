import {
  OpenAlexWorksResponse,
  OpenAlexAuthorsResponse,
  OpenAlexWorksGroupByResponse,
  type TOpenAlexWorksResponse,
  type TOpenAlexAuthorsResponse,
  type TOpenAlexWorksGroupByResponse,
  type TWorksCountResponse,
  type TInstitutionStatsResponse,
  type TYearlyArticleCount,
} from './types';
import { OpenAlexApiError, OpenAlexParseError } from './errors';

const OPENALEX_BASE_URL = 'https://api.openalex.org';
const YEARS_LOOKBACK = 5;

/**
 * Gets the list of full years to query (current year and previous N years).
 * @returns Array of years from oldest to most recent
 */
const getYearsToQuery = (): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = YEARS_LOOKBACK; i >= 0; i--) {
    years.push(currentYear - i);
  }
  return years;
};

/**
 * Calculates the date N years ago from today.
 * @returns Date string in YYYY-MM-DD format
 */
const getYearsAgoDate = (years: number): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().split('T')[0];
};

/**
 * Fetches data from OpenAlex API.
 * @param url - The URL to fetch
 * @returns Raw JSON response
 */
const fetchOpenAlex = async (url: URL): Promise<unknown> => {
  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'talent-finder (https://github.com/univ-lehavre/talent-finder)',
      },
    });

    if (!response.ok) {
      // Try to get error details from response body
      let errorDetails = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody.error) {
          errorDetails = errorBody.error;
        } else if (errorBody.message) {
          errorDetails = errorBody.message;
        }
      } catch {
        // Ignore JSON parse errors, use default error message
      }

      // Include the filter for debugging (truncated to avoid huge messages)
      const filter = url.searchParams.get('filter') || 'unknown';
      const truncatedFilter = filter.length > 200 ? filter.substring(0, 200) + '...' : filter;
      throw new OpenAlexApiError(
        `OpenAlex API returned ${response.status}: ${errorDetails} [filter: ${truncatedFilter}]`,
        {
          cause: errorDetails,
        }
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof OpenAlexApiError) {
      throw error;
    }
    throw new OpenAlexApiError('Failed to fetch from OpenAlex API', {
      cause: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Parses and validates OpenAlex works response.
 * @param data - Raw response data
 * @returns Validated response
 */
const parseWorksResponse = (data: unknown): TOpenAlexWorksResponse => {
  const result = OpenAlexWorksResponse.safeParse(data);
  if (!result.success) {
    throw new OpenAlexParseError('Invalid OpenAlex works response format', {
      cause: result.error.message,
    });
  }
  return result.data;
};

/**
 * Parses and validates OpenAlex authors response.
 * @param data - Raw response data
 * @returns Validated response
 */
const parseAuthorsResponse = (data: unknown): TOpenAlexAuthorsResponse => {
  const result = OpenAlexAuthorsResponse.safeParse(data);
  if (!result.success) {
    throw new OpenAlexParseError('Invalid OpenAlex authors response format', {
      cause: result.error.message,
    });
  }
  return result.data;
};

/**
 * Parses and validates OpenAlex works group_by response.
 * @param data - Raw response data
 * @returns Validated response
 */
const parseWorksGroupByResponse = (data: unknown): TOpenAlexWorksGroupByResponse => {
  const result = OpenAlexWorksGroupByResponse.safeParse(data);
  if (!result.success) {
    throw new OpenAlexParseError('Invalid OpenAlex works group_by response format', {
      cause: result.error.message,
    });
  }
  return result.data;
};

/**
 * Gets the count of articles from selected institutions over the last 5 years.
 * @param institutionIds - Array of OpenAlex institution IDs (e.g., ["I136199984"])
 * @param userEmail - Optional email for polite pool (higher rate limits)
 * @returns Works count response with count and metadata
 */
export const getWorksCount = async (
  institutionIds: string[],
  userEmail?: string
): Promise<TWorksCountResponse> => {
  const fromDate = getYearsAgoDate(YEARS_LOOKBACK);

  if (institutionIds.length === 0) {
    return {
      count: 0,
      responseTimeMs: 0,
      fromDate,
      institutionCount: 0,
    };
  }

  const institutionsFilter = institutionIds.join('|');

  const url = new URL(`${OPENALEX_BASE_URL}/works`);
  url.searchParams.set(
    'filter',
    `authorships.institutions.id:${institutionsFilter},from_publication_date:${fromDate},type:article`
  );
  url.searchParams.set('select', 'id');
  url.searchParams.set('per_page', '1');

  if (userEmail) {
    url.searchParams.set('mailto', userEmail);
  }

  const response = await fetchOpenAlex(url);
  const data = parseWorksResponse(response);

  return {
    count: data.meta.count,
    responseTimeMs: data.meta.db_response_time_ms,
    fromDate,
    institutionCount: institutionIds.length,
  };
};

/**
 * Gets comprehensive statistics for selected institutions.
 * Uses group_by=publication_year for efficient year breakdown in a single API call.
 * Fetches works count (all types), articles count per year (with "before" category), and authors count in parallel.
 * @param institutionIds - Array of OpenAlex institution IDs (e.g., ["I136199984"])
 * @param userEmail - Optional email for polite pool (higher rate limits)
 * @returns Institution statistics with works, articles by year, and authors counts
 */
export const getInstitutionStats = async (
  institutionIds: string[],
  userEmail?: string
): Promise<TInstitutionStatsResponse> => {
  const years = getYearsToQuery();

  if (institutionIds.length === 0) {
    return {
      worksCount: 0,
      articlesCount: 0,
      articlesByYear: [{ year: 'before', count: 0 }, ...years.map((year) => ({ year, count: 0 }))],
      authorsCount: 0,
      responseTimeMs: 0,
      institutionCount: 0,
    };
  }

  const institutionsFilter = institutionIds.join('|');
  const oldestYear = years[0];
  const currentYear = years[years.length - 1];

  // Build URLs for parallel requests
  const worksUrl = new URL(`${OPENALEX_BASE_URL}/works`);
  worksUrl.searchParams.set(
    'filter',
    `authorships.institutions.id:${institutionsFilter},publication_year:${oldestYear}-${currentYear}`
  );
  worksUrl.searchParams.set('select', 'id');
  worksUrl.searchParams.set('per_page', '1');

  // URL for articles grouped by year (type:article only, no year filter to get all years)
  const articlesGroupByUrl = new URL(`${OPENALEX_BASE_URL}/works`);
  articlesGroupByUrl.searchParams.set(
    'filter',
    `authorships.institutions.id:${institutionsFilter},type:article`
  );
  articlesGroupByUrl.searchParams.set('group_by', 'publication_year');

  const authorsUrl = new URL(`${OPENALEX_BASE_URL}/authors`);
  authorsUrl.searchParams.set('filter', `affiliations.institution.id:${institutionsFilter}`);
  authorsUrl.searchParams.set('select', 'id');
  authorsUrl.searchParams.set('per_page', '1');

  if (userEmail) {
    worksUrl.searchParams.set('mailto', userEmail);
    articlesGroupByUrl.searchParams.set('mailto', userEmail);
    authorsUrl.searchParams.set('mailto', userEmail);
  }

  // Fetch works count, articles by year, and authors count in parallel (only 3 requests!)
  const [worksResponse, articlesGroupByResponse, authorsResponse] = await Promise.all([
    fetchOpenAlex(worksUrl),
    fetchOpenAlex(articlesGroupByUrl),
    fetchOpenAlex(authorsUrl),
  ]);

  const worksData = parseWorksResponse(worksResponse);
  const articlesGroupByData = parseWorksGroupByResponse(articlesGroupByResponse);
  const authorsData = parseAuthorsResponse(authorsResponse);

  // Build yearly breakdown from group_by response
  const yearCountMap = new Map<number, number>();
  let beforeCount = 0;

  for (const item of articlesGroupByData.group_by) {
    const year = parseInt(item.key, 10);
    if (!isNaN(year)) {
      if (year < oldestYear) {
        // Accumulate all years before the displayed range
        beforeCount += item.count;
      } else if (year >= oldestYear && year <= currentYear) {
        yearCountMap.set(year, item.count);
      }
      // Ignore years after currentYear (shouldn't happen but safety check)
    }
  }

  // Build articlesByYear array with "before" first, then each year
  const articlesByYear: TYearlyArticleCount[] = [
    { year: 'before', count: beforeCount },
    ...years.map((year) => ({
      year,
      count: yearCountMap.get(year) ?? 0,
    })),
  ];

  // Calculate total articles (only displayed years, not "before")
  const totalArticles = years.reduce((sum, year) => sum + (yearCountMap.get(year) ?? 0), 0);

  const totalResponseTime =
    worksData.meta.db_response_time_ms +
    articlesGroupByData.meta.db_response_time_ms +
    authorsData.meta.db_response_time_ms;

  return {
    worksCount: worksData.meta.count,
    articlesCount: totalArticles,
    articlesByYear,
    authorsCount: authorsData.meta.count,
    responseTimeMs: totalResponseTime,
    institutionCount: institutionIds.length,
  };
};
