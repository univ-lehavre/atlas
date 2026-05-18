import { Effect, RateLimiter } from "effect";
import { ContextStore, EventsStore, MetricsStore } from "../store/index.js";
import type { ConfigError } from "effect/ConfigError";

interface Action {
  name: string;
  group?: {
    name: string;
    index: number;
  };
  visible?: (() => Effect.Effect<boolean, never, ContextStore | EventsStore>)[];
  action: (
    rateLimiter?: RateLimiter.RateLimiter,
  ) => Effect.Effect<
    void,
    Error | ConfigError,
    ContextStore | EventsStore | MetricsStore
  >;
}

export type { Action };
