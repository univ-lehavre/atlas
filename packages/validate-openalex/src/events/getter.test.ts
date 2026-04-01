import { describe, it, expect } from "vitest";
import {
  intersect,
  union,
  outerLeft,
  outerRight,
  getOpenAlexIDs,
  getPendingOpenAlexIDs,
  getRejectedOpenAlexIDs,
  getOpenAlexIDsBasedOnAcceptedWorks,
  getStatusOfAuthorDisplayNameAlternative,
  getStatusOfAffiliation,
  getStatusOfWork,
  existsAcceptedAuthorDisplayNameAlternative,
  getAcceptedWorks,
  getStatuses,
  getStatusesByValue,
  getOpenAlexIDByStatus,
  getOpenAlexIDByStatusDashboard,
  getGlobalStatuses,
  getStatusOfInstitutionAlternativesStrings,
} from "./getter.js";
import type { IEvent } from "./types.js";
import type { OpenAlexID, ORCID } from "@univ-lehavre/atlas-openalex-types";

const orcid = "0000-0001-2345-6789" as unknown as ORCID;
const otherOrcid = "0000-0001-9999-0000" as unknown as ORCID;

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

describe("intersect", () => {
  it("returns elements in both arrays", () => {
    expect(intersect(["a", "b", "c"], ["b", "c", "d"])).toEqual(["b", "c"]);
  });

  it("returns empty array when no overlap", () => {
    expect(intersect(["a"], ["b"])).toEqual([]);
  });

  it("returns empty array when either input is empty", () => {
    expect(intersect([], ["a"])).toEqual([]);
    expect(intersect(["a"], [])).toEqual([]);
  });
});

describe("union", () => {
  it("returns all unique elements from both arrays", () => {
    expect(union(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("returns first array when second is empty", () => {
    expect(union(["a"], [])).toEqual(["a"]);
  });

  it("returns second array elements when first is empty", () => {
    expect(union([], ["a"])).toEqual(["a"]);
  });
});

describe("outerLeft", () => {
  it("returns elements in arr1 not in arr2", () => {
    expect(outerLeft(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });

  it("returns empty when all elements are in arr2", () => {
    expect(outerLeft(["a"], ["a"])).toEqual([]);
  });
});

describe("outerRight", () => {
  it("returns elements in arr2 not in arr1", () => {
    expect(outerRight(["b"], ["a", "b", "c"])).toEqual(["a", "c"]);
  });

  it("returns all of arr2 when arr1 is empty", () => {
    expect(outerRight([], ["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("getOpenAlexIDs", () => {
  it("returns empty array when events is empty", () => {
    expect(getOpenAlexIDs(orcid, [])).toEqual([]);
  });

  it("returns intersection of accepted affiliations and display_name_alternatives, union accepted works", () => {
    const events: IEvent[] = [
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
      makeEvent({
        entity: "work",
        field: "id",
        status: "accepted",
        from: "W1" as unknown as OpenAlexID,
      }),
    ];
    const result = getOpenAlexIDs(orcid, events);
    expect(result).toContain("A1" as unknown as OpenAlexID);
    expect(result).toContain("W1" as unknown as OpenAlexID);
  });

  it("returns empty if affiliation and display_name_alternatives do not intersect and no accepted works", () => {
    const events: IEvent[] = [
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
    const result = getOpenAlexIDs(orcid, events);
    expect(result).toEqual([]);
  });
});

describe("getPendingOpenAlexIDs", () => {
  it("returns empty array when events is empty", () => {
    expect(getPendingOpenAlexIDs(orcid, [])).toEqual([]);
  });

  it("returns IDs pending but not accepted", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "author",
        field: "affiliation",
        status: "pending",
        from: "A1" as unknown as OpenAlexID,
      }),
      makeEvent({
        entity: "author",
        field: "display_name_alternatives",
        status: "pending",
        from: "A1" as unknown as OpenAlexID,
      }),
      makeEvent({
        entity: "author",
        field: "affiliation",
        status: "accepted",
        from: "A2" as unknown as OpenAlexID,
      }),
      makeEvent({
        entity: "author",
        field: "display_name_alternatives",
        status: "accepted",
        from: "A2" as unknown as OpenAlexID,
      }),
    ];
    const result = getPendingOpenAlexIDs(orcid, events);
    expect(result).toContain("A1" as unknown as OpenAlexID);
    expect(result).not.toContain("A2" as unknown as OpenAlexID);
  });
});

describe("getRejectedOpenAlexIDs", () => {
  it("returns empty array when events is empty", () => {
    expect(getRejectedOpenAlexIDs(orcid, [])).toEqual([]);
  });

  it("returns IDs that are neither accepted nor pending", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "author",
        field: "affiliation",
        status: "rejected",
        from: "A3" as unknown as OpenAlexID,
      }),
      makeEvent({
        entity: "author",
        field: "display_name_alternatives",
        status: "rejected",
        from: "A3" as unknown as OpenAlexID,
      }),
    ];
    const result = getRejectedOpenAlexIDs(orcid, events);
    expect(result).toContain("A3" as unknown as OpenAlexID);
  });
});

describe("getOpenAlexIDsBasedOnAcceptedWorks", () => {
  it("returns empty array when events is empty", () => {
    expect(getOpenAlexIDsBasedOnAcceptedWorks(orcid, [])).toEqual([]);
  });

  it("returns from values of accepted work events", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "work",
        field: "id",
        status: "accepted",
        from: "W1" as unknown as OpenAlexID,
      }),
      makeEvent({
        entity: "work",
        field: "id",
        status: "pending",
        from: "W2" as unknown as OpenAlexID,
      }),
    ];
    const result = getOpenAlexIDsBasedOnAcceptedWorks(orcid, events);
    expect(result).toContain("W1" as unknown as OpenAlexID);
    expect(result).not.toContain("W2" as unknown as OpenAlexID);
  });
});

