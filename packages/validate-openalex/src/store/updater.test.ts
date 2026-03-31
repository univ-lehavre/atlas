import { it, describe, expect } from "@effect/vitest";
import { vi } from "vitest";
import { Effect, Ref } from "effect";
import { updateContextStore, updateEventsStore } from "./updater.js";
import { EventsStore, ContextStore } from "./init.js";
import type { IEvent } from "../events/types.js";
import type { IContext } from "../context/types.js";
import type { OpenAlexID, ORCID } from "@univ-lehavre/atlas-openalex-types";

vi.mock("../store/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../store/index.js")>();
  return { ...actual, saveEventsStore: vi.fn(() => Effect.void) };
});

const orcid = "0000-0001-2345-6789" as unknown as ORCID;

const makeEvent = (overrides: Partial<IEvent> = {}): IEvent => ({
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  dataIntegrity: "hash-default",
  hasBeenExtendedAt: "never",
  status: "pending",
  from: "A1" as unknown as OpenAlexID,
  id: orcid,
  entity: "author",
  field: "affiliation",
  value: "I1",
  ...overrides,
});

const makeContext = (overrides: Partial<IContext> = {}): IContext => ({
  type: "author",
  id: orcid,
  backup: false,
  NAMESPACE: "ns",
  ...overrides,
});

describe("updateContextStore", () => {
  it.effect("merges partial context into existing context", () =>
    Effect.gen(function* () {
      const initial = makeContext({ backup: false });
      const storeRef = yield* Ref.make(initial);

      yield* updateContextStore({ backup: true }).pipe(
        Effect.provideService(ContextStore, storeRef),
      );

      const result = yield* Ref.get(storeRef);
      expect(result.backup).toBe(true);
      expect(result.type).toBe("author");
      expect(result.id).toBe(orcid);
    }),
  );

  it.effect("partial update does not remove other fields", () =>
    Effect.gen(function* () {
      const initial = makeContext({ NAMESPACE: "original-ns" });
      const storeRef = yield* Ref.make(initial);

      yield* updateContextStore({ type: "institution" }).pipe(
        Effect.provideService(ContextStore, storeRef),
      );

      const result = yield* Ref.get(storeRef);
      expect(result.NAMESPACE).toBe("original-ns");
      expect(result.type).toBe("institution");
    }),
  );
});

describe("updateEventsStore", () => {
  it.effect("deduplicates and persists new events", () =>
    Effect.gen(function* () {
      const existing = [makeEvent({ dataIntegrity: "hash-1", value: "I1" })];
      const newEvent = makeEvent({ dataIntegrity: "hash-2", value: "I2" });
      const eventsRef = yield* Ref.make(existing);
      const contextRef = yield* Ref.make(makeContext());

      yield* updateEventsStore([newEvent]).pipe(
        Effect.provideService(EventsStore, eventsRef),
        Effect.provideService(ContextStore, contextRef),
      );

      const result = yield* Ref.get(eventsRef);
      expect(result.some((e) => e.value === "I1")).toBe(true);
      expect(result.some((e) => e.value === "I2")).toBe(true);
    }),
  );

  it.effect("does not create duplicate entries for same dataIntegrity", () =>
    Effect.gen(function* () {
      const event = makeEvent({ dataIntegrity: "hash-same", value: "I1" });
      const eventsRef = yield* Ref.make([event]);
      const contextRef = yield* Ref.make(makeContext());

      yield* updateEventsStore([event]).pipe(
        Effect.provideService(EventsStore, eventsRef),
        Effect.provideService(ContextStore, contextRef),
      );

      const result = yield* Ref.get(eventsRef);
      const matchingCount = result.filter(
        (e) => e.dataIntegrity === "hash-same",
      ).length;
      expect(matchingCount).toBe(1);
    }),
  );
});
