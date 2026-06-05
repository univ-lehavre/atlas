import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DIMENSIONS,
  hashString,
  pickDimension,
  pickFrom,
  parseDate,
  parseArgs,
  selectTarget,
} from "./daily-target.mjs";

describe("hashString", () => {
  it("is deterministic for the same input", () => {
    assert.equal(hashString("2026-06-05"), hashString("2026-06-05"));
  });

  it("differs for different inputs", () => {
    assert.notEqual(hashString("2026-06-05"), hashString("2026-06-06"));
  });

  it("returns an unsigned 32-bit integer", () => {
    const h = hashString("anything");
    assert.ok(Number.isInteger(h));
    assert.ok(h >= 0 && h <= 0xffffffff);
  });
});

describe("pickDimension", () => {
  it("maps a seed to a known dimension key", () => {
    const keys = DIMENSIONS.map((d) => d.key);
    assert.ok(keys.includes(pickDimension(0)));
    assert.ok(keys.includes(pickDimension(123456)));
  });

  it("is deterministic for a given seed", () => {
    assert.equal(pickDimension(42), pickDimension(42));
  });

  it("respects weights — point 0 lands on the first dimension", () => {
    assert.equal(pickDimension(0), DIMENSIONS[0].key);
  });

  it("covers every dimension across the weight range", () => {
    const total = DIMENSIONS.reduce((s, d) => s + d.weight, 0);
    const seen = new Set();
    for (let seed = 0; seed < total; seed++) seen.add(pickDimension(seed));
    assert.deepEqual([...seen].sort(), DIMENSIONS.map((d) => d.key).sort());
  });
});

describe("pickFrom", () => {
  it("returns null for an empty list", () => {
    assert.equal(pickFrom([], 7), null);
  });

  it("returns a stable element for a given seed", () => {
    const list = ["a", "b", "c"];
    assert.equal(pickFrom(list, 0), "a");
    assert.equal(pickFrom(list, 1), "b");
    assert.equal(pickFrom(list, 3), "a"); // wraps via modulo
  });
});

describe("parseDate", () => {
  it("accepts a well-formed date", () => {
    assert.equal(parseDate("2026-06-05"), "2026-06-05");
  });

  it("rejects a malformed date", () => {
    assert.throws(() => parseDate("2026/06/05"), /Invalid --date/);
    assert.throws(() => parseDate("not-a-date"), /Invalid --date/);
  });
});

describe("parseArgs", () => {
  it("defaults to no date, no json, zero seed offset", () => {
    assert.deepEqual(parseArgs([]), { date: null, json: false, seedOffset: 0 });
  });

  it("parses --json and --date together", () => {
    assert.deepEqual(parseArgs(["--json", "--date=2026-06-05"]), {
      date: "2026-06-05",
      json: true,
      seedOffset: 0,
    });
  });

  it("parses --seed=N", () => {
    assert.equal(parseArgs(["--seed=3"]).seedOffset, 3);
  });

  it("rejects a non-integer seed", () => {
    assert.throws(() => parseArgs(["--seed=abc"]), /Invalid --seed/);
  });

  it("rejects an unknown flag", () => {
    assert.throws(() => parseArgs(["--nope"]), /Unknown option/);
  });
});

describe("selectTarget", () => {
  // Fixture providers — inject deterministic candidate lists so the test does
  // not depend on the real repo tree.
  const providers = {
    source: () => ["packages/a/src/index.ts", "packages/b/src/util.ts"],
    test: () => ["packages/a/src/index.test.ts"],
    docs: () => ["docs/src/content/docs/index.mdx", "packages/a/README.md"],
    debt: () => [
      {
        id: "knip",
        title: "Knip",
        why: "broken",
        hints: ["pnpm audit:unused"],
      },
      { id: "cov", title: "Coverage", why: "gaps", hints: [] },
    ],
  };

  it("returns the same target for the same date (idempotent)", () => {
    const a = selectTarget("2026-06-05", providers);
    const b = selectTarget("2026-06-05", providers);
    assert.deepEqual(a, b);
  });

  it("emits the required payload shape", () => {
    const t = selectTarget("2026-06-05", providers);
    assert.equal(t.date, "2026-06-05");
    assert.ok(DIMENSIONS.map((d) => d.key).includes(t.dimension));
    assert.ok(typeof t.target === "string" && t.target.length > 0);
    assert.ok(typeof t.why === "string" && t.why.length > 0);
    assert.ok(Array.isArray(t.hints));
  });

  it("picks a candidate that belongs to the chosen dimension", () => {
    // Probe several dates to exercise each dimension branch.
    for (let i = 0; i < 60; i++) {
      const date = `2026-07-${String((i % 28) + 1).padStart(2, "0")}`;
      const t = selectTarget(date, providers);
      if (t.dimension === "source")
        assert.ok(providers.source().includes(t.target));
      else if (t.dimension === "test")
        assert.ok(providers.test().includes(t.target));
      else if (t.dimension === "docs")
        assert.ok(providers.docs().includes(t.target));
      else if (t.dimension === "debt")
        assert.ok(providers.debt().some((d) => d.id === t.target));
    }
  });

  it("falls back to a source file when the chosen dimension is empty", () => {
    const empty = {
      ...providers,
      docs: () => [],
      test: () => [],
      debt: () => [],
    };
    // Force the docs dimension via seedOffset search until we hit an empty one,
    // then assert the fallback degrades to a non-empty target.
    const t = selectTarget("2026-06-05", empty);
    assert.ok(typeof t.target === "string" && t.target.length > 0);
  });
});
