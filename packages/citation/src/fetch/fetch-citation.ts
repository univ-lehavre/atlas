import { Effect, RateLimiter, Schema } from "effect";

import {
  FetchOnePage,
  type FetchOnePageFn,
  FetchError as FetchOnePageError,
  ResponseParseError,
} from "@univ-lehavre/atlas-fetch-one-api-page";
import { getEnv } from "../config.js";
import type { ConfigError } from "effect/ConfigError";
import { FetchError, StatusError } from "../errors.js";
import type { CitationResponse, Query } from "../types/index.js";

/**
 * Effect `Schema` for the paginated `CitationResponse<T>` envelope returned by
 * OpenAlex (écart E13, ADR 0047). `fetchAPI` is generic over the result-item
 * type `T` but its public signature does not carry a per-item schema, so the
 * envelope is decoded with `results` left as `Schema.Unknown`: the `meta`
 * pagination fields are validated (they drive the loop) while each item is
 * passed through untouched for the caller to validate downstream. `meta`
 * tolerates extra OpenAlex fields (e.g. `db_response_time_ms`).
 */
const citationResponseSchema: Schema.Schema<CitationResponse<unknown>> =
  Schema.Struct({
    meta: Schema.Struct(
      {
        count: Schema.Number,
        page: Schema.Number,
        per_page: Schema.Number,
      },
      Schema.Record({ key: Schema.String, value: Schema.Unknown }),
    ),
    results: Schema.Array(Schema.Unknown),
  }) as unknown as Schema.Schema<CitationResponse<unknown>>;

const fetchAPI = <T>(
  base_url: URL,
  params: Query,
  entity_name: string,
  start_page: number = 1,
): Effect.Effect<
  CitationResponse<T>,
  ConfigError | StatusError | FetchError,
  FetchOnePage
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const { user_agent, rate_limit, citation_api_key } = yield* getEnv();
      const ratelimiter: RateLimiter.RateLimiter =
        yield* RateLimiter.make(rate_limit);
      // One-page fetching as an injected service (écart E14, ADR 0049).
      const fetchOnePage = yield* FetchOnePage;

      // Inject api_key if available
      if (citation_api_key) {
        (params as Record<string, unknown>)["api_key"] = citation_api_key;
      }

      const raw = yield* exhaust<T>(
        fetchOnePage,
        ratelimiter,
        start_page,
        Infinity,
        params,
        user_agent,
        base_url,
        entity_name,
      );
      const results = raw.flat();
      yield* Effect.logInfo(
        `${results.length} ${entity_name} téléchargés d'OpenAlex`,
      );
      const result: CitationResponse<T> = {
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
  fetchOnePage: FetchOnePageFn,
  ratelimiter: RateLimiter.RateLimiter,
  start_page: number,
  total_pages: number,
  params: Query,
  user_agent: string,
  base_url: URL,
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
          fetchOnePage<CitationResponse<T>>(
            base_url,
            params,
            user_agent,
            // `T` items are decoded as `Schema.Unknown` and validated by the
            // caller downstream; only `meta` pagination is checked here.
            citationResponseSchema as Schema.Schema<CitationResponse<T>>,
          ),
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
          yield* Effect.fail(
            new StatusError(
              `Le nombre maximal de 10 000 ${entity_name} a été atteint. Veuillez affiner votre recherche.`,
            ),
          );
        }

        total_pages = Math.ceil(response.meta.count / response.meta.per_page);
        yield* Effect.logInfo(
          `${count}/${response.meta.count} ${entity_name} téléchargés | Page ${state}/${total_pages}`,
        );
        const result = response.results;
        return result;
      }),
  });

export { fetchAPI };
