import { Config, Effect, Ref, ConfigError } from "effect";
import fs, { existsSync } from "node:fs";
import { ContextStore, EventsStore } from "./index.js";
import type { IEvent } from "../events/types.js";
import type { IContext } from "../context/types.js";

const readFile = <T>(file: string): Effect.Effect<T | null, Error, never> =>
  Effect.gen(function* () {
    if (!existsSync(file)) return null;
    const data: string = yield* Effect.tryPromise({
      try: () => fs.promises.readFile(file, "utf-8"),
      catch: (cause) => new Error(`Error while reading ${file}`, { cause }),
    });
    yield* Effect.log(data);
    const json: T = yield* Effect.try({
      try: () => JSON.parse(data),
      catch: (cause) =>
        new Error(`Error while parsing content of ${file}`, { cause }),
    });
    return json;
  });

const loadContextStore = (): Effect.Effect<
  void,
  Error | ConfigError.ConfigError,
  ContextStore
> =>
  Effect.gen(function* () {
    const file: string = yield* Config.string("CONTEXT_FILE");
    yield* Effect.log(file);
    const parsed: IContext | null = yield* readFile<IContext>(file);
    if (parsed) {
      const store: Ref.Ref<IContext> = yield* ContextStore;
      yield* Ref.set(store, parsed);
    }
  });

const loadEventsStore = (): Effect.Effect<
  void,
  Error | ConfigError.ConfigError,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    const file = yield* Config.string("EVENTS_FILE");
    yield* Effect.log(file);
    const parsed: IEvent[] | null = yield* readFile<IEvent[]>(file);
    if (parsed) {
      const store = yield* EventsStore;
      yield* Ref.set(store, parsed);
    }
  });

const loadStores = (): Effect.Effect<
  void,
  Error | ConfigError.ConfigError,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    yield* loadContextStore();
    yield* loadEventsStore();
  });

export { loadStores };
