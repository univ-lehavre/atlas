import { Effect, RateLimiter } from "effect";

import { fetch_one_page } from "./fetch.js";
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
      const { user_agent, rate_limit } = yield* getEnv();
      const ratelimiter: RateLimiter.RateLimiter =
        yield* RateLimiter.make(rate_limit);
      const spin = spinner();
      spin.start("Fouille des données d’OpenAlex");
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
      spin.stop(`${results.length} ${entity_name} téléchargés d’OpenAlex`);
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
        const response = yield* ratelimiter(
          fetch_one_page<OpenalexResponse<T>>(base_url, params, user_agent),
        );
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
