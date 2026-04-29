import { describe, expect, it } from "vitest";
import {
  groupByGeneric,
  groupByGenericIndices,
  jaccard,
  levenshtein,
  ngramSimilarity,
  ngramsOf,
  normalizeString,
  prepareItems,
  similarity,
} from "./helpers.js";

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("abc", "abc")).toBe(0);
  });

  it("returns length of b when a is empty", () => {
    expect(levenshtein("", "abc")).toBe(3);
  });

  it("returns length of a when b is empty", () => {
    expect(levenshtein("abc", "")).toBe(3);
  });

  it("computes distance between different strings", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});

describe("similarity", () => {
  it("returns 1 for identical strings", () => {
    expect(similarity("abc", "abc")).toBe(1);
  });

  it("returns 1 for two empty strings", () => {
    expect(similarity("", "")).toBe(1);
  });

  it("returns value between 0 and 1 for different strings", () => {
    const s = similarity("Paris", "Pari");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});

describe("prepareItems", () => {
  it("keeps duplicates when keepDuplicates=true", () => {
    expect(prepareItems(["a", "a", "A"], true)).toEqual(["a", "a", "A"]);
  });

  it("deduplicates case-insensitively when keepDuplicates=false", () => {
    expect(prepareItems(["Paris", "paris", "PARIS"], false)).toEqual(["Paris"]);
  });

  it("converts non-string values to strings", () => {
    const input = [null as unknown as string, 42 as unknown as string];
    expect(prepareItems(input, true)).toEqual(["null", "42"]);
  });
});

describe("ngramsOf", () => {
  it("returns empty set for n <= 0", () => {
    expect(ngramsOf("abc", 0).size).toBe(0);
  });

  it("returns bigrams", () => {
    const bg = ngramsOf("abc", 2);
    expect(bg).toContain("ab");
    expect(bg).toContain("bc");
    expect(bg.size).toBe(2);
  });

  it("returns empty set when string shorter than n", () => {
    expect(ngramsOf("a", 3).size).toBe(0);
  });
});

describe("jaccard", () => {
  it("returns 1 for two empty sets", () => {
    expect(jaccard(new Set(), new Set())).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    expect(jaccard(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("returns 1 for identical sets", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });

  it("returns correct value for partial overlap", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["b", "c"]))).toBeCloseTo(
      1 / 3,
    );
  });
});

describe("ngramSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(ngramSimilarity("abc", "abc")).toBe(1);
  });

  it("applies weights when provided", () => {
    const s = ngramSimilarity("paris", "pariss", [2, 3], [1, 0]);
    expect(typeof s).toBe("number");
    expect(s).toBeGreaterThanOrEqual(0);
  });

  it("uses totalW fallback of 1 when all weights are zero", () => {
    const s = ngramSimilarity("paris", "pariss", [2, 3], [0, 0]);
    expect(typeof s).toBe("number");
    expect(s).toBeGreaterThanOrEqual(0);
  });

  it("falls back to equal weights when none provided", () => {
    const s = ngramSimilarity("paris", "pariss", [2, 3]);
    expect(s).toBeGreaterThan(0);
  });
});

describe("normalizeString", () => {
  it("removes diacritics by default", () => {
    expect(normalizeString("éàü")).toBe("eau");
  });

  it("removes punctuation by default", () => {
    expect(normalizeString("hello!")).toBe("hello");
  });

  it("collapses whitespace by default", () => {
    expect(normalizeString("a  b")).toBe("a b");
  });

  it("lowercases by default", () => {
    expect(normalizeString("ABC")).toBe("abc");
  });

  it("respects options when all disabled", () => {
    const s = normalizeString("Héllo!", {
      removeDiacritics: false,
      removePunctuation: false,
      collapseWhitespace: false,
      lower: false,
    });
    expect(s).toBe("Héllo!");
  });
});

describe("groupByGenericIndices", () => {
  it("throws TypeError for non-array input", () => {
    expect(() =>
      groupByGenericIndices(null as unknown as string[], 0.8, similarity),
    ).toThrow(TypeError);
  });

  it("returns empty for empty array", () => {
    const { groupsIndices, items, norms } = groupByGenericIndices(
      [],
      0.8,
      similarity,
    );
    expect(groupsIndices).toEqual([]);
    expect(items).toEqual([]);
    expect(norms).toEqual([]);
  });

  it("groups similar strings", () => {
    const { groupsIndices } = groupByGenericIndices(
      ["Paris", "Pariss"],
      0.7,
      similarity,
    );
    expect(groupsIndices.length).toBe(1);
    expect(groupsIndices[0].length).toBe(2);
  });

  it("respects normalize: false", () => {
    const { norms, items } = groupByGenericIndices(["ABC"], 0.8, similarity, {
      normalize: false,
    });
    expect(norms[0]).toBe(items[0]);
  });
});

describe("groupByGeneric", () => {
  it("returns grouped strings", () => {
    const groups = groupByGeneric(["Paris", "Pariss", "Lyon"], 0.7, similarity);
    expect(
      groups.some((g) => g.includes("Paris") && g.includes("Pariss")),
    ).toBe(true);
  });
});
