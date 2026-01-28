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

import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  GitAnalyzer,
  aggregateByDay,
  aggregateByMonth,
  calculateTotals,
  findDateRange,
} from './lib/git-analyzer.js';
import { analyzeDirectory, addCodeStats, addTestStats } from './lib/code-analyzer.js';
import { type RepoStatsOutput, type PackageStats, emptyCodeStats, emptyTestStats } from './lib/types.js';

/**
 * Package definitions for analysis.
 * Each entry defines a package to analyze with its display name and path.
 */
const PACKAGES = [
  { name: 'ecrin', path: 'packages/ecrin' },
  { name: 'find-an-expert', path: 'packages/find-an-expert' },
  { name: 'amarre', path: 'packages/amarre' },
  { name: '@univ-lehavre/crf', path: 'packages/crf' },
  { name: '@univ-lehavre/atlas-redcap-core', path: 'packages/redcap-core' },
  { name: '@univ-lehavre/atlas-redcap-openapi', path: 'packages/redcap-openapi' },
  { name: '@univ-lehavre/atlas-net', path: 'packages/net' },
  { name: '@univ-lehavre/atlas-appwrite', path: 'packages/appwrite' },
  { name: '@univ-lehavre/atlas-auth', path: 'packages/auth' },
  { name: '@univ-lehavre/atlas-errors', path: 'packages/errors' },
  { name: '@univ-lehavre/atlas-validators', path: 'packages/validators' },
  { name: '@univ-lehavre/atlas-shared-config', path: 'packages/shared-config' },
] as const;

/**
 * Output path for generated statistics.
 */
const OUTPUT_PATH = 'docs/.vitepress/data/repo-stats.json';

/**
 * Main function to generate repository statistics.
 */
async function main(): Promise<void> {
  const repoPath = process.cwd();

  console.log('📊 Generating repository statistics...');
  console.log(`   Repository: ${repoPath}`);

  // Initialize git analyzer
  const gitAnalyzer = new GitAnalyzer(repoPath);

  // Get all commits
  console.log('   Fetching commit history...');
  const allCommits = await gitAnalyzer.getAllCommits();
  console.log(`   Found ${allCommits.length} commits`);

  // Calculate repository totals
  const { totalAdditions, totalDeletions } = calculateTotals(allCommits);
  const { firstCommit, lastCommit } = findDateRange(allCommits);

  // Generate timeline data
  console.log('   Aggregating timeline data...');
  const daily = aggregateByDay(allCommits);
  const monthly = aggregateByMonth(allCommits);

  // Analyze each package
  console.log('   Analyzing packages...');
  const packages: PackageStats[] = [];
  let totalCode = emptyCodeStats();
  let totalTests = emptyTestStats();

  for (const pkg of PACKAGES) {
    const pkgPath = join(repoPath, pkg.path);

    // Check if package exists
    try {
      await readdir(pkgPath);
    } catch {
      console.log(`   ⚠️  Skipping ${pkg.name} (not found)`);
      continue;
    }

    // Analyze code
    const { code, tests } = await analyzeDirectory(pkgPath);

    // Get git stats for package
    const commits = await gitAnalyzer.getCommitsForPath(pkg.path);
    const latestCommit = await gitAnalyzer.getLatestCommitForPath(pkg.path);

    let linesAdded = 0;
    let linesDeleted = 0;
    for (const c of commits) {
      linesAdded += c.additions;
      linesDeleted += c.deletions;
    }

    packages.push({
      name: pkg.name,
      path: pkg.path,
      code,
      tests,
      latestCommit,
      commitCount: commits.length,
      linesAdded,
      linesDeleted,
    });

    totalCode = addCodeStats(totalCode, code);
    totalTests = addTestStats(totalTests, tests);

    console.log(
      `   ✓ ${pkg.name}: ${code.files} files, ${code.functions} functions, ${tests.tests} tests`
    );
  }

  // Sort packages by commit count (most active first)
  packages.sort((a, b) => b.commitCount - a.commitCount);

  // Build output
  const output: RepoStatsOutput = {
    generatedAt: new Date().toISOString(),
    repository: {
      totalCommits: allCommits.length,
      totalAdditions,
      totalDeletions,
      firstCommit,
      lastCommit,
    },
    packages,
    timeline: {
      daily,
      monthly,
    },
    current: {
      code: totalCode,
      tests: totalTests,
    },
  };

  // Ensure output directory exists
  const outputDir = join(repoPath, 'docs/.vitepress/data');
  await mkdir(outputDir, { recursive: true });

  // Write output
  const outputPath = join(repoPath, OUTPUT_PATH);
  await writeFile(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log('');
  console.log('✅ Statistics generated successfully!');
  console.log(`   Output: ${OUTPUT_PATH}`);
  console.log('');
  console.log('📈 Summary:');
  console.log(`   Commits: ${allCommits.length}`);
  console.log(`   Packages: ${packages.length}`);
  console.log(`   Files: ${totalCode.files} source + ${totalTests.files} test`);
  console.log(`   Functions: ${totalCode.functions}`);
  console.log(`   Types: ${totalCode.types}`);
  console.log(`   Interfaces: ${totalCode.interfaces}`);
  console.log(`   Tests: ${totalTests.tests}`);
}

// Run main function
main().catch((error) => {
  console.error('❌ Error generating statistics:', error);
  process.exit(1);
});
