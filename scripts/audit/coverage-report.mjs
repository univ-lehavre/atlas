import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const coverageFile = 'coverage/coverage-final.json';
const target = Number(process.argv[2] ?? 80);

const useColor = process.stdout.isTTY;
const red = (s) => (useColor ? `\x1b[31m${s}\x1b[0m` : s);
const yellow = (s) => (useColor ? `\x1b[33m${s}\x1b[0m` : s);
const green = (s) => (useColor ? `\x1b[32m${s}\x1b[0m` : s);
const dim = (s) => (useColor ? `\x1b[2m${s}\x1b[0m` : s);

const workspaceFiles = execFileSync('pnpm', ['ls', '-r', '--json', '--depth', '-1'], {
  cwd: root,
  encoding: 'utf8',
});

const allWorkspaces = JSON.parse(workspaceFiles)
  .filter((workspace) => workspace.path !== root)
  .map((workspace) => ({
    name: workspace.name,
    path: workspace.path,
    coveragePath: `${workspace.path}/${coverageFile}`,
    hasVitest: existsSync(`${workspace.path}/vitest.config.ts`),
    hasCoverage: existsSync(`${workspace.path}/${coverageFile}`),
  }));

const empty = () => ({ covered: 0, total: 0 });
const pct = ({ covered, total }) => (total === 0 ? 100 : (covered / total) * 100);
const fmt = (value) => value.toFixed(1).padStart(6);

const summarize = (coverage) => {
  const summary = {
    statements: empty(),
    branches: empty(),
    functions: empty(),
    lines: empty(),
  };
  const zeroFiles = [];

  for (const [filePath, file] of Object.entries(coverage)) {
    const fileSummary = {
      statements: empty(),
      branches: empty(),
      functions: empty(),
    };
    const lines = new Map();

    for (const [id, hits] of Object.entries(file.s ?? {})) {
      summary.statements.total += 1;
      fileSummary.statements.total += 1;
      if (hits > 0) {
        summary.statements.covered += 1;
        fileSummary.statements.covered += 1;
      }
      const line = file.statementMap?.[id]?.start?.line;
      if (line !== undefined) {
        lines.set(line, (lines.get(line) ?? false) || hits > 0);
      }
    }

    for (const hits of Object.values(file.f ?? {})) {
      summary.functions.total += 1;
      fileSummary.functions.total += 1;
      if (hits > 0) {
        summary.functions.covered += 1;
        fileSummary.functions.covered += 1;
      }
    }

    for (const branchHits of Object.values(file.b ?? {})) {
      for (const hits of branchHits) {
        summary.branches.total += 1;
        fileSummary.branches.total += 1;
        if (hits > 0) {
          summary.branches.covered += 1;
          fileSummary.branches.covered += 1;
        }
      }
    }

    for (const covered of lines.values()) {
      summary.lines.total += 1;
      if (covered) summary.lines.covered += 1;
    }

    if (
      fileSummary.statements.total > 0 &&
      fileSummary.statements.covered === 0 &&
      fileSummary.functions.covered === 0
    ) {
      zeroFiles.push(filePath);
    }
  }

  return {
    statements: pct(summary.statements),
    branches: pct(summary.branches),
    functions: pct(summary.functions),
    lines: pct(summary.lines),
    zeroFiles,
  };
};

const SHORT_PREFIX = '@univ-lehavre/atlas-';
const shortName = (name) => name.replace(SHORT_PREFIX, '');

const COL = 36;

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
  const coverage = JSON.parse(readFileSync(workspace.coveragePath, 'utf8'));
  return { ...workspace, missing: false, ...summarize(coverage) };
});

rows.sort((a, b) => {
  if (a.missing && !b.missing) return 1;
  if (!a.missing && b.missing) return -1;
  if (a.missing && b.missing) return a.name.localeCompare(b.name);
  const lowestA = Math.min(a.statements, a.branches, a.functions, a.lines);
  const lowestB = Math.min(b.statements, b.branches, b.functions, b.lines);
  return lowestA - lowestB;
});

const covered = rows.filter((r) => !r.missing);
const missing = rows.filter((r) => r.missing);

console.log(`Coverage target: ${target}%\n`);
console.log('Package'.padEnd(COL), ' Stmts Branch  Funcs  Lines    Gap  0-files');
console.log('─'.repeat(COL + 46));

for (const row of covered) {
  const lowest = Math.min(row.statements, row.branches, row.functions, row.lines);
  const gap = Math.max(0, target - lowest);
  const gapStr = gap === 0 ? green(fmt(0)) : gap > 20 ? red(fmt(gap)) : yellow(fmt(gap));
  console.log(
    shortName(row.name).padEnd(COL),
    colorPct(row.statements),
    colorPct(row.branches),
    colorPct(row.functions),
    colorPct(row.lines),
    gapStr,
    String(row.zeroFiles.length).padStart(8)
  );
}

if (missing.length > 0) {
  console.log('');
  console.log(dim(`Packages with vitest but no coverage data (run pnpm test:coverage):`));
  for (const row of missing) {
    console.log(dim(`  ${shortName(row.name)}`));
  }
}

if (noVitestPackages.length > 0) {
  console.log('');
  console.log(dim(`Packages without tests (${noVitestPackages.length}):`), dim(noVitestPackages.map((w) => shortName(w.name)).join(', ')));
}

const offenders = covered.filter((row) => row.zeroFiles.length > 0);
if (offenders.length > 0) {
  console.log('\nFiles with 0% statement/function coverage:');
  for (const row of offenders) {
    console.log(`\n${shortName(row.name)}`);
    for (const file of row.zeroFiles.slice(0, 10)) {
      console.log(`  ${relative(row.path, file)}`);
    }
    if (row.zeroFiles.length > 10) {
      console.log(`  ... ${row.zeroFiles.length - 10} more`);
    }
  }
}

const belowTarget = covered.filter(
  (r) => Math.min(r.statements, r.branches, r.functions, r.lines) < target
);
if (belowTarget.length > 0 || missing.length > 0) {
  process.exitCode = 1;
}
