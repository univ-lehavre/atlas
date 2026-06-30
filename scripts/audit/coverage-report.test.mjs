import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  parseArgs,
  summarize,
  findOverSkippedPackages,
  readDeclaredThreshold,
  effectiveTarget,
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

describe("readDeclaredThreshold", () => {
  // Faux lecteur : map chemin → contenu, lève si absent (comme readFileSync).
  const reader = (files) => (path) => {
    if (!(path in files)) throw new Error("ENOENT");
    return files[path];
  };

  it("reads the lowest of the four declared thresholds (single line)", () => {
    const src = `thresholds: { statements: 88, branches: 80, functions: 95, lines: 88 },`;
    const t = readDeclaredThreshold(
      "vitest.config.ts",
      reader({ "vitest.config.ts": src }),
    );
    assert.equal(t, 80);
  });

  it("tolerates a multi-line thresholds block", () => {
    const src = [
      "thresholds: {",
      "  statements: 22,",
      "  branches: 12,",
      "  functions: 15,",
      "  lines: 25,",
      "},",
    ].join("\n");
    const t = readDeclaredThreshold(
      "vite.config.ts",
      reader({ "vite.config.ts": src }),
    );
    assert.equal(t, 12);
  });

  it("falls back to the second path (vite.config) when the first is absent", () => {
    const t = readDeclaredThreshold(
      ["vitest.config.ts", "vite.config.ts"],
      reader({
        "vite.config.ts":
          "thresholds: { statements: 50, branches: 48, functions: 32, lines: 53 }",
      }),
    );
    assert.equal(t, 32);
  });

  it("returns null when no config declares a thresholds block", () => {
    const src = `coverage: coverageConfig({ reporter: ['json'] })`;
    const t = readDeclaredThreshold(
      "vitest.config.ts",
      reader({ "vitest.config.ts": src }),
    );
    assert.equal(t, null);
  });

  it("returns null when every config path is unreadable", () => {
    const t = readDeclaredThreshold(["a.ts", "b.ts"], reader({}));
    assert.equal(t, null);
  });
});

describe("effectiveTarget", () => {
  it("uses the declared threshold when it is below the global target", () => {
    assert.equal(effectiveTarget(32, 80), 32);
  });

  it("uses the global target when the declared threshold is at or above it", () => {
    assert.equal(effectiveTarget(85, 80), 80);
    assert.equal(effectiveTarget(80, 80), 80);
  });

  it("exempts a private package with no declared threshold (returns 0)", () => {
    assert.equal(effectiveTarget(null, 80, true), 0);
  });

  it("holds a PUBLISHED package with no declared threshold to the global target", () => {
    assert.equal(effectiveTarget(null, 80, false), 80);
  });
});
