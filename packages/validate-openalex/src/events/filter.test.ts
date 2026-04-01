import { describe, it, expect } from "vitest";
import type { IEvent } from "./types.js";
import {
  isInteresting,
  filterEventsByAttributes,
  filterPending,
  filterDuplicates,
  removeDuplicates,
} from "./filter.js";

const makeEvent = (overrides: Partial<IEvent> = {}): IEvent =>
  ({
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    dataIntegrity: "uuid-1",
    hasBeenExtendedAt: null,
    status: "pending",
    from: "openalex:W1" as IEvent["from"],
    id: "ORCID:0000-0001-2345-6789" as IEvent["id"],
    entity: "author",
    field: "display_name_alternatives",
    value: "Alice",
    ...overrides,
  }) as IEvent;

describe("isInteresting", () => {
  it("returns true when opts is empty", () => {
    expect(isInteresting(makeEvent(), {})).toBe(true);
  });

  it("returns true when all opts properties match", () => {
    const event = makeEvent({ status: "accepted", entity: "author" });
    expect(isInteresting(event, { status: "accepted", entity: "author" })).toBe(
      true,
    );
  });

  it("returns false when one opt property does not match", () => {
    const event = makeEvent({ status: "pending" });
    expect(isInteresting(event, { status: "accepted" })).toBe(false);
  });
});

describe("filterEventsByAttributes", () => {
  it("returns all events when opts is empty", () => {
    const events = [makeEvent(), makeEvent({ dataIntegrity: "uuid-2" })];
    expect(filterEventsByAttributes(events, {})).toHaveLength(2);
  });

  it("filters by a single attribute", () => {
    const events = [
      makeEvent({ status: "accepted", dataIntegrity: "uuid-1" }),
      makeEvent({ status: "pending", dataIntegrity: "uuid-2" }),
    ];
    const result = filterEventsByAttributes(events, { status: "accepted" });
    expect(result).toHaveLength(1);
    expect(result[0].dataIntegrity).toBe("uuid-1");
  });

  it("returns empty array when no event matches", () => {
    const events = [makeEvent({ entity: "author" })];
    expect(
      filterEventsByAttributes(events, { entity: "institution" }),
    ).toHaveLength(0);
  });
});

describe("filterPending", () => {
  it("returns only pending events matching opts", () => {
    const events = [
      makeEvent({
        status: "pending",
        entity: "author",
        dataIntegrity: "uuid-1",
      }),
      makeEvent({
        status: "accepted",
        entity: "author",
        dataIntegrity: "uuid-2",
      }),
      makeEvent({
        status: "pending",
        entity: "institution",
        dataIntegrity: "uuid-3",
      }),
    ];
    const result = filterPending(events, { entity: "author" });
    expect(result).toHaveLength(1);
    expect(result[0].dataIntegrity).toBe("uuid-1");
  });
});

describe("filterDuplicates", () => {
  it("replaces existing events with updated ones sharing the same dataIntegrity", () => {
    const existing = [makeEvent({ dataIntegrity: "uuid-1", value: "old" })];
    const updated = [makeEvent({ dataIntegrity: "uuid-1", value: "new" })];
    const result = filterDuplicates(existing, updated);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("new");
  });

  it("keeps existing events whose dataIntegrity is not in updated", () => {
    const existing = [makeEvent({ dataIntegrity: "uuid-1" })];
    const updated = [makeEvent({ dataIntegrity: "uuid-2" })];
    const result = filterDuplicates(existing, updated);
    expect(result).toHaveLength(2);
  });

  it("returns only updated when existing is empty", () => {
    const updated = [makeEvent({ dataIntegrity: "uuid-1" })];
    expect(filterDuplicates([], updated)).toHaveLength(1);
  });
});

describe("removeDuplicates", () => {
  it("returns same array when no duplicates", () => {
    const events = [
      makeEvent({ dataIntegrity: "uuid-1" }),
      makeEvent({ dataIntegrity: "uuid-2" }),
    ];
    expect(removeDuplicates(events)).toHaveLength(2);
  });

  it("removes duplicate events keeping first occurrence", () => {
    const events = [
      makeEvent({ dataIntegrity: "uuid-1", value: "first" }),
      makeEvent({ dataIntegrity: "uuid-2", value: "other" }),
      makeEvent({ dataIntegrity: "uuid-1", value: "duplicate" }),
    ];
    const result = removeDuplicates(events);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe("first");
  });

  it("returns empty array when input is empty", () => {
    expect(removeDuplicates([])).toHaveLength(0);
  });
});
