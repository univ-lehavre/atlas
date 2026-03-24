import { Effect, Ref } from "effect";
import { EventsStore, MetricsStore } from "../store/index.js";
import type { IEvent } from "../events/types.js";

const setEventsStore = (
  newEvents: IEvent[],
): Effect.Effect<void, never, EventsStore> =>
  Effect.gen(function* () {
    const store = yield* EventsStore;
    yield* Ref.update(store, () => [...newEvents]);
  });

const setMetricsStore = (
  newMetrics: IEvent[],
): Effect.Effect<void, never, MetricsStore> =>
  Effect.gen(function* () {
    const store = yield* MetricsStore;
    yield* Ref.update(store, () => [...newMetrics]);
  });

export { setEventsStore, setMetricsStore };
