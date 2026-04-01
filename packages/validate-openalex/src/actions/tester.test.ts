import { it, describe, expect } from "@effect/vitest";
import { Effect, Ref } from "effect";
import {
  hasPendings,
  notHasPendings,
  hasAcceptedValues,
  isContext,
  getAuthorAlternativeStrings,
  hasAuthorAlternativeStrings,
} from "./tester.js";
import { EventsStore, ContextStore } from "../store/init.js";
import type { IEvent } from "../events/types.js";
import type { OpenAlexID, ORCID } from "@univ-lehavre/atlas-openalex-types";
import type { IContext } from "../context/types.js";

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

const authorCtx: IContext = {
  type: "author",
  id: orcid,
  backup: false,
  NAMESPACE: "ns",
};

const provideStores = <A, E>(
  events: IEvent[],
  ctx: IContext,
  effect: Effect.Effect<A, E, EventsStore | ContextStore>,
) =>
  effect.pipe(
    Effect.provideServiceEffect(EventsStore, Ref.make(events)),
    Effect.provideServiceEffect(ContextStore, Ref.make(ctx)),
  );

describe("hasPendings", () => {
  it.effect(
    "returns true when context matches entity and there are pending events",
    () =>
      Effect.gen(function* () {
        const events = [
          makeEvent({ entity: "author", status: "pending", id: orcid }),
        ];
        const result = yield* provideStores(
          events,
          authorCtx,
          hasPendings("author"),
        );
        expect(result).toBe(true);
      }),
  );

  it.effect("returns true when filtering by specific field", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "author",
          field: "affiliation",
          status: "pending",
          id: orcid,
        }),
      ];
      const result = yield* provideStores(
        events,
        authorCtx,
        hasPendings("author", "affiliation"),
      );
      expect(result).toBe(true);
    }),
  );

  it.effect("returns false when context type does not match entity", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({ entity: "author", status: "pending", id: orcid }),
      ];
      const ctx: IContext = { ...authorCtx, type: "institution" };
      const result = yield* provideStores(events, ctx, hasPendings("author"));
      expect(result).toBe(false);
    }),
  );

  it.effect(
    "returns false when there are no pending events for matching entity",
    () =>
      Effect.gen(function* () {
        const events = [
          makeEvent({ entity: "author", status: "accepted", id: orcid }),
        ];
        const result = yield* provideStores(
          events,
          authorCtx,
          hasPendings("author"),
        );
        expect(result).toBe(false);
      }),
  );
});

describe("notHasPendings", () => {
  it.effect(
    "returns false when pending events exist (inverse of hasPendings)",
    () =>
      Effect.gen(function* () {
        const events = [
          makeEvent({ entity: "author", status: "pending", id: orcid }),
        ];
        const result = yield* provideStores(
          events,
          authorCtx,
          notHasPendings("author"),
        );
        expect(result).toBe(false);
      }),
  );

  it.effect("returns true when no pending events exist", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({ entity: "author", status: "accepted", id: orcid }),
      ];
      const result = yield* provideStores(
        events,
        authorCtx,
        notHasPendings("author"),
      );
      expect(result).toBe(true);
    }),
  );
});

describe("hasAcceptedValues", () => {
  it.effect(
    "returns true when type=author and has accepted affiliation AND display_name_alternatives events for same from",
    () =>
      Effect.gen(function* () {
        const events = [
          makeEvent({
            entity: "author",
            field: "affiliation",
            status: "accepted",
            from: "A1" as unknown as OpenAlexID,
          }),
          makeEvent({
            entity: "author",
            field: "display_name_alternatives",
            status: "accepted",
            from: "A1" as unknown as OpenAlexID,
          }),
        ];
        const result = yield* provideStores(
          events,
          authorCtx,
          hasAcceptedValues(),
        );
        expect(result).toBe(true);
      }),
  );

  it.effect("returns false when type=none", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "author",
          field: "affiliation",
          status: "accepted",
          from: "A1" as unknown as OpenAlexID,
        }),
      ];
      const ctx: IContext = {
        type: "none",
        id: undefined,
        backup: false,
        NAMESPACE: "ns",
      };
      const result = yield* provideStores(events, ctx, hasAcceptedValues());
      expect(result).toBe(false);
    }),
  );

  it.effect("returns false when id is undefined", () =>
    Effect.gen(function* () {
      const ctx: IContext = {
        type: "author",
        id: undefined,
        backup: false,
        NAMESPACE: "ns",
      };
      const result = yield* provideStores([], ctx, hasAcceptedValues());
      expect(result).toBe(false);
    }),
  );

  it.effect(
    "returns false when affiliation and display_name_alternatives do not share same from",
    () =>
      Effect.gen(function* () {
        const events = [
          makeEvent({
            entity: "author",
            field: "affiliation",
            status: "accepted",
            from: "A1" as unknown as OpenAlexID,
          }),
          makeEvent({
            entity: "author",
            field: "display_name_alternatives",
            status: "accepted",
            from: "A2" as unknown as OpenAlexID,
          }),
        ];
        const result = yield* provideStores(
          events,
          authorCtx,
          hasAcceptedValues(),
        );
        expect(result).toBe(false);
      }),
  );
});

