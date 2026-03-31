import { describe, it, expect } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { buildIntegrity, uniqueSorted } from "./index.js";
import { ContextStore } from "../store/init.js";
import type { IContext } from "../context/types.js";
import type { ORCID } from "@univ-lehavre/atlas-openalex-types";

const ctx: IContext = {
  type: "author",
  id: "0000" as unknown as ORCID,
  backup: false,
  NAMESPACE: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
};

describe("buildIntegrity", () => {
  it.effect("returns a deterministic UUID-like string for the same data", () =>
    Effect.gen(function* () {
      const data = {
        from: "A1",
        id: "0000",
        entity: "author",
        field: "affiliation",
        value: "I1",
      };
      const result1 = yield* buildIntegrity(data).pipe(
        Effect.provideServiceEffect(ContextStore, Ref.make(ctx)),
      );
      const result2 = yield* buildIntegrity(data).pipe(
        Effect.provideServiceEffect(ContextStore, Ref.make(ctx)),
      );
      expect(result1).toBe(result2);
      expect(typeof result1).toBe("string");
      expect(result1.length).toBeGreaterThan(0);
    }),
  );

  it.effect("returns different hashes for different data", () =>
    Effect.gen(function* () {
      const data1 = {
        from: "A1",
        id: "0000",
        entity: "author",
        field: "affiliation",
        value: "I1",
      };
      const data2 = {
        from: "A1",
        id: "0000",
        entity: "author",
        field: "affiliation",
        value: "I2",
      };
      const r1 = yield* buildIntegrity(data1).pipe(
        Effect.provideServiceEffect(ContextStore, Ref.make(ctx)),
      );
      const r2 = yield* buildIntegrity(data2).pipe(
        Effect.provideServiceEffect(ContextStore, Ref.make(ctx)),
      );
      expect(r1).not.toBe(r2);
    }),
  );
});

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
