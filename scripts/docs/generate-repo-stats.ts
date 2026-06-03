#!/usr/bin/env node
/**
 * Generate repository statistics for VitePress documentation.
 *
 * This script analyzes the Atlas monorepo to extract:
 * - Per-package code and test statistics
 * - Git commit history aggregated by day and month
 * - Current codebase metrics (functions, types, tests)
 *
 * Output is written to docs/.vitepress/data/repo-stats.json
 *
 * @example
 * ```bash
 * pnpm stats:generate
 * ```
 *
 * @module
 */

import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  GitAnalyzer,
  aggregateByDay,
  aggregateByWeek,
  aggregateByMonth,
  calculateTotals,
  findDateRange,
} from "./lib/git-analyzer.js";
import {
  analyzeDirectory,
  addCodeStats,
  addTestStats,
} from "./lib/code-analyzer.js";
import {
  type RepoStatsOutput,
  type PackageStats,
  type TimelineEntry,
  emptyCodeStats,
  emptyTestStats,
} from "./lib/types.js";

/**
 * Merges new timeline entries with existing ones.
 * Updates existing periods and adds new ones.
 */
function mergeTimeline(
  existing: TimelineEntry[],
  newEntries: TimelineEntry[],
): TimelineEntry[] {
  const map = new Map<string, TimelineEntry>();

  // Add existing entries
  for (const entry of existing) {
    map.set(entry.period, entry);
  }

  // Merge or add new entries
  for (const entry of newEntries) {
    const existingEntry = map.get(entry.period);
    if (existingEntry) {
      map.set(entry.period, {
        period: entry.period,
        commits: existingEntry.commits + entry.commits,
        additions: existingEntry.additions + entry.additions,
        deletions: existingEntry.deletions + entry.deletions,
        filesChanged: existingEntry.filesChanged + entry.filesChanged,
      });
    } else {
      map.set(entry.period, entry);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.period.localeCompare(b.period),
  );
}

/**
 * Loads existing statistics from the output file.
 */
async function loadExistingStats(
  outputPath: string,
): Promise<RepoStatsOutput | null> {
  try {
    const content = await readFile(outputPath, "utf-8");
    return JSON.parse(content) as RepoStatsOutput;
  } catch {
    return null;
  }
}

/**
 * Discovers every workspace of the monorepo (relative path from the repo root),
 * sorted for stable output. Replaces a hand-maintained list that drifted out of
 * date: the repository has dozens of workspaces, not a fixed handful. We rely on
 * pnpm's own workspace resolution so the set always matches reality.
 */
function discoverWorkspacePaths(repoPath: string): string[] {
  const raw = execFileSync("pnpm", ["ls", "-r", "--depth", "-1", "--json"], {
    cwd: repoPath,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const workspaces = JSON.parse(raw) as { path: string }[];
  return workspaces
    .map((w) => relative(repoPath, w.path))
    .filter((rel) => rel !== "")
    .sort();
}

/**
 * Reads package.json and extracts name, version and private flag.
 */
async function readPackageInfo(
  pkgPath: string,
): Promise<{ name: string; version: string | null; private: boolean } | null> {
  try {
    const packageJsonPath = join(pkgPath, "package.json");
    const content = await readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content) as {
      name?: string;
      version?: string;
      private?: boolean;
    };
    return {
      name: pkg.name ?? pkgPath,
      version: pkg.version ?? null,
      private: pkg.private === true,
    };
  } catch {
    return null;
  }
}

/**
 * Output path for generated statistics.
 */
const OUTPUT_PATH = "docs/.vitepress/data/repo-stats.json";

/**
 * Main function to generate repository statistics.
 */
async function main(): Promise<void> {
  const repoPath = process.cwd();
  const outputPath = join(repoPath, OUTPUT_PATH);

  console.log("📊 Generating repository statistics...");
  console.log(`   Repository: ${repoPath}`);

  // Load existing stats for incremental update
  const existingStats = await loadExistingStats(outputPath);
  const lastProcessedCommit = existingStats?.lastProcessedCommit ?? null;

  if (lastProcessedCommit) {
    console.log(
      `   Incremental update from commit: ${lastProcessedCommit.slice(0, 7)}`,
    );
  }

  // Initialize git analyzer
  const gitAnalyzer = new GitAnalyzer(repoPath);

  // Get commits (all or since last processed)
  console.log("   Fetching commit history...");
  const newCommits = await gitAnalyzer.getAllCommits(
    lastProcessedCommit ?? undefined,
  );
  const latestCommitHash = await gitAnalyzer.getLatestCommitHash();

  if (newCommits.length === 0 && existingStats) {
    console.log("   No new commits since last update.");
    console.log("✅ Statistics are up to date!");
    return;
  }

  console.log(`   Found ${newCommits.length} new commits`);

  // Calculate totals (merge with existing if incremental)
  const newTotals = calculateTotals(newCommits);
  const totalAdditions =
    (existingStats?.repository.totalAdditions ?? 0) + newTotals.totalAdditions;
  const totalDeletions =
    (existingStats?.repository.totalDeletions ?? 0) + newTotals.totalDeletions;
  const totalCommits =
    (existingStats?.repository.totalCommits ?? 0) + newCommits.length;

  // Find date range (use existing first commit if available)
  const newDateRange = findDateRange(newCommits);
  const firstCommit =
    existingStats?.repository.firstCommit ?? newDateRange.firstCommit;
  const lastCommit =
    newDateRange.lastCommit ?? existingStats?.repository.lastCommit ?? null;

  // Generate timeline data (merge with existing if incremental)
  console.log("   Aggregating timeline data...");
  const newDaily = aggregateByDay(newCommits);
  const newWeekly = aggregateByWeek(newCommits);
  const newMonthly = aggregateByMonth(newCommits);

  const daily = existingStats
    ? mergeTimeline(existingStats.timeline.daily, newDaily)
    : newDaily;
  const weekly = existingStats
    ? mergeTimeline(existingStats.timeline.weekly, newWeekly)
    : newWeekly;
  const monthly = existingStats
    ? mergeTimeline(existingStats.timeline.monthly, newMonthly)
    : newMonthly;

  // Analyze each package
  console.log("   Analyzing packages...");
  const packagePaths = discoverWorkspacePaths(repoPath);
  console.log(`   Discovered ${packagePaths.length} workspaces`);
  const packages: PackageStats[] = [];
  let totalCode = emptyCodeStats();
  let totalTests = emptyTestStats();

  for (const path of packagePaths) {
    const pkgPath = join(repoPath, path);

    // Check if package exists and read package info
    const pkgInfo = await readPackageInfo(pkgPath);
    if (!pkgInfo) {
      console.log(`   ⚠️  Skipping ${path} (not found or no package.json)`);
      continue;
    }

    // Analyze code
    const { code, tests } = await analyzeDirectory(pkgPath);

    // Get git stats for package
    const commits = await gitAnalyzer.getCommitsForPath(path);
    const latestCommit = await gitAnalyzer.getLatestCommitForPath(path);
    const prCount = await gitAnalyzer.getPRCountForPath(path);
    const releaseCount = await gitAnalyzer.getReleaseCountForPackage(
      pkgInfo.name,
    );

    let linesAdded = 0;
    let linesDeleted = 0;
    for (const c of commits) {
      linesAdded += c.additions;
      linesDeleted += c.deletions;
    }

    packages.push({
      name: pkgInfo.name,
      path,
      version: pkgInfo.version,
      private: pkgInfo.private,
      code,
      tests,
      latestCommit,
      commitCount: commits.length,
      prCount,
      releaseCount,
      linesAdded,
      linesDeleted,
    });

    totalCode = addCodeStats(totalCode, code);
    totalTests = addTestStats(totalTests, tests);

    console.log(
      `   ✓ ${pkgInfo.name}@${pkgInfo.version ?? "?"}: ${code.files} files, ${code.functions} functions, ${tests.tests} tests, ${prCount} PRs, ${releaseCount} releases`,
    );
  }

  // Sort packages alphabetically by name
  packages.sort((a, b) => a.name.localeCompare(b.name));

  // Build output
  const output: RepoStatsOutput = {
    generatedAt: new Date().toISOString(),
    lastProcessedCommit: latestCommitHash,
    repository: {
      totalCommits,
      totalAdditions,
      totalDeletions,
      firstCommit,
      lastCommit,
    },
    packages,
    timeline: {
      daily,
      weekly,
      monthly,
    },
    current: {
      code: totalCode,
      tests: totalTests,
    },
  };

  // Ensure output directory exists
  const outputDir = join(repoPath, "docs/.vitepress/data");
  await mkdir(outputDir, { recursive: true });

  // Write output
  await writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8");

  console.log("");
  console.log("✅ Statistics generated successfully!");
  console.log(`   Output: ${OUTPUT_PATH}`);
  console.log("");
  console.log("📈 Summary:");
  console.log(`   Commits: ${totalCommits}`);
  console.log(`   Packages: ${packages.length}`);
  console.log(`   Files: ${totalCode.files} source + ${totalTests.files} test`);
  console.log(`   Functions: ${totalCode.functions}`);
  console.log(`   Types: ${totalCode.types}`);
  console.log(`   Interfaces: ${totalCode.interfaces}`);
  console.log(`   Tests: ${totalTests.tests}`);
}

// Run main function
main().catch((error) => {
  console.error("❌ Error generating statistics:", error);
  process.exit(1);
});
