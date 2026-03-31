import { it, describe, expect } from "@effect/vitest";
import { Effect, Ref } from "effect";
import {
  getEvents,
  getEventsData,
  getManyEvent,
  getDisplayNameAlternatives,
  getAffiliations,
} from "./getter-effect.js";
import {
  getAcceptedAuthorDisplayNameAlternatives,
  hasAcceptedAuthorDisplayNameAlternatives,
  getAcceptedAuthorAffiliations,
  hasAcceptedAuthorAffiliations,
  getAcceptedAuthorInstitutions,
  hasAcceptedAuthorInstitutions,
  getAcceptedInstitutionDisplayNameAlternatives,
  hasAcceptedInstitutionDisplayNameAlternatives,
  hasAcceptedOpenAlexIDs,
  hasAcceptedWorks,
} from "./getter.js";
import { EventsStore, ContextStore } from "../store/init.js";
import type { IEvent } from "./types.js";
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

const makeContext = (overrides: Partial<IContext> = {}): IContext => ({
  type: "author",
  id: orcid,
  backup: false,
  NAMESPACE: "ns",
  ...overrides,
});

describe("getEvents", () => {
  it.effect("returns empty array when store is empty", () =>
    Effect.gen(function* () {
      const result = yield* getEvents().pipe(
        Effect.provideServiceEffect(EventsStore, Ref.make([])),
      );
      expect(result).toEqual([]);
    }),
  );

  it.effect("returns events after store is seeded", () =>
    Effect.gen(function* () {
      const events = [makeEvent(), makeEvent({ value: "I2" })];
      const result = yield* getEvents().pipe(
        Effect.provideServiceEffect(EventsStore, Ref.make(events)),
      );
      expect(result).toHaveLength(2);
    }),
  );
});

describe("getEventsData", () => {
  it.effect("maps events to IEventData shape", () =>
    Effect.gen(function* () {
      const event = makeEvent();
      const result = yield* getEventsData().pipe(
        Effect.provideServiceEffect(EventsStore, Ref.make([event])),
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        from: event.from,
        id: event.id,
        entity: event.entity,
        field: event.field,
        value: event.value,
      });
      expect(Object.keys(result[0]!)).not.toContain("status");
      expect(Object.keys(result[0]!)).not.toContain("createdAt");
    }),
  );
});

describe("getManyEvent", () => {
  it.effect("filters events by entity attribute", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({ entity: "author" }),
        makeEvent({ entity: "institution" }),
        makeEvent({ entity: "author" }),
      ];
      const result = yield* getManyEvent({ entity: "author" }).pipe(
        Effect.provideServiceEffect(EventsStore, Ref.make(events)),
      );
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.entity === "author")).toBe(true);
    }),
  );

  it.effect("returns empty array when no events match", () =>
    Effect.gen(function* () {
      const result = yield* getManyEvent({ entity: "work" }).pipe(
        Effect.provideServiceEffect(EventsStore, Ref.make([])),
      );
      expect(result).toEqual([]);
    }),
  );
});

describe("getDisplayNameAlternatives", () => {
  it.effect(
    "returns accepted display_name_alternatives for the orcid in context",
    () =>
      Effect.gen(function* () {
        const events = [
          makeEvent({
            entity: "author",
            field: "display_name_alternatives",
            status: "accepted",
            value: "Alice A.",
          }),
          makeEvent({
            entity: "author",
            field: "display_name_alternatives",
            status: "pending",
            value: "Alice B.",
          }),
          makeEvent({
            entity: "author",
            field: "affiliation",
            status: "accepted",
            value: "I1",
          }),
        ];
        const result = yield* getDisplayNameAlternatives().pipe(
          Effect.provideServiceEffect(EventsStore, Ref.make(events)),
          Effect.provideServiceEffect(ContextStore, Ref.make(makeContext())),
        );
        expect(result).toContain("Alice A.");
        expect(result).not.toContain("Alice B.");
        expect(result).not.toContain("I1");
      }),
  );

  it.effect(
    "returns empty array when there are no accepted display_name_alternatives",
    () =>
      Effect.gen(function* () {
        const events = [
          makeEvent({
            entity: "author",
            field: "affiliation",
            status: "accepted",
            value: "I1",
          }),
        ];
        const result = yield* getDisplayNameAlternatives().pipe(
          Effect.provideServiceEffect(EventsStore, Ref.make(events)),
          Effect.provideServiceEffect(ContextStore, Ref.make(makeContext())),
        );
        expect(result).toEqual([]);
      }),
  );
});

