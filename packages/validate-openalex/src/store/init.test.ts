import { it, describe, expect } from "@effect/vitest";
import { Effect, Ref } from "effect";
import {
  provideContextStore,
  provideEventsStore,
  provideMetricsStore,
  EventsStore,
  ContextStore,
  MetricsStore,
} from "./init.js";

describe("provideEventsStore", () => {
  it.effect("provides an empty events store", () =>
    Effect.gen(function* () {
      const events = yield* Effect.flatMap(EventsStore, Ref.get);
      expect(events).toEqual([]);
    }).pipe(provideEventsStore()),
  );
});

describe("provideMetricsStore", () => {
  it.effect("provides an empty metrics store", () =>
    Effect.gen(function* () {
      const metrics = yield* Effect.flatMap(MetricsStore, Ref.get);
      expect(metrics).toEqual([]);
    }).pipe(provideMetricsStore()),
  );
});

describe("provideContextStore", () => {
  it.effect("provides a default context store", () =>
    Effect.gen(function* () {
      const ctx = yield* Effect.flatMap(ContextStore, Ref.get);
      expect(ctx.type).toBe("none");
      expect(ctx.backup).toBe(false);
    }).pipe(provideContextStore()),
  );
});