describe("getStatusOfAuthorDisplayNameAlternative", () => {
  it("returns status when matching event found", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "author",
        field: "display_name_alternatives",
        value: "Alice",
        status: "accepted",
      }),
    ];
    expect(
      getStatusOfAuthorDisplayNameAlternative(
        "Alice",
        orcid as unknown as string,
        events,
      ),
    ).toBe("accepted");
  });

  it("returns undefined when no matching event", () => {
    expect(
      getStatusOfAuthorDisplayNameAlternative(
        "Bob",
        orcid as unknown as string,
        [],
      ),
    ).toBeUndefined();
  });
});

describe("getStatusOfAffiliation", () => {
  it("returns status when matching affiliation found", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "author",
        field: "affiliation",
        value: "I1",
        status: "rejected",
      }),
    ];
    expect(
      getStatusOfAffiliation("I1", orcid as unknown as string, events),
    ).toBe("rejected");
  });

  it("returns undefined when not found", () => {
    expect(
      getStatusOfAffiliation("I99", orcid as unknown as string, []),
    ).toBeUndefined();
  });
});

describe("getStatusOfWork", () => {
  it("returns status when matching work found", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "work",
        field: "id",
        value: "W1",
        status: "pending",
      }),
    ];
    expect(getStatusOfWork("W1", orcid as unknown as string, events)).toBe(
      "pending",
    );
  });

  it("returns undefined when not found", () => {
    expect(
      getStatusOfWork("W99", orcid as unknown as string, []),
    ).toBeUndefined();
  });
});

describe("existsAcceptedAuthorDisplayNameAlternative", () => {
  it("returns true when accepted display name alternative exists", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "author",
        field: "display_name_alternatives",
        value: "Alice",
        status: "accepted",
      }),
    ];
    expect(
      existsAcceptedAuthorDisplayNameAlternative(
        "Alice",
        orcid as unknown as string,
        events,
      ),
    ).toBe(true);
  });

  it("returns false when status is not accepted", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "author",
        field: "display_name_alternatives",
        value: "Alice",
        status: "pending",
      }),
    ];
    expect(
      existsAcceptedAuthorDisplayNameAlternative(
        "Alice",
        orcid as unknown as string,
        events,
      ),
    ).toBe(false);
  });

  it("returns false when not found", () => {
    expect(
      existsAcceptedAuthorDisplayNameAlternative(
        "Alice",
        orcid as unknown as string,
        [],
      ),
    ).toBe(false);
  });
});

describe("getAcceptedWorks", () => {
  it("returns empty array when events is empty", () => {
    expect(getAcceptedWorks(orcid, [])).toEqual([]);
  });

  it("returns id and title for accepted work events", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "work",
        field: "id",
        status: "accepted",
        value: "W1",
        label: "My Paper",
      }),
      makeEvent({
        entity: "work",
        field: "id",
        status: "pending",
        value: "W2",
        label: "Other Paper",
      }),
    ];
    const result = getAcceptedWorks(orcid, events);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ id: "W1", title: "My Paper" });
  });

  it("returns works only for the matching orcid", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "work",
        field: "id",
        status: "accepted",
        value: "W1",
        id: orcid,
      }),
      makeEvent({
        entity: "work",
        field: "id",
        status: "accepted",
        value: "W2",
        id: otherOrcid,
      }),
    ];
    const result = getAcceptedWorks(orcid, events);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("W1");
  });
});

describe("getStatuses", () => {
  it("returns a string (with dots) when no events match", () => {
    // When empty, counts are "·" (not 0), so the condition for null (0===0&&0===0&&0===0) is not met
    const result = getStatuses(orcid, "author", "affiliation", []);
    expect(typeof result).toBe("string");
  });

  it("returns a non-null string when events exist", () => {
    const events: IEvent[] = [
      makeEvent({ entity: "author", field: "affiliation", status: "accepted" }),
    ];
    const result = getStatuses(orcid, "author", "affiliation", events);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });
});

