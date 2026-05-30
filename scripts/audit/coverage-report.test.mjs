import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseArgs,
  summarize,
  findOverSkippedPackages,
} from "./coverage-report.mjs";

describe("parseArgs", () => {
  it("defaults to target 80, maxSkipped null, strict false", () => {
    assert.deepEqual(parseArgs([]), {
      target: 80,
      maxSkipped: null,
      strict: false,
    });
  });

  it("parses the positional target", () => {
    assert.equal(parseArgs(["50"]).target, 50);
  });

  it("parses --max-skipped=N", () => {
    assert.equal(parseArgs(["--max-skipped=20"]).maxSkipped, 20);
  });

  it("parses --strict", () => {
    assert.equal(parseArgs(["--strict"]).strict, true);
  });

  it("parses all options together regardless of order", () => {
    assert.deepEqual(parseArgs(["--strict", "70", "--max-skipped=5"]), {
      target: 70,
      maxSkipped: 5,
      strict: true,
    });
  });

  it("rejects --max-skipped with a non-integer value", () => {
    assert.throws(
      () => parseArgs(["--max-skipped=abc"]),
      /Invalid --max-skipped/,
    );
  });

  it("rejects --max-skipped with a negative value", () => {
    assert.throws(
      () => parseArgs(["--max-skipped=-1"]),
      /Invalid --max-skipped/,
    );
  });

  it("rejects an unknown flag", () => {
    assert.throws(() => parseArgs(["--unknown"]), /Unknown option/);
  });

  it("rejects an out-of-range target", () => {
    assert.throws(() => parseArgs(["150"]), /Invalid target/);
  });
});

describe("summarize", () => {
  it("lists files with no covered statements nor functions in zeroFiles", () => {
    const coverage = {
      "src/dead.ts": {
        s: { 0: 0, 1: 0 },
        f: { 0: 0 },
        b: {},
        statementMap: { 0: { start: { line: 1 } }, 1: { start: { line: 2 } } },
      },
    };
    const out = summarize(coverage);
    assert.deepEqual(out.zeroFiles, ["src/dead.ts"]);
    // Metrics for a fully-skipped file aren't accounted for.
    assert.equal(out.metrics.statements.total, 0);
  });

  it("counts covered statements/branches/functions/lines on a touched file", () => {
    const coverage = {
      "src/live.ts": {
        s: { 0: 3, 1: 0 },
        f: { 0: 1 },
        b: { 0: [1, 0] },
        statementMap: {
          0: { start: { line: 1 } },
          1: { start: { line: 2 } },
        },
      },
    };
    const out = summarize(coverage);
    assert.equal(out.zeroFiles.length, 0);
    assert.equal(out.metrics.statements.covered, 1);
    assert.equal(out.metrics.statements.total, 2);
    assert.equal(out.metrics.functions.covered, 1);
    assert.equal(out.metrics.functions.total, 1);
    assert.equal(out.metrics.branches.covered, 1);
    assert.equal(out.metrics.branches.total, 2);
    assert.equal(out.metrics.lines.covered, 1);
    assert.equal(out.metrics.lines.total, 2);
  });
});

describe("findOverSkippedPackages", () => {
  const rows = [
    {
      name: "@univ-lehavre/atlas-a",
      dir: "packages",
      missing: false,
      zeroFiles: [],
    },
    {
      name: "@univ-lehavre/atlas-b",
      dir: "packages",
      missing: false,
      zeroFiles: ["x", "y", "z"],
    },
    {
      name: "@univ-lehavre/atlas-c",
      dir: "cli",
      missing: false,
      zeroFiles: ["a"],
    },
    { name: "@univ-lehavre/atlas-d", dir: "cli", missing: true, zeroFiles: [] },
  ];

  it("returns nothing when maxSkipped is null", () => {
    assert.deepEqual(findOverSkippedPackages(rows, null), []);
  });

  it("returns packages strictly above the threshold", () => {
    const out = findOverSkippedPackages(rows, 2);
    assert.equal(out.length, 1);
    assert.equal(out[0].name, "@univ-lehavre/atlas-b");
    assert.equal(out[0].count, 3);
  });

  it("returns nothing when no package exceeds the threshold", () => {
    assert.deepEqual(findOverSkippedPackages(rows, 5), []);
  });

  it("ignores packages flagged as missing coverage data", () => {
    const out = findOverSkippedPackages(rows, 0);
    assert.ok(!out.find((r) => r.name === "@univ-lehavre/atlas-d"));
  });
});
