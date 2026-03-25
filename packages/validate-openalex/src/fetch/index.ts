import { Effect } from "effect";
import { getEnv, type EnvConfig } from "../config.js";
import { type ConfigError } from "effect/ConfigError";
import {
  FetchError,
  ResponseParseError,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import {
  searchAuthorsByName,
  searchAuthorsByORCID,
  searchWorksByAuthorIDs,
  searchWorksByORCID,
  searchWorksByDOI,
  type OpenAlexConfig,
} from "@univ-lehavre/atlas-fetch-openalex";
import type {
  ORCID,
  AuthorsResult,
  WorksResult,
} from "@univ-lehavre/atlas-openalex-types";

const buildConfig = (env: EnvConfig): OpenAlexConfig => ({
  userAgent: env.userAgent,
  apiURL: env.apiURL,
  apiKey: env.apiKey,
});

const searchAuthorByName = (
  names: string[],
): Effect.Effect<
  readonly AuthorsResult[],
  ConfigError | FetchError | ResponseParseError,
  never
> =>
  Effect.gen(function* () {
    const env: EnvConfig = yield* getEnv();
    return yield* searchAuthorsByName(names, buildConfig(env));
  });

const searchAuthorByORCID = (
  orcid: string[],
): Effect.Effect<
  readonly AuthorsResult[],
  ConfigError | FetchError | ResponseParseError,
  never
> =>
  Effect.gen(function* () {
    const env: EnvConfig = yield* getEnv();
    return yield* searchAuthorsByORCID(orcid, buildConfig(env));
  });

const searchWorksByAuthorIDsFn = (
  ids: string[],
): Effect.Effect<
  readonly WorksResult[],
  ConfigError | FetchError | ResponseParseError,
  never
> =>
  Effect.gen(function* () {
    const env: EnvConfig = yield* getEnv();
    return yield* searchWorksByAuthorIDs(ids, buildConfig(env));
  });

const searchWorksByORCIDFn = (
  orcid: ORCID,
): Effect.Effect<
  readonly WorksResult[],
  ConfigError | FetchError | ResponseParseError,
  never
> =>
  Effect.gen(function* () {
    const env: EnvConfig = yield* getEnv();
    return yield* searchWorksByORCID(orcid, buildConfig(env));
  });

const searchWorksByDOIFn = (
  dois: string[],
): Effect.Effect<
  readonly WorksResult[],
  ConfigError | FetchError | ResponseParseError,
  never
> =>
  Effect.gen(function* () {
    const env: EnvConfig = yield* getEnv();
    return yield* searchWorksByDOI(dois, buildConfig(env));
  });

export {
  searchAuthorByName,
  searchAuthorByORCID,
  searchWorksByAuthorIDsFn as searchWorksByAuthorIDs,
  searchWorksByORCIDFn as searchWorksByORCID,
  searchWorksByDOIFn as searchWorksByDOI,
};
