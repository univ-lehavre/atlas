import type {
  TOpenAlexAutocompleteResponse,
  TInstitution,
  TInstitutionSearchResponse,
} from './types';
import { OpenAlexAutocompleteResponse } from './types';
import { OpenAlexApiError, OpenAlexParseError } from './errors';

const OPENALEX_BASE_URL = 'https://api.openalex.org';

/**
 * Searches for institutions using the OpenAlex autocomplete API.
 * @param query - The search query string
 * @returns Search results with institutions
 */
export const searchInstitutions = async (query: string): Promise<TInstitutionSearchResponse> => {
  if (!query.trim()) {
    return {
      institutions: [],
      meta: { count: 0, responseTimeMs: 0 },
    };
  }

  const url = new URL(`${OPENALEX_BASE_URL}/autocomplete/institutions`);
  url.searchParams.set('q', query);

  const response = await fetchOpenAlex(url);
  const data = parseAutocompleteResponse(response);

  return {
    institutions: data.results.map(mapToInstitution),
    meta: {
      count: data.meta.count,
      responseTimeMs: data.meta.db_response_time_ms,
    },
  };
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
        'User-Agent': 'talent-finder (mailto:contact@talent-finder.org)',
      },
    });

    if (!response.ok) {
      throw new OpenAlexApiError(`OpenAlex API returned ${response.status}`, {
        cause: `HTTP ${response.status}: ${response.statusText}`,
      });
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
 * Parses and validates OpenAlex autocomplete response.
 * @param data - Raw response data
 * @returns Validated response
 */
const parseAutocompleteResponse = (data: unknown): TOpenAlexAutocompleteResponse => {
  const result = OpenAlexAutocompleteResponse.safeParse(data);
  if (!result.success) {
    throw new OpenAlexParseError('Invalid OpenAlex response format', {
      cause: result.error.message,
    });
  }
  return result.data;
};

/**
 * Maps OpenAlex institution to simplified format.
 * @param institution - OpenAlex institution object
 * @returns Simplified institution
 */
const mapToInstitution = (
  institution: TOpenAlexAutocompleteResponse['results'][number]
): TInstitution => ({
  id: institution.id,
  displayName: institution.display_name,
  location: institution.hint,
  citedByCount: institution.cited_by_count,
  worksCount: institution.works_count,
});
