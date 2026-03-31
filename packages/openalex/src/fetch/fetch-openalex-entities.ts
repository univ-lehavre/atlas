import { Effect } from "effect";
import { getEnv } from "../config.js";

import { fetchAPI } from "./fetch-openalex.js";
import type { ConfigError } from "effect/ConfigError";
import { FetchError, StatusError } from "../errors.js";
import type {
  OpenalexResponse,
  AuthorsSearchResult,
  Query,
  WorksResult,
} from "../types/index.js";

/**
 * Searches for authors in the OpenAlex API by `display_name` and
 * `display_name_alternatives`. If the middle name is not specified, all
 * matching results are returned.
 *
 * @param search - The search term (author name).
 * @param start_page - The page number to start from (default: 1).
 * @returns An Effect resolving to a paginated response of author results.
 */
const searchAuthors = (
  search: string,
  start_page: number = 1,
): Effect.Effect<
  OpenalexResponse<AuthorsSearchResult>,
  ConfigError | StatusError | FetchError,
  never
> =>
  Effect.gen(function* () {
    const { per_page, openalex_api_url } = yield* getEnv();
    const url = new URL(`${openalex_api_url}/authors`);
    const params: Query = {
      search,
      per_page,
    };
    const response: OpenalexResponse<AuthorsSearchResult> =
      yield* fetchAPI<AuthorsSearchResult>(
        url,
        params,
        "chercheurs",
        start_page,
      );
    return response;
  });

/**
 * Retrieves articles from OpenAlex filtered by author IDs, institution IDs,
 * and type `article`.
 *
 * @param authors_ids - List of OpenAlex author IDs.
 * @param institutions_ids - List of OpenAlex institution IDs.
 * @param start_page - The page number to start from (default: 1).
 * @returns An Effect resolving to a paginated response of works.
 */
const retrieve_articles = (
  authors_ids: string[],
  institutions_ids: string[],
  start_page: number = 1,
): Effect.Effect<
  OpenalexResponse<WorksResult>,
  ConfigError | StatusError | FetchError,
  never
> =>
  Effect.gen(function* () {
    const { per_page, openalex_api_url } = yield* getEnv();
    const url = new URL(`${openalex_api_url}/works`);
    const filter = `author.id:${authors_ids.join("|")},institutions.id:${institutions_ids.join("|")},type:article`;
    const params: Query = {
      filter,
      per_page,
    };
    const response: OpenalexResponse<WorksResult> =
      yield* fetchAPI<WorksResult>(url, params, "articles", start_page);
    return response;
  });

/**
 * Retrieves articles from OpenAlex by a list of work IDs.
 *
 * @param works_ids - List of OpenAlex work IDs.
 * @param start_page - The page number to start from (default: 1).
 * @returns An Effect resolving to a paginated response of works.
 */
const retrieve_articles_given_work_ids = (
  works_ids: string[],
  start_page: number = 1,
): Effect.Effect<
  OpenalexResponse<WorksResult>,
  ConfigError | StatusError | FetchError,
  never
> =>
  Effect.gen(function* () {
    const { per_page, openalex_api_url } = yield* getEnv();
    const url = new URL(`${openalex_api_url}/works`);
    const filter = `ids.openalex:${works_ids.join("|")}`;
    const params: Query = {
      filter,
      per_page,
    };
    const response: OpenalexResponse<WorksResult> =
      yield* fetchAPI<WorksResult>(url, params, "articles", start_page);
    return response;
  });

export { searchAuthors, retrieve_articles, retrieve_articles_given_work_ids };
