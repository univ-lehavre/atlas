import { Effect, RateLimiter } from "effect";

import {
  fetchOnePage,
  FetchError as FetchOnePageError,
  ResponseParseError,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import { getEnv } from "../config.js";
import type { ConfigError } from "effect/ConfigError";
import { FetchError, StatusError } from "../errors.js";
import type { OpenalexResponse, Query } from "../types/index.js";
import { log, spinner } from "@clack/prompts";
import type { SpinnerResult } from "@clack/prompts";

const fetchAPI = <T>(
  base_url: URL,
  params: Query,
  entity_name: string,
  start_page: number = 1,
): Effect.Effect<
  OpenalexResponse<T>,
  ConfigError | StatusError | FetchError,
  never
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const { user_agent, rate_limit, openalex_api_key } = yield* getEnv();
      const ratelimiter: RateLimiter.RateLimiter =
        yield* RateLimiter.make(rate_limit);
      const spin = spinner();
      spin.start("Fouille des données d'OpenAlex");

      // Inject api_key if available
      if (openalex_api_key) {
        (params as Record<string, unknown>)["api_key"] = openalex_api_key;
      }

      const raw = yield* exhaust<T>(
        ratelimiter,
        start_page,
        Infinity,
        params,
        user_agent,
        base_url,
        spin,
        entity_name,
      );
      const results = raw.flat();
      spin.stop(`${results.length} ${entity_name} téléchargés d'OpenAlex`);
      const result: OpenalexResponse<T> = {
        meta: {
          count: results.length,
          page: 1,
          per_page: results.length,
        },
        results: results,
      };
      return result;
    }),
  );

const exhaust = <T>(
  ratelimiter: RateLimiter.RateLimiter,
  start_page: number,
  total_pages: number,
  params: Query,
  user_agent: string,
  base_url: URL,
  spin: SpinnerResult,
  entity_name: string,
  count: number = 0,
): Effect.Effect<T[][], StatusError | FetchError, never> =>
  Effect.loop(start_page, {
    while: (state) => state <= total_pages,
    step: (state) => state + 1,
    body: (state) =>
      Effect.gen(function* () {
        params["page"] = state;
        yield* Effect.logInfo(params["page"]);
        const pageResult = yield* ratelimiter(
          fetchOnePage<OpenalexResponse<T>>(base_url, params, user_agent),
        ).pipe(
          Effect.mapError(
            (e: FetchOnePageError | ResponseParseError) =>
              new FetchError(`La fonction fetch a retourné une erreur`, {
                cause: e.message,
              }),
          ),
        );
        const response = pageResult.data;
        count += response.results.length;
        if (count > 10000) {
          log.error(
            `Le nombre maximal de 10 000 ${entity_name} a été atteint. Veuillez affiner votre recherche.`,
          );
          process.exit(1);
        }

        total_pages = Math.ceil(response.meta.count / response.meta.per_page);
        spin.message(
          `${count}/${response.meta.count} ${entity_name} téléchargés | Page ${state}/${total_pages}`,
        );
        const result = response.results;
        return result;
      }),
  });

export { fetchAPI };
