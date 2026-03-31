import { it, describe, expect } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { hasPending, hasORCID } from "./tester.js";
import { EventsStore } from "../store/init.js";
import type { IEvent } from "./types.js";
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

describe("hasPending", () => {
  it("returns true when there are pending events matching opts", () => {
    const events = [makeEvent({ status: "pending", entity: "author" })];
    expect(hasPending(events, { entity: "author" })).toBe(true);
  });

  it("returns false when there are no pending events matching opts", () => {
    const events = [makeEvent({ status: "accepted", entity: "author" })];
    expect(hasPending(events, { entity: "author" })).toBe(false);
  });

  it("returns false when events array is empty", () => {
    expect(hasPending([], {})).toBe(false);
  });

  it("returns true when opts is empty and there is a pending event", () => {
    const events = [makeEvent({ status: "pending" })];
    expect(hasPending(events, {})).toBe(true);
  });
});

describe("hasORCID", () => {
  it.effect(
    "returns true when an author event with the given orcid exists",
    () =>
      Effect.gen(function* () {
        const events = [makeEvent({ entity: "author", id: orcid })];
        const result = yield* hasORCID(orcid as unknown as string).pipe(
          Effect.provideServiceEffect(EventsStore, Ref.make(events)),
        );
        expect(result).toBe(true);
      }),
  );

  it.effect(
    "returns false when no author event with the given orcid exists",
    () =>
      Effect.gen(function* () {
        const result = yield* hasORCID("0000-0000-0000-0000").pipe(
          Effect.provideServiceEffect(EventsStore, Ref.make([])),
        );
        expect(result).toBe(false);
      }),
  );

  it.effect("returns false when events exist but for a different orcid", () =>
    Effect.gen(function* () {
      const events = [makeEvent({ entity: "author", id: orcid })];
      const result = yield* hasORCID("0000-0000-0000-0000").pipe(
        Effect.provideServiceEffect(EventsStore, Ref.make(events)),
      );
      expect(result).toBe(false);
    }),
  );
});
