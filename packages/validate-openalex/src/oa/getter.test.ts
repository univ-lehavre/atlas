import { describe, it, expect } from "vitest";
import { Either } from "effect";
import { getAffiliationLabel } from "./getter.js";
import type {
  OpenAlexID,
  WorksResult,
} from "@univ-lehavre/atlas-openalex-types";

const makeWork = (
  institutions: { id: string; display_name: string }[],
): WorksResult =>
  ({ authorships: [{ institutions }] }) as unknown as WorksResult;

describe("getAffiliationLabel", () => {
  it("returns Right with display_name when affiliation is found", () => {
    const work = makeWork([
      { id: "I1", display_name: "University of Le Havre" },
      { id: "I2", display_name: "CNRS" },
    ]);
    const result = getAffiliationLabel(work, "I1" as unknown as OpenAlexID);
    expect(Either.isRight(result)).toBe(true);
    expect((result as Either.Right<string, Error>).right).toBe(
      "University of Le Havre",
    );
  });

  it("returns Left with Error when affiliation is not found", () => {
    const work = makeWork([
      { id: "I1", display_name: "University of Le Havre" },
    ]);
    const result = getAffiliationLabel(work, "I99" as unknown as OpenAlexID);
    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<string, Error>).left).toBeInstanceOf(Error);
    expect((result as Either.Left<string, Error>).left.message).toBe(
      "Affiliation not found",
    );
  });

  it("returns Left when authorships have no institutions", () => {
    const work = makeWork([]);
    const result = getAffiliationLabel(work, "I1" as unknown as OpenAlexID);
    expect(Either.isLeft(result)).toBe(true);
  });
});
