import { Config, Effect, RateLimiter } from "effect";
import { type ConfigError } from "effect/ConfigError";

interface EnvConfig {
  userAgent: string;
  rateLimit: RateLimiter.RateLimiter.Options;
  perPage: number;
  apiURL: string;
  apiKey?: string;
}

const getEnv = (): Effect.Effect<EnvConfig, ConfigError, never> =>
  Effect.gen(function* () {
    const userAgent: string = yield* Config.string("USER_AGENT");
    const rateLimitStringified: string = yield* Config.string("RATE_LIMIT");
    const apiURL: string = yield* Config.string("API_URL");
    const perPage: number = yield* Config.number("RESULTS_PER_PAGE");
    const apiKey: string | undefined = yield* Config.string(
      "OPENALEX_API_KEY",
    ).pipe(
      Effect.option,
      Effect.map((opt) => (opt._tag === "Some" ? opt.value : undefined)),
    );
    const rateLimit: RateLimiter.RateLimiter.Options =
      JSON.parse(rateLimitStringified);
    return { userAgent, rateLimit, perPage, apiURL, apiKey };
  });

export { getEnv, type EnvConfig };
