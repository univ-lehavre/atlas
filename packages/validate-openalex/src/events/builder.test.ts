import { describe, it, expect } from "@effect/vitest";
import { Effect, Ref } from "effect";
import {
  buildReference,
  buildEvent,
  buildAuthorResultsPendingEvents,
} from "./builder.js";
import type {
  WorksResult,
  AuthorsResult,
  OpenAlexID,
  ORCID,
} from "@univ-lehavre/atlas-openalex-types";
import { ContextStore, EventsStore } from "../store/init.js";
import type { IContext } from "../context/types.js";

const makeWork = (overrides: Partial<WorksResult> = {}): WorksResult =>
  ({
    id: "W123",
    title: "Test Article Title",
    doi: "10.1234/test",
    publication_year: 2023,
    authorships: [
      { author: { id: "A1", display_name: "Alice Dupont" } },
      { author: { id: "A2", display_name: "Bob Martin" } },
    ],
    ...overrides,
  }) as unknown as WorksResult;

describe("buildReference", () => {
  it("returns short format by default: year - title", () => {
    const work = makeWork();
    expect(buildReference(work)).toBe("2023 - Test Article Title");
  });

  it("returns full format when full=true", () => {
    const work = makeWork();
    const result = buildReference(work, true);
    expect(result).toContain("Alice Dupont");
    expect(result).toContain("Bob Martin");
    expect(result).toContain("2023");
    expect(result).toContain("Test Article Title");
    expect(result).toContain("DOI: 10.1234/test");
    expect(result).toContain("OpenAlex ID: W123");
  });

  it("handles work with no authors in full format", () => {
    const work = makeWork({ authorships: [] });
    const result = buildReference(work, true);
    expect(result).toContain("Test Article Title");
    expect(result).toContain("DOI: 10.1234/test");
  });

  it("uses publication_year in short format", () => {
    const work = makeWork({ publication_year: 2020 });
    expect(buildReference(work)).toBe("2020 - Test Article Title");
  });
});

const orcid = "0000-0001-2345-6789" as unknown as ORCID;
const ctxWithNamespace: IContext = {
  type: "author",
  id: orcid,
  backup: false,
  NAMESPACE: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
};

describe("buildEvent", () => {
  it.effect(
    "creates an IEvent with dataIntegrity, createdAt, updatedAt, and hasBeenExtendedAt=never",
    () =>
      Effect.gen(function* () {
        const partial = {
          from: "A1" as unknown as OpenAlexID,
          id: orcid,
          entity: "author" as const,
          field: "affiliation" as const,
          value: "I1",
          status: "pending" as const,
        };
        const event = yield* buildEvent(partial).pipe(
          Effect.provideServiceEffect(ContextStore, Ref.make(ctxWithNamespace)),
        );
        expect(event.hasBeenExtendedAt).toBe("never");
        expect(typeof event.dataIntegrity).toBe("string");
        expect(event.dataIntegrity.length).toBeGreaterThan(0);
        expect(typeof event.createdAt).toBe("string");
        expect(event.createdAt).toBe(event.updatedAt);
        expect(event.value).toBe("I1");
        expect(event.entity).toBe("author");
      }),
  );
});

describe("buildAuthorResultsPendingEvents", () => {
  it.effect("builds pending events from AuthorsResult array", () =>
    Effect.gen(function* () {
      const authors: AuthorsResult[] = [
        {
          id: "https://openalex.org/A1",
          display_name_alternatives: ["Alt Name"],
          affiliations: [{ institution: { id: "I1", display_name: "Univ A" } }],
        } as unknown as AuthorsResult,
      ];
      const events = yield* buildAuthorResultsPendingEvents(authors).pipe(
        Effect.provideServiceEffect(ContextStore, Ref.make(ctxWithNamespace)),
        Effect.provideServiceEffect(EventsStore, Ref.make([])),
      );
      expect(events.length).toBeGreaterThan(0);
      const displayNameEvent = events.find(
        (e) => e.field === "display_name_alternatives",
      );
      expect(displayNameEvent?.value).toBe("Alt Name");
      expect(displayNameEvent?.status).toBe("pending");
      const affiliationEvent = events.find((e) => e.field === "affiliation");
      expect(affiliationEvent?.value).toBe("I1");
      expect(affiliationEvent?.label).toBe("Univ A");
    }),
  );
});
