import { describe, it, expect } from "vitest";
import { computeEnsembleMatch } from "./ensemble.js";

describe("computeEnsembleMatch", () => {
  it("uses default 50/50 weights when none are provided", () => {
    const result = computeEnsembleMatch(0.4, 0.8, 0.2);
    expect(result.similarity).toBeCloseTo(0.6);
    expect(result.complementarity).toBe(0.2);
    expect(result.tfidfSim).toBe(0.4);
    expect(result.embeddingSim).toBe(0.8);
  });

  it("respects custom ensemble weights", () => {
    const result = computeEnsembleMatch(0.4, 0.8, 0.1, {
      tfidf: 0.25,
      embedding: 0.75,
    });
    expect(result.similarity).toBeCloseTo(0.25 * 0.4 + 0.75 * 0.8);
  });

  it("returns the original signals unchanged", () => {
    const result = computeEnsembleMatch(0, 0, 0);
    expect(result).toEqual({
      similarity: 0,
      complementarity: 0,
      tfidfSim: 0,
      embeddingSim: 0,
    });
  });
});
