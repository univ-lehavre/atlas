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
 * Recherche des auteurs dans l'API OpenAlex par display_name et display_name_alternatives.
 * Le second prénom, s’il n’est pas spécifié, renvoie tous les résultats.
 * @param search Le terme de recherche.
 * @param start_page La page de résultats à partir de laquelle commencer la recherche.
 * @returns Une réponse contenant les résultats de la recherche.
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
