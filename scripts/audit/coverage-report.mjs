import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";

// Parse args separately so the helper is testable.
// Usage: node coverage-report.mjs [target] [--strict] [--max-skipped=N]
//   target       Coverage % every package must reach (default 80).
//   --strict     Verbose listing of files at 0% per package with line counts.
//   --max-skipped=N  Fail (exit 1) if any package has more than N files at 0%.
export const parseArgs = (argv) => {
  let target = 80;
  let maxSkipped = null;
  let strict = false;
  const positional = [];
  for (const arg of argv) {
    if (arg.startsWith("--max-skipped=")) {
      const raw = arg.slice("--max-skipped=".length);
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) {
        throw new Error(`Invalid --max-skipped value: ${raw}`);
      }
      maxSkipped = n;
    } else if (arg === "--strict") {
      strict = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional[0] !== undefined) {
    const n = Number(positional[0]);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      throw new Error(`Invalid target value: ${positional[0]}`);
    }
    target = n;
  }
  return { target, maxSkipped, strict };
};

const empty = () => ({ covered: 0, total: 0 });
const pct = ({ covered, total }) =>
  total === 0 ? 100 : (covered / total) * 100;
const fmt = (value) => value.toFixed(1).padStart(6);

export const summarize = (coverage) => {
  const metrics = {
    statements: empty(),
    branches: empty(),
    functions: empty(),
    lines: empty(),
  };
  const zeroFiles = [];

  for (const [filePath, file] of Object.entries(coverage)) {
    const stmtHits = Object.values(file.s ?? {});
    const funcHits = Object.values(file.f ?? {});
    const hasStatements = stmtHits.length > 0;
    const stmtsCovered = stmtHits.some((h) => h > 0);
    const funcsCovered = funcHits.some((h) => h > 0);

    if (hasStatements && !stmtsCovered && !funcsCovered) {
      zeroFiles.push(filePath);
      continue;
    }

    const lines = new Map();

    for (const [id, hits] of Object.entries(file.s ?? {})) {
      metrics.statements.total += 1;
      if (hits > 0) metrics.statements.covered += 1;
      const line = file.statementMap?.[id]?.start?.line;
      if (line !== undefined) {
        lines.set(line, (lines.get(line) ?? false) || hits > 0);
      }
    }

    for (const hits of funcHits) {
      metrics.functions.total += 1;
      if (hits > 0) metrics.functions.covered += 1;
    }

    for (const branchHits of Object.values(file.b ?? {})) {
      for (const hits of branchHits) {
        metrics.branches.total += 1;
        if (hits > 0) metrics.branches.covered += 1;
      }
    }

    for (const covered of lines.values()) {
      metrics.lines.total += 1;
      if (covered) metrics.lines.covered += 1;
    }
  }

  return {
    metrics,
    statements: pct(metrics.statements),
    branches: pct(metrics.branches),
    functions: pct(metrics.functions),
    lines: pct(metrics.lines),
    zeroFiles,
  };
};

const summarizeRows = (rows) => {
  const metrics = {
    statements: empty(),
    branches: empty(),
    functions: empty(),
    lines: empty(),
  };

  for (const row of rows) {
    for (const key of Object.keys(metrics)) {
      metrics[key].covered += row.metrics[key].covered;
      metrics[key].total += row.metrics[key].total;
    }
  }

  return {
    dir: "total",
    name: `${rows.length} packages`,
    metrics,
    missing: false,
    statements: pct(metrics.statements),
    branches: pct(metrics.branches),
    functions: pct(metrics.functions),
    lines: pct(metrics.lines),
    zeroFiles: rows.flatMap((row) => row.zeroFiles),
  };
};

const SHORT_PREFIX = "@univ-lehavre/atlas-";
const shortName = (name) => name.replace(SHORT_PREFIX, "");

// Try to read the file directly rather than stat-then-read. Avoids a
// TOCTOU (time-of-check to time-of-use) gap that CodeQL flags as a
// potential file-system race condition.
const countLines = (path) => {
  try {
    return readFileSync(path, "utf8").split("\n").length;
  } catch {
    return null;
  }
};

// Returns the list of (package, skippedCount) above the configured max.
// maxSkipped = null means no enforcement.
export const findOverSkippedPackages = (rows, maxSkipped) => {
  if (maxSkipped === null) return [];
  return rows
    .filter((r) => !r.missing && r.zeroFiles.length > maxSkipped)
    .map((r) => ({ name: r.name, dir: r.dir, count: r.zeroFiles.length }));
};

