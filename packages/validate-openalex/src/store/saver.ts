import { end } from "../prompt/index.js";
import { Config, ConfigError, Effect } from "effect";
import { getEvents } from "../events/index.js";
import { getContext } from "../context/index.js";
import fs, { existsSync } from "node:fs";
import { ContextStore, EventsStore } from "./index.js";

const timestamp = (): string => new Date().toISOString().replace(/[:.]/g, "-");

const writeFile = (value: unknown, file: string, backup: boolean) =>
  Effect.gen(function* () {
    if (existsSync(file)) yield* Effect.log(`Writing ${file}`);
    if (backup && existsSync(file))
      yield* Effect.tryPromise({
        try: () => fs.promises.copyFile(file, `${timestamp()}-${file}`),
        catch: (cause) =>
          new Error(`Error while backing up ${file}`, { cause }),
      });
    yield* Effect.tryPromise({
      try: () =>
        fs.promises.writeFile(file, JSON.stringify(value, null, 2), "utf-8"),
      catch: (cause) => new Error(`Error while writing ${file}`, { cause }),
    });
  });

const saveContextStore = (): Effect.Effect<
  void,
  Error | ConfigError.ConfigError,
  ContextStore
> =>
  Effect.gen(function* () {
    const context = yield* getContext();
    const file = yield* Config.string("CONTEXT_FILE");
    yield* Effect.log(file);
    yield* writeFile(context, file, context.backup);
  });

const saveEventsStore = (): Effect.Effect<
  void,
  Error | ConfigError.ConfigError,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    const context = yield* getContext();
    const events = yield* getEvents();
    const file = yield* Config.string("EVENTS_FILE");
    yield* Effect.log(file);
    yield* writeFile(events, file, context.backup);
  });

const saveStores = (): Effect.Effect<
  void,
  Error | ConfigError.ConfigError,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    yield* saveContextStore();
    yield* saveEventsStore();
  });

const saveStoresAndExit = (): Effect.Effect<
  never,
  Error | ConfigError.ConfigError,
  ContextStore | EventsStore
> =>
  Effect.gen(function* () {
    yield* saveStores();
    end();
    process.exit(0);
  });

export { saveEventsStore, saveContextStore, saveStores, saveStoresAndExit };
