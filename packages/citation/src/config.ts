import { Config, Effect } from "effect";
import type { ConfigError } from "effect/ConfigError";
import type { Env } from "./types/index.js";

const getEnv = (): Effect.Effect<Env, ConfigError, never> =>
  Effect.gen(function* () {
    const user_agent = yield* Config.string("USER_AGENT");
    const rate_limit_stringified = yield* Config.string("RATE_LIMIT");
    const citation_api_url = yield* Config.string("OPENALEX_API_URL");
    const per_page = yield* Config.number("PER_PAGE");
    const duckdb_path = yield* Config.string("DUCKDB_PATH");
    const rate_limit = JSON.parse(rate_limit_stringified);
    const citation_api_key: string | undefined = yield* Config.string(
      "OPENALEX_API_KEY",
    ).pipe(
      Effect.option,
      Effect.map((opt) => (opt._tag === "Some" ? opt.value : undefined)),
    );
    return {
      user_agent,
      rate_limit,
      per_page,
      citation_api_url,
      duckdb_path,
      citation_api_key,
    };
  });

export { getEnv };
