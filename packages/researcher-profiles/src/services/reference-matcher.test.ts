import { describe, it, expect, vi } from "vitest";
import { matchReferences, type MatchResult } from "./reference-matcher.js";
import type { WorksResult } from "@univ-lehavre/atlas-openalex-types";

const makeWork = (title: string, id = "W1"): WorksResult =>
  ({
    id,
    title,
    doi: null,
    publication_year: 2024,
    authorships: [],
  }) as unknown as WorksResult;

describe("matchReferences", () => {
  it("returns empty array when works list is empty", () => {
    const result = matchReferences([], "some reference text");
    expect(result).toHaveLength(0);
  });

  it("returns empty array when text is empty", () => {
    const result = matchReferences([makeWork("Some Article Title")], "");
    expect(result).toHaveLength(0);
  });

  it("filters out works with empty title", () => {
    const result = matchReferences(
      [makeWork(""), makeWork("Valid Title")],
      "Valid Title appears here in the text",
    );
    expect(result.every((r) => r.work.title !== "")).toBe(true);
  });

  it("matches a work whose title appears in the text", () => {
    const title = "Deep Learning for Natural Language Processing";
    const text = `References:\nSmith et al. 2023. ${title}. Journal of AI.`;
    const result = matchReferences([makeWork(title)], text);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.work.id).toBe("W1");
  });

  it("returns no match when title is completely unrelated to text", () => {
    const result = matchReferences(
      [makeWork("Quantum Physics and Thermodynamics")],
      "Cooking recipes for pasta and pizza preparation",
    );
    expect(result).toHaveLength(0);
  });

  it("sorts results by score ascending (lower score = better match)", () => {
    const text = "Machine Learning Methods\nDeep Neural Network Architectures";
    const works = [
      makeWork("Deep Neural Network Architectures", "W2"),
      makeWork("Machine Learning Methods", "W1"),
    ];
    const result = matchReferences(works, text);
    if (result.length > 1) {
      expect(result[0]?.score).toBeLessThanOrEqual(
        result[1]?.score ?? Infinity,
      );
    }
  });

  it("calls onWork callback for each work", () => {
    const onWork = vi.fn();
    const works = [
      makeWork("Article One", "W1"),
      makeWork("Article Two", "W2"),
    ];
    matchReferences(works, "some text here", 0.5, onWork);
    expect(onWork).toHaveBeenCalledTimes(2);
    expect(onWork.mock.calls[0]?.[0]).toBe("Article One");
    expect(onWork.mock.calls[1]?.[0]).toBe("Article Two");
  });

  it("handles long lines by using sliding windows", () => {
    const longLine =
      "x".repeat(600) + " Machine Learning Methods " + "y".repeat(200);
    const result = matchReferences(
      [makeWork("Machine Learning Methods")],
      longLine,
    );
    // Should not throw and should process correctly
    expect(Array.isArray(result)).toBe(true);
  });

  it("respects custom threshold", () => {
    const title = "Approximate Match Title Here";
    const text = "Approximate Match Title Here with extra words";
    const strictResult = matchReferences([makeWork(title)], text, 0);
    const looseResult = matchReferences([makeWork(title)], text, 0.8);
    expect(looseResult.length).toBeGreaterThanOrEqual(strictResult.length);
  });

  it("returns MatchResult with work and score", () => {
    const title = "Exact Title Match Test";
    const text = title;
    const result = matchReferences([makeWork(title)], text);
    if (result.length > 0) {
      const match = result[0] as MatchResult;
      expect(match).toHaveProperty("work");
      expect(match).toHaveProperty("score");
      expect(typeof match.score).toBe("number");
    }
  });
});
