import { Effect } from "effect";
import { getEnv, type EnvConfig } from "../config.js";
import { type ConfigError } from "effect/ConfigError";
import {
  FetchError,
  ResponseParseError,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import {
  fetchAPIResults,
  type FetchAPIMinimalConfig,
} from "@univ-lehavre/atlas-fetch-openalex";
import type {
  ORCID,
  AuthorsResult,
  FetchOpenAlexAPIOptions,
  WorksResult,
} from "@univ-lehavre/atlas-openalex-types";

const searchAuthor = (names: string[]): FetchOpenAlexAPIOptions => ({
  search: names.join("|"),
});

const filterByORCID = (orcid: string[]): FetchOpenAlexAPIOptions => ({
  filter: `orcid:${orcid.join("|")}`,
});

const filterAuthorshipByIDs = (ids: string[]): FetchOpenAlexAPIOptions => ({
  filter: `author.id:${ids.join("|")}`,
});

const filterWorksByORCID = (orcid: ORCID): FetchOpenAlexAPIOptions => ({
  filter: `author.orcid:${orcid}`,
});

const filterWorksByDOI = (doi: string[]): FetchOpenAlexAPIOptions => ({
  filter: `doi:${doi.join("|")}`,
});

const buildFetchOptions = (
  endpoint: string,
  fetchAPIOptions: FetchOpenAlexAPIOptions,
): Effect.Effect<FetchAPIMinimalConfig, ConfigError, never> =>
  Effect.gen(function* () {
    const { userAgent, rateLimit, perPage, apiURL }: EnvConfig =
      yield* getEnv();
    const fetchParams: FetchAPIMinimalConfig = {
      userAgent,
      rateLimit,
      apiURL,
      endpoint,
      fetchAPIOptions,
      perPage,
    };
    return fetchParams;
  });

const fetchAuthor = (
  values: string[],
  callback: (values: string[]) => FetchOpenAlexAPIOptions,
): Effect.Effect<
  readonly AuthorsResult[],
  ConfigError | FetchError | ResponseParseError,
  never
> =>
  Effect.gen(function* () {
    const params: FetchOpenAlexAPIOptions = callback(values);
    const opts: FetchAPIMinimalConfig = yield* buildFetchOptions(
      "authors",
      params,
    );
    const authors = yield* fetchAPIResults<AuthorsResult>(opts);
    return authors;
  });

const fetchWork = (
  values: string[],
  callback: (values: string[]) => FetchOpenAlexAPIOptions,
): Effect.Effect<
  readonly WorksResult[],
  ConfigError | FetchError | ResponseParseError,
  never
> =>
  Effect.gen(function* () {
    const params: FetchOpenAlexAPIOptions = callback(values);
    const opts: FetchAPIMinimalConfig = yield* buildFetchOptions(
      "works",
      params,
    );
    const works = yield* fetchAPIResults<WorksResult>(opts);
    return works;
  });

const searchAuthorByName = (
  names: string[],
): Effect.Effect<
  readonly AuthorsResult[],
  ConfigError | FetchError | ResponseParseError,
  never
> => fetchAuthor(names, searchAuthor);

const searchAuthorByORCID = (
  orcid: string[],
): Effect.Effect<
  readonly AuthorsResult[],
  ConfigError | FetchError | ResponseParseError,
  never
> => fetchAuthor(orcid, filterByORCID);

const searchWorksByAuthorIDs = (
  ids: string[],
): Effect.Effect<
  readonly WorksResult[],
  ConfigError | FetchError | ResponseParseError,
  never
> => fetchWork(ids, filterAuthorshipByIDs);

const searchWorksByORCID = (
  orcid: ORCID,
): Effect.Effect<
  readonly WorksResult[],
  ConfigError | FetchError | ResponseParseError,
  never
> =>
  Effect.gen(function* () {
    const params: FetchOpenAlexAPIOptions = filterWorksByORCID(orcid);
    const opts: FetchAPIMinimalConfig = yield* buildFetchOptions(
      "works",
      params,
    );
    const works = yield* fetchAPIResults<WorksResult>(opts);
    return works;
  });

const searchWorksByDOI = (
  dois: string[],
): Effect.Effect<
  readonly WorksResult[],
  ConfigError | FetchError | ResponseParseError,
  never
> => fetchWork(dois, filterWorksByDOI);

export {
  searchAuthorByName,
  searchAuthorByORCID,
  searchWorksByAuthorIDs,
  searchWorksByORCID,
  searchWorksByDOI,
};