describe("getStatusesByValue", () => {
  it("returns a string (with dots) when no events match", () => {
    // Similar to getStatuses, "·" != 0 so null condition is not triggered
    const result = getStatusesByValue(orcid, "author", "affiliation", []);
    expect(typeof result).toBe("string");
  });

  it("returns a non-null string when events exist", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "author",
        field: "affiliation",
        status: "pending",
        value: "I1",
      }),
      makeEvent({
        entity: "author",
        field: "affiliation",
        status: "rejected",
        value: "I2",
      }),
    ];
    const result = getStatusesByValue(orcid, "author", "affiliation", events);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });
});

describe("getOpenAlexIDByStatus", () => {
  const validID = "https://openalex.org/A1234567890" as unknown as OpenAlexID;

  it("returns empty map when events is empty", () => {
    const result = getOpenAlexIDByStatus(orcid, []);
    expect(result.size).toBe(0);
  });

  it("sets status to accepted when affiliation, display_name_alternatives and work are all accepted", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "author",
        field: "affiliation",
        status: "accepted",
        from: validID,
      }),
      makeEvent({
        entity: "author",
        field: "display_name_alternatives",
        status: "accepted",
        from: validID,
      }),
      makeEvent({
        entity: "work",
        field: "id",
        status: "accepted",
        from: validID,
      }),
    ];
    const result = getOpenAlexIDByStatus(orcid, events);
    expect(result.get(validID)).toBe("accepted");
  });

  it("sets status to pending when only some are accepted", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "author",
        field: "affiliation",
        status: "accepted",
        from: validID,
      }),
      makeEvent({
        entity: "author",
        field: "display_name_alternatives",
        status: "pending",
        from: validID,
      }),
    ];
    const result = getOpenAlexIDByStatus(orcid, events);
    expect(result.get(validID)).toBe("pending");
  });

  it("sets status to rejected when only rejected events", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "author",
        field: "affiliation",
        status: "rejected",
        from: validID,
      }),
      makeEvent({
        entity: "author",
        field: "display_name_alternatives",
        status: "rejected",
        from: validID,
      }),
    ];
    const result = getOpenAlexIDByStatus(orcid, events);
    expect(result.get(validID)).toBe("rejected");
  });
});

describe("getOpenAlexIDByStatusDashboard", () => {
  it("returns null when no events match the orcid", () => {
    // When all counts are 0, returns null
    const result = getOpenAlexIDByStatusDashboard(orcid, []);
    expect(result).toBeNull();
  });

  it("returns non-null string when events exist", () => {
    const validID = "https://openalex.org/A1234567890" as unknown as OpenAlexID;
    const events: IEvent[] = [
      makeEvent({
        entity: "author",
        field: "affiliation",
        status: "accepted",
        from: validID,
      }),
      makeEvent({
        entity: "author",
        field: "display_name_alternatives",
        status: "accepted",
        from: validID,
      }),
    ];
    const result = getOpenAlexIDByStatusDashboard(orcid, events);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });
});

describe("getGlobalStatuses", () => {
  it("returns a string (with dots) when no events match", () => {
    // When empty, statuses are "·" not 0, so null condition is not triggered
    const result = getGlobalStatuses(orcid, []);
    expect(typeof result).toBe("string");
  });

  it("returns non-null string when events exist for the orcid", () => {
    const events: IEvent[] = [
      makeEvent({ status: "pending" }),
      makeEvent({ status: "accepted" }),
    ];
    const result = getGlobalStatuses(orcid, events);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });
});

describe("getStatusOfInstitutionAlternativesStrings", () => {
  it("returns status when matching institution display_name_alternatives event found", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "institution",
        field: "display_name_alternatives",
        value: "Alt Name",
        status: "accepted",
      }),
    ];
    expect(
      getStatusOfInstitutionAlternativesStrings(
        "Alt Name",
        orcid as unknown as string,
        events,
      ),
    ).toBe("accepted");
  });

  it("returns undefined when no matching event", () => {
    expect(
      getStatusOfInstitutionAlternativesStrings(
        "Not Found",
        orcid as unknown as string,
        [],
      ),
    ).toBeUndefined();
  });

  it("returns undefined when entity does not match institution", () => {
    const events: IEvent[] = [
      makeEvent({
        entity: "author",
        field: "display_name_alternatives",
        value: "Alt Name",
        status: "accepted",
      }),
    ];
    expect(
      getStatusOfInstitutionAlternativesStrings(
        "Alt Name",
        orcid as unknown as string,
        events,
      ),
    ).toBeUndefined();
  });
});