describe("isContext", () => {
  it.effect("returns true when type matches entity", () =>
    Effect.gen(function* () {
      const result = yield* provideStores([], authorCtx, isContext("author"));
      expect(result).toBe(true);
    }),
  );

  it.effect("returns false when type does not match entity", () =>
    Effect.gen(function* () {
      const result = yield* provideStores(
        [],
        authorCtx,
        isContext("institution"),
      );
      expect(result).toBe(false);
    }),
  );
});

describe("getAuthorAlternativeStrings", () => {
  it.effect(
    "returns accepted display_name_alternatives events with hasBeenExtendedAt=never",
    () =>
      Effect.gen(function* () {
        const events = [
          makeEvent({
            entity: "author",
            field: "display_name_alternatives",
            status: "accepted",
            hasBeenExtendedAt: "never",
            value: "Alice",
          }),
          makeEvent({
            entity: "author",
            field: "display_name_alternatives",
            status: "accepted",
            hasBeenExtendedAt: "2024-01-02",
            value: "Alice Extended",
          }),
          makeEvent({
            entity: "author",
            field: "affiliation",
            status: "accepted",
            hasBeenExtendedAt: "never",
            value: "I1",
          }),
        ];
        const result = yield* provideStores(
          events,
          authorCtx,
          getAuthorAlternativeStrings(),
        );
        expect(result).toHaveLength(1);
        expect(result[0]?.value).toBe("Alice");
      }),
  );

  it.effect("returns empty array when context type is not author", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "author",
          field: "display_name_alternatives",
          status: "accepted",
        }),
      ];
      const ctx: IContext = { ...authorCtx, type: "institution" };
      const result = yield* provideStores(
        events,
        ctx,
        getAuthorAlternativeStrings(),
      );
      expect(result).toEqual([]);
    }),
  );

  it.effect("returns empty array when id is undefined", () =>
    Effect.gen(function* () {
      const ctx: IContext = {
        type: "author",
        id: undefined,
        backup: false,
        NAMESPACE: "ns",
      };
      const result = yield* provideStores(
        [],
        ctx,
        getAuthorAlternativeStrings(),
      );
      expect(result).toEqual([]);
    }),
  );
});

describe("hasAuthorAlternativeStrings", () => {
  it.effect(
    "returns true when matching accepted display_name_alternatives events exist",
    () =>
      Effect.gen(function* () {
        const events = [
          makeEvent({
            entity: "author",
            field: "display_name_alternatives",
            status: "accepted",
            hasBeenExtendedAt: "never",
          }),
        ];
        const result = yield* provideStores(
          events,
          authorCtx,
          hasAuthorAlternativeStrings(),
        );
        expect(result).toBe(true);
      }),
  );

  it.effect("returns false when no matching events", () =>
    Effect.gen(function* () {
      const result = yield* provideStores(
        [],
        authorCtx,
        hasAuthorAlternativeStrings(),
      );
      expect(result).toBe(false);
    }),
  );

  it.effect("returns false when context type is not author", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "author",
          field: "display_name_alternatives",
          status: "accepted",
        }),
      ];
      const ctx: IContext = { ...authorCtx, type: "institution" };
      const result = yield* provideStores(
        events,
        ctx,
        hasAuthorAlternativeStrings(),
      );
      expect(result).toBe(false);
    }),
  );

  it.effect("returns false when id is undefined", () =>
    Effect.gen(function* () {
      const ctx: IContext = {
        type: "author",
        id: undefined,
        backup: false,
        NAMESPACE: "ns",
      };
      const result = yield* provideStores(
        [],
        ctx,
        hasAuthorAlternativeStrings(),
      );
      expect(result).toBe(false);
    }),
  );
});
