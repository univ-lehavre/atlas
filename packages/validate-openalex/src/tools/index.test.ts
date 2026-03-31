import { describe, it, expect } from "vitest";
import { uniqueSorted } from "./index.js";

describe("uniqueSorted", () => {
  it("returns empty array for empty input", () => {
    expect(uniqueSorted([])).toEqual([]);
  });

  it("returns sorted unique strings", () => {
    expect(uniqueSorted(["banana", "apple", "cherry"])).toEqual([
      "apple",
      "banana",
      "cherry",
    ]);
  });

  it("removes duplicates", () => {
    expect(uniqueSorted(["b", "a", "b", "c", "a"])).toEqual(["a", "b", "c"]);
  });

  it("works with numbers", () => {
    expect(uniqueSorted([3, 1, 2, 1, 3])).toEqual([1, 2, 3]);
  });

  it("preserves single element", () => {
    expect(uniqueSorted(["only"])).toEqual(["only"]);
  });
});
