import { it, describe, expect } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { vi } from "vitest";
import { updateEventsStoreBasedOnAcceptedValues } from "./updater-effect.js";
import { EventsStore, ContextStore } from "../store/init.js";
import type { IEvent } from "./types.js";
import type { OpenAlexID, ORCID } from "@univ-lehavre/atlas-openalex-types";
import type { IContext } from "../context/types.js";

vi.mock("../store/saver.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../store/saver.js")>();
  return { ...actual, saveEventsStore: vi.fn(() => Effect.void) };
});

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

const makeContext = (overrides: Partial<IContext> = {}): IContext => ({
  type: "author",
  id: orcid,
  backup: false,
  NAMESPACE: "ns",
  ...overrides,
});

const provideStores = (
  events: IEvent[],
  ctx: IContext,
  effect: Effect.Effect<void, unknown, EventsStore | ContextStore>,
) =>
  effect.pipe(
    Effect.provideServiceEffect(EventsStore, Ref.make(events)),
    Effect.provideServiceEffect(ContextStore, Ref.make(ctx)),
  );

describe("updateEventsStoreBasedOnAcceptedValues", () => {
  it.effect(
    "pending event with value in accepted → status becomes accepted",
    () =>
      Effect.gen(function* () {
        const events = [
          makeEvent({
            value: "I1",
            status: "pending",
            entity: "author",
            field: "affiliation",
            id: orcid,
          }),
        ];
        const ctx = makeContext();
        const eventsRef = yield* Ref.make(events);
        const ctxRef = yield* Ref.make(ctx);

        yield* updateEventsStoreBasedOnAcceptedValues(["I1"], {
          entity: "author",
          field: "affiliation",
          id: orcid,
        }).pipe(
          Effect.provideService(EventsStore, eventsRef),
          Effect.provideService(ContextStore, ctxRef),
        );

        const updated = yield* Ref.get(eventsRef);
        expect(updated.find((e) => e.value === "I1")?.status).toBe("accepted");
      }),
  );

  it.effect(
    "pending event with value NOT in accepted → status becomes rejected",
    () =>
      Effect.gen(function* () {
        const events = [
          makeEvent({
            value: "I2",
            status: "pending",
            entity: "author",
            field: "affiliation",
            id: orcid,
          }),
        ];
        const ctx = makeContext();
        const eventsRef = yield* Ref.make(events);
        const ctxRef = yield* Ref.make(ctx);

        yield* updateEventsStoreBasedOnAcceptedValues(["I1"], {
          entity: "author",
          field: "affiliation",
          id: orcid,
        }).pipe(
          Effect.provideService(EventsStore, eventsRef),
          Effect.provideService(ContextStore, ctxRef),
        );

        const updated = yield* Ref.get(eventsRef);
        expect(updated.find((e) => e.value === "I2")?.status).toBe("rejected");
      }),
  );

  it.effect(
    "empty accepted list → all matching pending events become rejected",
    () =>
      Effect.gen(function* () {
        const events = [
          makeEvent({
            value: "I1",
            status: "pending",
            entity: "author",
            field: "affiliation",
            id: orcid,
          }),
          makeEvent({
            value: "I2",
            status: "pending",
            entity: "author",
            field: "affiliation",
            id: orcid,
          }),
        ];
        const ctx = makeContext();
        const eventsRef = yield* Ref.make(events);
        const ctxRef = yield* Ref.make(ctx);

        yield* updateEventsStoreBasedOnAcceptedValues([], {
          entity: "author",
          field: "affiliation",
          id: orcid,
        }).pipe(
          Effect.provideService(EventsStore, eventsRef),
          Effect.provideService(ContextStore, ctxRef),
        );

        const updated = yield* Ref.get(eventsRef);
        const statuses = updated.map((e) => e.status);
        expect(statuses.every((s) => s === "rejected")).toBe(true);
      }),
  );

  it.effect("non-pending events are not processed", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          value: "I1",
          status: "accepted",
          entity: "author",
          field: "affiliation",
          id: orcid,
        }),
      ];
      const ctx = makeContext();
      const eventsRef = yield* Ref.make(events);
      const ctxRef = yield* Ref.make(ctx);

      yield* updateEventsStoreBasedOnAcceptedValues([], {
        entity: "author",
        field: "affiliation",
        id: orcid,
      }).pipe(
        Effect.provideService(EventsStore, eventsRef),
        Effect.provideService(ContextStore, ctxRef),
      );

      // The accepted event should remain in the store (it was not touched by the update)
      // updateEventsStore merges, so it may add or update — check no rejected event was added for I1 accepted
      const updated = yield* Ref.get(eventsRef);
      const i1event = updated.find((e) => e.value === "I1");
      // since filterPending only returns pending events, the accepted event is not re-processed
      expect(i1event?.status).toBe("accepted");
    }),
  );
});
