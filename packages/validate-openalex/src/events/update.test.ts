import { describe, it, expect } from "vitest";
import { updateNewEventsWithExistingMetadata } from "./update.js";
import type { IEvent } from "./types.js";
import type { OpenAlexID, ORCID } from "@univ-lehavre/atlas-openalex-types";

const makeEvent = (overrides: Partial<IEvent> = {}): IEvent => ({
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  dataIntegrity: "hash",
  hasBeenExtendedAt: "never",
  status: "pending",
  from: "A1" as unknown as OpenAlexID,
  id: "0000" as unknown as ORCID,
  entity: "author",
  field: "affiliation",
  value: "I1",
  ...overrides,
});

describe("updateNewEventsWithExistingMetadata", () => {
  it("keeps new event as-is when not found in existing", () => {
    const existing: IEvent[] = [makeEvent({ value: "I2" })];
    const newEvents: IEvent[] = [makeEvent({ value: "I1" })];
    const result = updateNewEventsWithExistingMetadata(existing, newEvents);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(newEvents[0]);
  });

  it("copies both status and hasBeenExtendedAt when matched, alreadyExtended, and alreadyAcceptedOrRejected", () => {
    const existing: IEvent[] = [
      makeEvent({ hasBeenExtendedAt: "2024-02-01", status: "accepted" }),
    ];
    const newEvents: IEvent[] = [
      makeEvent({ hasBeenExtendedAt: "never", status: "pending" }),
    ];
    const result = updateNewEventsWithExistingMetadata(existing, newEvents);
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe("accepted");
    expect(result[0]!.hasBeenExtendedAt).toBe("2024-02-01");
  });

  it("copies only hasBeenExtendedAt when matched and only alreadyExtended", () => {
    const existing: IEvent[] = [
      makeEvent({ hasBeenExtendedAt: "2024-03-01", status: "pending" }),
    ];
    const newEvents: IEvent[] = [
      makeEvent({ hasBeenExtendedAt: "never", status: "pending" }),
    ];
    const result = updateNewEventsWithExistingMetadata(existing, newEvents);
    expect(result).toHaveLength(1);
    expect(result[0]!.hasBeenExtendedAt).toBe("2024-03-01");
    expect(result[0]!.status).toBe("pending");
  });

  it("copies only status when matched and only alreadyAcceptedOrRejected", () => {
    const existing: IEvent[] = [
      makeEvent({ hasBeenExtendedAt: "never", status: "rejected" }),
    ];
    const newEvents: IEvent[] = [
      makeEvent({ hasBeenExtendedAt: "never", status: "pending" }),
    ];
    const result = updateNewEventsWithExistingMetadata(existing, newEvents);
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe("rejected");
    expect(result[0]!.hasBeenExtendedAt).toBe("never");
  });

  it("keeps new event as-is when matched but no extended or accepted", () => {
    const existing: IEvent[] = [
      makeEvent({ hasBeenExtendedAt: "never", status: "pending" }),
    ];
    const newEvents: IEvent[] = [
      makeEvent({ hasBeenExtendedAt: "never", status: "pending" }),
    ];
    const result = updateNewEventsWithExistingMetadata(existing, newEvents);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(newEvents[0]);
  });

  it("returns newEvents unchanged when existing is empty", () => {
    const existing: IEvent[] = [];
    const newEvents: IEvent[] = [makeEvent(), makeEvent({ value: "I2" })];
    const result = updateNewEventsWithExistingMetadata(existing, newEvents);
    expect(result).toEqual(newEvents);
  });
});
