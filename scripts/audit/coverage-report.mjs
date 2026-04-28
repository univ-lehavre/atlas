import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const coverageFile = 'coverage/coverage-final.json';
const target = Number(process.argv[2] ?? 80);

const workspaceFiles = execFileSync('pnpm', ['ls', '-r', '--json', '--depth', '-1'], {
  cwd: root,
  encoding: 'utf8',
});

const workspaces = JSON.parse(workspaceFiles)
  .filter((workspace) => workspace.path !== root)
  .map((workspace) => ({
    name: workspace.name,
    path: workspace.path,
    coveragePath: `${workspace.path}/${coverageFile}`,
  }))
  .filter((workspace) => existsSync(workspace.coveragePath));

const empty = () => ({ covered: 0, total: 0 });

const pct = ({ covered, total }) => (total === 0 ? 100 : (covered / total) * 100);
const fmt = (value) => value.toFixed(2).padStart(6);

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
      if (covered) {
        summary.lines.covered += 1;
      }
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

const rows = workspaces.map((workspace) => {
  const coverage = JSON.parse(readFileSync(workspace.coveragePath, 'utf8'));
  return {
    ...workspace,
    ...summarize(coverage),
  };
});

if (rows.length === 0) {
  console.log(
    `No ${coverageFile} files found. Run coverage locally without CI=true before using this report.`
  );
  process.exit(0);
}

rows.sort(
  (a, b) =>
    Math.min(a.statements, a.branches, a.functions, a.lines) -
    Math.min(b.statements, b.branches, b.functions, b.lines)
);

console.log(`Coverage target: ${target}%`);
console.log('Package'.padEnd(44), 'Stmts', 'Branch', 'Funcs', 'Lines', 'Gap', 'Zero files');

for (const row of rows) {
  const lowest = Math.min(row.statements, row.branches, row.functions, row.lines);
  const gap = Math.max(0, target - lowest);
  console.log(
    row.name.padEnd(44),
    fmt(row.statements),
    fmt(row.branches),
    fmt(row.functions),
    fmt(row.lines),
    fmt(gap),
    String(row.zeroFiles.length).padStart(5)
  );
}

const offenders = rows.filter((row) => row.zeroFiles.length > 0);
if (offenders.length > 0) {
  console.log('\nFiles with 0% statement/function coverage:');
  for (const row of offenders) {
    console.log(`\n${row.name}`);
    for (const file of row.zeroFiles.slice(0, 10)) {
      console.log(`  ${relative(row.path, file)}`);
    }
    if (row.zeroFiles.length > 10) {
      console.log(`  ... ${row.zeroFiles.length - 10} more`);
    }
  }
}
