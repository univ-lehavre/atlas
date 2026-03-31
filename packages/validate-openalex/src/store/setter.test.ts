import { it, describe, expect } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { setEventsStore, setMetricsStore } from "./setter.js";
import { EventsStore, MetricsStore } from "./init.js";
import type { IEvent } from "../events/types.js";
import type { OpenAlexID, ORCID } from "@univ-lehavre/atlas-openalex-types";

const orcid = "0000-0001-2345-6789" as unknown as ORCID;

const makeEvent = (overrides: Partial<IEvent> = {}): IEvent => ({
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  dataIntegrity: "hash",
  hasBeenExtendedAt: "never",
  status: "pending",
  from: "A1" as unknown as OpenAlexID,
  id: orcid,
  entity: "author",
  field: "affiliation",
  value: "I1",
  ...overrides,
});

describe("setEventsStore", () => {
  it.effect("replaces store content with new events", () =>
    Effect.gen(function* () {
      const initial = [makeEvent({ value: "I0" })];
      const newEvents = [
        makeEvent({ value: "I1" }),
        makeEvent({ value: "I2" }),
      ];
      const storeRef = yield* Ref.make(initial);

      yield* setEventsStore(newEvents).pipe(
        Effect.provideService(EventsStore, storeRef),
      );

      const result = yield* Ref.get(storeRef);
      expect(result).toHaveLength(2);
      expect(result[0]!.value).toBe("I1");
      expect(result[1]!.value).toBe("I2");
    }),
  );

  it.effect("replaces store content with empty array", () =>
    Effect.gen(function* () {
      const initial = [makeEvent()];
      const storeRef = yield* Ref.make(initial);

      yield* setEventsStore([]).pipe(
        Effect.provideService(EventsStore, storeRef),
      );

      const result = yield* Ref.get(storeRef);
      expect(result).toEqual([]);
    }),
  );
});

describe("setMetricsStore", () => {
  it.effect("replaces metrics store content with new events", () =>
    Effect.gen(function* () {
      const initial: IEvent[] = [];
      const newMetrics = [makeEvent({ value: "M1" })];
      const storeRef = yield* Ref.make(initial);

      yield* setMetricsStore(newMetrics).pipe(
        Effect.provideService(MetricsStore, storeRef),
      );

      const result = yield* Ref.get(storeRef);
      expect(result).toHaveLength(1);
      expect(result[0]!.value).toBe("M1");
    }),
  );

  it.effect("replaces metrics store with empty array", () =>
    Effect.gen(function* () {
      const initial = [makeEvent({ value: "M1" })];
      const storeRef = yield* Ref.make(initial);

      yield* setMetricsStore([]).pipe(
        Effect.provideService(MetricsStore, storeRef),
      );

      const result = yield* Ref.get(storeRef);
      expect(result).toEqual([]);
    }),
  );
});
