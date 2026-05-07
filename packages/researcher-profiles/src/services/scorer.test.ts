import { describe, it, expect } from "vitest";
import {
  cosineSimilarity,
  embeddingCosineSimilarity,
  complementarityScore,
} from "./scorer.js";
import type { TfidfProfile } from "./tfidf-profile.js";

const profile = (entries: Record<string, number>): TfidfProfile => ({
  researcherId: "R",
  vector: new Map(Object.entries(entries)),
  labels: new Map(),
});

describe("cosineSimilarity", () => {
  it("returns the dot product over the shared keys", () => {
    const a = new Map([
      ["x", 1],
      ["y", 2],
    ]);
    const b = new Map([
      ["x", 3],
      ["z", 4],
    ]);
    expect(cosineSimilarity(a, b)).toBe(3);
  });

  it("returns 0 when there is no shared key", () => {
    const a = new Map([["x", 1]]);
    const b = new Map([["y", 1]]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });
});

describe("embeddingCosineSimilarity", () => {
  it("computes a basic dot product on Float32Array inputs", () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([4, 5, 6]);
    expect(embeddingCosineSimilarity(a, b)).toBeCloseTo(1 * 4 + 2 * 5 + 3 * 6);
  });

  it("treats missing components in b as zero", () => {
    const a = new Float32Array([1, 1]);
    const b = new Float32Array([2]);
    expect(embeddingCosineSimilarity(a, b)).toBeCloseTo(2);
  });
});

describe("complementarityScore", () => {
  it("returns 0 when researchers share no scientific context", () => {
    const a = profile({ "topic::a": 1 });
    const b = profile({ "topic::b": 1 });
    expect(complementarityScore(a, b)).toBe(0);
  });

  it("returns positive score for shared subfield but distinct topics", () => {
    const a = profile({ "subfield::SF1": 1, "topic::A": 1 });
    const b = profile({ "subfield::SF1": 1, "topic::B": 1 });
    const score = complementarityScore(a, b);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("returns 0 when topics are identical (no complementarity)", () => {
    const a = profile({ "subfield::SF1": 1, "topic::A": 1 });
    const b = profile({ "subfield::SF1": 1, "topic::A": 1 });
    expect(complementarityScore(a, b)).toBe(0);
  });

  it("includes keyword similarity when option is enabled", () => {
    const a = profile({
      "subfield::SF1": 1,
      "keyword::ml": 1,
      "topic::A": 1,
    });
    const b = profile({
      "subfield::SF1": 1,
      "keyword::ml": 1,
      "topic::B": 1,
    });
    const without = complementarityScore(a, b);
    const withKw = complementarityScore(a, b, { includeKeywords: true });
    expect(withKw).not.toBe(without);
  });
});
