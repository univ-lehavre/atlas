#!/usr/bin/env node
/**
 * Test Coverage Analyzer
 *
 * This script analyzes test coverage and provides actionable insights
 * for improving test quality and coverage.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { pathToFileURL } from 'url';

interface CoverageThresholds {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

const DEFAULT_THRESHOLDS: CoverageThresholds = {
  statements: 80,
  branches: 70,
  functions: 80,
  lines: 80,
};

class TestCoverageAnalyzer {
  private thresholds: CoverageThresholds;

  constructor(thresholds: CoverageThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  /**
   * Detect the package manager being used
   */
  private detectPackageManager(): string {
    if (existsSync('pnpm-lock.yaml')) return 'pnpm';
    if (existsSync('yarn.lock')) return 'yarn';
    if (existsSync('package-lock.json')) return 'npm';
    return 'npm'; // Default to npm
  }

  /**
   * Run tests with coverage
   */
  runTestsWithCoverage(): void {
    console.log('🔍 Running tests with coverage...\n');
    const packageManager = this.detectPackageManager();
    try {
      execSync(`${packageManager} test -- --coverage --reporter=json --reporter=default`, {
        stdio: 'inherit',
      });
    } catch (error) {
      console.error('❌ Tests failed', error);
      process.exit(1);
    }
  }

  /**
   * Analyze coverage results
   */
  analyzeCoverage(): void {
    const coveragePath = 'coverage/coverage-summary.json';

    if (!existsSync(coveragePath)) {
      console.error('❌ Coverage file not found. Run tests with --coverage first.');
      process.exit(1);
    }

    const coverage = JSON.parse(readFileSync(coveragePath, 'utf-8'));
    const total = coverage.total;

    console.log('\n📊 Coverage Summary:\n');
    console.log(`  Statements: ${total.statements.pct}%`);
    console.log(`  Branches:   ${total.branches.pct}%`);
    console.log(`  Functions:  ${total.functions.pct}%`);
    console.log(`  Lines:      ${total.lines.pct}%\n`);

    // Check thresholds
    const failures: string[] = [];

    if (total.statements.pct < this.thresholds.statements) {
      failures.push(
        `Statements coverage (${total.statements.pct}%) below threshold (${this.thresholds.statements}%)`
      );
    }
    if (total.branches.pct < this.thresholds.branches) {
      failures.push(
        `Branches coverage (${total.branches.pct}%) below threshold (${this.thresholds.branches}%)`
      );
    }
    if (total.functions.pct < this.thresholds.functions) {
      failures.push(
        `Functions coverage (${total.functions.pct}%) below threshold (${this.thresholds.functions}%)`
      );
    }
    if (total.lines.pct < this.thresholds.lines) {
      failures.push(
        `Lines coverage (${total.lines.pct}%) below threshold (${this.thresholds.lines}%)`
      );
    }

    if (failures.length > 0) {
      console.log('⚠️  Coverage thresholds not met:\n');
      failures.forEach((failure) => console.log(`  - ${failure}`));
      console.log('\n💡 Tip: Focus on increasing test coverage for critical paths\n');
    } else {
      console.log('✅ All coverage thresholds met!\n');
    }

    // Find files with low coverage
    this.identifyLowCoverageFiles(coverage);
  }

  /**
   * Identify files with low coverage
   */
  private identifyLowCoverageFiles(coverage: Record<string, unknown>): void {
    const lowCoverageFiles: Array<{ file: string; coverage: number }> = [];

    for (const [file, fileCoverage] of Object.entries(coverage)) {
      if (file === 'total') continue;

      const fc = fileCoverage as { lines: { pct: number } };
      if (fc.lines && fc.lines.pct < 70) {
        lowCoverageFiles.push({ file: file.replace(process.cwd(), ''), coverage: fc.lines.pct });
      }
    }

    if (lowCoverageFiles.length > 0) {
      console.log('📉 Files with low coverage (< 70%):\n');
      lowCoverageFiles
        .sort((a, b) => a.coverage - b.coverage)
        .slice(0, 10)
        .forEach(({ file, coverage }) => {
          console.log(`  ${coverage.toFixed(1)}% - ${file}`);
        });
      console.log('\n💡 Consider adding tests for these files\n');
    }
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(): void {
    console.log('💡 Test Improvement Recommendations:\n');
    console.log('  1. Add tests for untested code paths');
    console.log('  2. Test edge cases and error conditions');
    console.log('  3. Add integration tests for API endpoints');
    console.log('  4. Test validation and error handling');
    console.log('  5. Add regression tests for bug fixes');
    console.log('  6. Test with various input combinations\n');
  }
}

// CLI execution - ES module compatible
const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const args = process.argv.slice(2);
  const skipRun = args.includes('--skip-run');

  const analyzer = new TestCoverageAnalyzer();

  if (!skipRun) {
    analyzer.runTestsWithCoverage();
  }

  analyzer.analyzeCoverage();
  analyzer.generateRecommendations();
}

export default TestCoverageAnalyzer;