describe("getAffiliations", () => {
  it.effect("returns accepted affiliations using label or value", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "author",
          field: "affiliation",
          status: "accepted",
          value: "I1",
          label: "Univ LH",
        }),
        makeEvent({
          entity: "author",
          field: "affiliation",
          status: "accepted",
          value: "I2",
        }),
        makeEvent({
          entity: "author",
          field: "affiliation",
          status: "pending",
          value: "I3",
          label: "Univ X",
        }),
      ];
      const result = yield* getAffiliations().pipe(
        Effect.provideServiceEffect(EventsStore, Ref.make(events)),
        Effect.provideServiceEffect(ContextStore, Ref.make(makeContext())),
      );
      expect(result).toContain("Univ LH");
      expect(result).toContain("I2");
      expect(result).not.toContain("Univ X");
    }),
  );
});

const provideStores = <A, E>(
  events: IEvent[],
  ctx: IContext,
  effect: Effect.Effect<A, E, EventsStore | ContextStore>,
) =>
  effect.pipe(
    Effect.provideServiceEffect(EventsStore, Ref.make(events)),
    Effect.provideServiceEffect(ContextStore, Ref.make(ctx)),
  );

describe("getAcceptedAuthorDisplayNameAlternatives", () => {
  it.effect("returns accepted display_name_alternatives for author", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "author",
          field: "display_name_alternatives",
          status: "accepted",
          value: "Alice A.",
        }),
        makeEvent({
          entity: "author",
          field: "display_name_alternatives",
          status: "pending",
          value: "Alice B.",
        }),
      ];
      const result = yield* provideStores(
        events,
        makeContext(),
        getAcceptedAuthorDisplayNameAlternatives(),
      );
      expect(result).toContain("Alice A.");
      expect(result).not.toContain("Alice B.");
    }),
  );

  it.effect("returns empty array when id is undefined", () =>
    Effect.gen(function* () {
      const result = yield* provideStores(
        [],
        makeContext({ id: undefined, type: "none" }),
        getAcceptedAuthorDisplayNameAlternatives(),
      );
      expect(result).toEqual([]);
    }),
  );
});

describe("hasAcceptedAuthorDisplayNameAlternatives", () => {
  it.effect("returns true when accepted alternatives exist", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "author",
          field: "display_name_alternatives",
          status: "accepted",
          value: "Alice",
        }),
      ];
      const result = yield* provideStores(
        events,
        makeContext(),
        hasAcceptedAuthorDisplayNameAlternatives(),
      );
      expect(result).toBe(true);
    }),
  );

  it.effect("returns false when no accepted alternatives", () =>
    Effect.gen(function* () {
      const result = yield* provideStores(
        [],
        makeContext(),
        hasAcceptedAuthorDisplayNameAlternatives(),
      );
      expect(result).toBe(false);
    }),
  );
});

describe("getAcceptedAuthorAffiliations", () => {
  it.effect('returns accepted affiliations as "label (value)"', () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "author",
          field: "affiliation",
          status: "accepted",
          value: "I1",
          label: "Univ LH",
        }),
        makeEvent({
          entity: "author",
          field: "affiliation",
          status: "pending",
          value: "I2",
          label: "Univ X",
        }),
      ];
      const result = yield* provideStores(
        events,
        makeContext(),
        getAcceptedAuthorAffiliations(),
      );
      expect(result).toContain("Univ LH (I1)");
      expect(result).not.toContain("Univ X");
    }),
  );

  it.effect("returns empty when id is undefined", () =>
    Effect.gen(function* () {
      const result = yield* provideStores(
        [],
        makeContext({ id: undefined, type: "none" }),
        getAcceptedAuthorAffiliations(),
      );
      expect(result).toEqual([]);
    }),
  );
});

describe("hasAcceptedAuthorAffiliations", () => {
  it.effect("returns true when accepted affiliations exist", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "author",
          field: "affiliation",
          status: "accepted",
        }),
      ];
      const result = yield* provideStores(
        events,
        makeContext(),
        hasAcceptedAuthorAffiliations(),
      );
      expect(result).toBe(true);
    }),
  );

  it.effect("returns false when no accepted affiliations", () =>
    Effect.gen(function* () {
      const result = yield* provideStores(
        [],
        makeContext(),
        hasAcceptedAuthorAffiliations(),
      );
      expect(result).toBe(false);
    }),
  );
});