// Main script body. Skipped when this module is imported (e.g. from tests).
const main = () => {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  const { target, maxSkipped, strict } = parsed;

  const useColor = process.stdout.isTTY;
  const red = (s) => (useColor ? `\x1b[31m${s}\x1b[0m` : s);
  const yellow = (s) => (useColor ? `\x1b[33m${s}\x1b[0m` : s);
  const green = (s) => (useColor ? `\x1b[32m${s}\x1b[0m` : s);
  const dim = (s) => (useColor ? `\x1b[2m${s}\x1b[0m` : s);

  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
  const coverageFile = "coverage/coverage-final.json";

  const workspaceFiles = execFileSync(
    "pnpm",
    ["ls", "-r", "--json", "--depth", "-1"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );

  const allWorkspaces = JSON.parse(workspaceFiles)
    .filter((workspace) => workspace.path !== root)
    .map((workspace) => {
      const rel = relative(root, workspace.path);
      const dir = rel.split("/")[0] ?? "";
      return {
        name: workspace.name,
        path: workspace.path,
        dir,
        coveragePath: `${workspace.path}/${coverageFile}`,
        hasVitest: existsSync(`${workspace.path}/vitest.config.ts`),
        hasCoverage: existsSync(`${workspace.path}/${coverageFile}`),
      };
    });

  const DIR_COL = 9;
  const COL = 28;

  const colorPct = (value) => {
    const s = fmt(value);
    if (value < target * 0.5) return red(s);
    if (value < target) return yellow(s);
    return green(s);
  };

  const vitestPackages = allWorkspaces.filter((w) => w.hasVitest);
  const noVitestPackages = allWorkspaces.filter((w) => !w.hasVitest);

  const rows = vitestPackages.map((workspace) => {
    if (!workspace.hasCoverage) return { ...workspace, missing: true };
    const coverage = JSON.parse(readFileSync(workspace.coveragePath, "utf8"));
    return { ...workspace, missing: false, ...summarize(coverage) };
  });

  rows.sort((a, b) => {
    if (a.missing && !b.missing) return 1;
    if (!a.missing && b.missing) return -1;
    if (a.missing && b.missing) return a.name.localeCompare(b.name);
    const dirCmp = a.dir.localeCompare(b.dir);
    if (dirCmp !== 0) return dirCmp;
    const gapA = Math.max(
      0,
      target - Math.min(a.statements, a.branches, a.functions, a.lines),
    );
    const gapB = Math.max(
      0,
      target - Math.min(b.statements, b.branches, b.functions, b.lines),
    );
    return gapB - gapA;
  });

  const covered = rows.filter((r) => !r.missing);
  const missing = rows.filter((r) => r.missing);

  const SEPARATOR = dim("·".repeat(DIR_COL + COL + 46));

  const printRow = (row) => {
    const lowest = Math.min(
      row.statements,
      row.branches,
      row.functions,
      row.lines,
    );
    const gap = Math.max(0, target - lowest);
    const gapStr =
      gap === 0 ? green(fmt(0)) : gap > 20 ? red(fmt(gap)) : yellow(fmt(gap));
    const skipped =
      row.zeroFiles.length > 0
        ? dim(String(row.zeroFiles.length).padStart(8))
        : "        ";
    console.log(
      dim(row.dir.padEnd(DIR_COL)) + shortName(row.name).padEnd(COL),
      colorPct(row.statements),
      colorPct(row.branches),
      colorPct(row.functions),
      colorPct(row.lines),
      gapStr,
      skipped,
    );
  };

  const maxSkippedStr = maxSkipped === null ? "∞" : String(maxSkipped);
  console.log(
    `Coverage target: ${target}%  (files with 0% stmts+funcs excluded ; max-skipped=${maxSkippedStr})\n`,
  );
  console.log(
    "Dir".padEnd(DIR_COL) + "Package".padEnd(COL),
    " Stmts Branch  Funcs  Lines    Gap  Skipped",
  );
  console.log("─".repeat(DIR_COL + COL + 46));

  let lastDir = null;
  for (const row of covered) {
    if (lastDir !== null && row.dir !== lastDir) {
      console.log(SEPARATOR);
    }
    lastDir = row.dir;
    printRow(row);
  }

  if (covered.length > 0) {
    console.log("─".repeat(DIR_COL + COL + 46));
    printRow(summarizeRows(covered));
  }

  if (missing.length > 0) {
    console.log("");
    console.log(
      dim(
        `Packages with vitest but no coverage data (run pnpm test:coverage):`,
      ),
    );
    for (const row of missing) {
      console.log(dim(`  ${shortName(row.name)}`));
    }
  }

  if (noVitestPackages.length > 0) {
    console.log("");
    console.log(
      dim(`Packages without tests (${noVitestPackages.length}):`),
      dim(noVitestPackages.map((w) => shortName(w.name)).join(", ")),
    );
  }

  // Strict mode: list every file at 0% per package, with line count.
  if (strict) {
    const withZero = covered.filter((r) => r.zeroFiles.length > 0);
    if (withZero.length > 0) {
      console.log("");
      console.log(dim("Files at 0% coverage (--strict):"));
      for (const row of withZero) {
        console.log(
          dim(`  ${shortName(row.name)} (${row.zeroFiles.length} files):`),
        );
        for (const file of row.zeroFiles) {
          const lines = countLines(file);
          const linesStr = lines === null ? "?" : String(lines);
          const rel = relative(root, file);
          console.log(
            dim(`    ${rel.padEnd(60)} ${linesStr.padStart(5)} lines`),
          );
        }
      }
    }
  }

  const belowTarget = covered.filter(
    (r) => Math.min(r.statements, r.branches, r.functions, r.lines) < target,
  );
  const overSkipped = findOverSkippedPackages(covered, maxSkipped);

  if (overSkipped.length > 0) {
    console.log("");
    console.log(red(`Packages exceeding --max-skipped=${maxSkipped}:`));
    for (const pkg of overSkipped) {
      console.log(
        red(
          `  ${shortName(pkg.name)} has ${pkg.count} files at 0% (max ${maxSkipped})`,
        ),
      );
    }
  }

  if (belowTarget.length > 0 || missing.length > 0 || overSkipped.length > 0) {
    process.exitCode = 1;
  }
};

// Run main only when invoked directly (not when imported by tests).
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
  main();
}