describe("getAcceptedAuthorInstitutions", () => {
  it.effect("returns accepted institution display_name_alternatives", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "institution",
          field: "display_name_alternatives",
          status: "accepted",
          value: "I1",
          label: "CNRS",
        }),
      ];
      const result = yield* provideStores(
        events,
        makeContext(),
        getAcceptedAuthorInstitutions(),
      );
      expect(result).toContain("CNRS (I1)");
    }),
  );

  it.effect("returns empty when id is undefined", () =>
    Effect.gen(function* () {
      const result = yield* provideStores(
        [],
        makeContext({ id: undefined, type: "none" }),
        getAcceptedAuthorInstitutions(),
      );
      expect(result).toEqual([]);
    }),
  );
});

describe("hasAcceptedAuthorInstitutions", () => {
  it.effect("returns true when institutions exist", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "institution",
          field: "display_name_alternatives",
          status: "accepted",
        }),
      ];
      const result = yield* provideStores(
        events,
        makeContext(),
        hasAcceptedAuthorInstitutions(),
      );
      expect(result).toBe(true);
    }),
  );
});

describe("getAcceptedInstitutionDisplayNameAlternatives", () => {
  it.effect("returns accepted institution alternatives values", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "institution",
          field: "display_name_alternatives",
          status: "accepted",
          value: "CNRS alt",
        }),
      ];
      const result = yield* provideStores(
        events,
        makeContext(),
        getAcceptedInstitutionDisplayNameAlternatives(),
      );
      expect(result).toContain("CNRS alt");
    }),
  );

  it.effect("returns empty when id is undefined", () =>
    Effect.gen(function* () {
      const result = yield* provideStores(
        [],
        makeContext({ id: undefined, type: "none" }),
        getAcceptedInstitutionDisplayNameAlternatives(),
      );
      expect(result).toEqual([]);
    }),
  );
});

describe("hasAcceptedInstitutionDisplayNameAlternatives", () => {
  it.effect("returns true when alternatives exist", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({
          entity: "institution",
          field: "display_name_alternatives",
          status: "accepted",
          value: "Alt",
        }),
      ];
      const result = yield* provideStores(
        events,
        makeContext(),
        hasAcceptedInstitutionDisplayNameAlternatives(),
      );
      expect(result).toBe(true);
    }),
  );
});

describe("hasAcceptedOpenAlexIDs", () => {
  it.effect(
    "returns true when affiliation and display_name_alternatives share same accepted from",
    () =>
      Effect.gen(function* () {
        const from = "A1" as unknown as OpenAlexID;
        const events = [
          makeEvent({
            entity: "author",
            field: "affiliation",
            status: "accepted",
            from,
          }),
          makeEvent({
            entity: "author",
            field: "display_name_alternatives",
            status: "accepted",
            from,
          }),
        ];
        const result = yield* provideStores(
          events,
          makeContext(),
          hasAcceptedOpenAlexIDs(),
        );
        expect(result).toBe(true);
      }),
  );

  it.effect("returns false when id is undefined", () =>
    Effect.gen(function* () {
      const result = yield* provideStores(
        [],
        makeContext({ id: undefined, type: "none" }),
        hasAcceptedOpenAlexIDs(),
      );
      expect(result).toBe(false);
    }),
  );
});

describe("hasAcceptedWorks", () => {
  it.effect("returns true when accepted work events exist", () =>
    Effect.gen(function* () {
      const events = [
        makeEvent({ entity: "work", field: "id", status: "accepted" }),
      ];
      const result = yield* provideStores(
        events,
        makeContext(),
        hasAcceptedWorks(),
      );
      expect(result).toBe(true);
    }),
  );

  it.effect("returns false when no accepted works", () =>
    Effect.gen(function* () {
      const result = yield* provideStores(
        [],
        makeContext(),
        hasAcceptedWorks(),
      );
      expect(result).toBe(false);
    }),
  );

  it.effect("returns false when id is undefined", () =>
    Effect.gen(function* () {
      const result = yield* provideStores(
        [],
        makeContext({ id: undefined, type: "none" }),
        hasAcceptedWorks(),
      );
      expect(result).toBe(false);
    }),
  );
});
