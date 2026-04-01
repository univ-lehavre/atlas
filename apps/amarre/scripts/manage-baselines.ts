#!/usr/bin/env node
/**
 * Test Baseline Manager
 *
 * This script manages test baselines for drift detection.
 * It can capture, update, and validate baselines.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';

const BASELINES_DIR = join(process.cwd(), 'tests/baselines');

interface Baseline {
  name: string;
  type: 'api' | 'performance' | 'schema';
  data: unknown;
  timestamp: string;
  version: string;
}

class BaselineManager {
  private baselinesDir: string;

  constructor(baselinesDir = BASELINES_DIR) {
    this.baselinesDir = baselinesDir;
    this.ensureBaselineDir();
  }

  /**
   * Ensure baselines directory exists
   */
  private ensureBaselineDir(): void {
    if (!existsSync(this.baselinesDir)) {
      mkdirSync(this.baselinesDir, { recursive: true });
      console.log(`✅ Created baselines directory: ${this.baselinesDir}`);
    }
  }

  /**
   * Capture a new baseline
   */
  captureBaseline(name: string, type: Baseline['type'], data: unknown): void {
    const baseline: Baseline = {
      name,
      type,
      data,
      timestamp: new Date().toISOString(),
      version: this.getVersion(),
    };

    const filename = `${name}.baseline.json`;
    const filepath = join(this.baselinesDir, filename);

    writeFileSync(filepath, JSON.stringify(baseline, null, 2), 'utf-8');
    console.log(`✅ Baseline captured: ${filename}`);
  }

  /**
   * Update an existing baseline
   */
  updateBaseline(name: string, data: unknown): void {
    const filename = `${name}.baseline.json`;
    const filepath = join(this.baselinesDir, filename);

    if (!existsSync(filepath)) {
      console.error(`❌ Baseline not found: ${filename}`);
      process.exit(1);
    }

    const existing = JSON.parse(readFileSync(filepath, 'utf-8')) as Baseline;
    existing.data = data;
    existing.timestamp = new Date().toISOString();
    existing.version = this.getVersion();

    writeFileSync(filepath, JSON.stringify(existing, null, 2), 'utf-8');
    console.log(`✅ Baseline updated: ${filename}`);
  }

  /**
   * List all baselines
   */
  listBaselines(): void {
    const files = readdirSync(this.baselinesDir).filter((f) => f.endsWith('.baseline.json'));

    if (files.length === 0) {
      console.log('📭 No baselines found');
      return;
    }

    console.log('\n📋 Available Baselines:\n');
    files.forEach((file) => {
      const filepath = join(this.baselinesDir, file);
      const baseline = JSON.parse(readFileSync(filepath, 'utf-8')) as Baseline;
      console.log(`  ${baseline.name} (${baseline.type})`);
      console.log(`    Version: ${baseline.version}`);
      console.log(`    Updated: ${new Date(baseline.timestamp).toLocaleString()}`);
      console.log('');
    });
  }

  /**
   * Get current version from package.json
   */
  private getVersion(): string {
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      return packageJson.version || '0.0.0';
    } catch {
      return '0.0.0';
    }
  }

  /**
   * Initialize default baselines
   */
  initializeDefaults(): void {
    console.log('🔧 Initializing default baselines...\n');

    // API Response baseline example
    this.captureBaseline('me-api', 'api', {
      endpoint: '/api/v1/me',
      method: 'GET',
      expectedStatus: 200,
      expectedSchema: { data: { id: 'string', email: 'string', name: 'string' }, error: 'null' },
    });

    // Performance baseline example
    this.captureBaseline('api-response-time', 'performance', {
      endpoint: '/api/v1/me',
      maxResponseTime: 3000,
      averageResponseTime: 150,
    });

    console.log('\n✅ Default baselines initialized');
  }

  /**
   * Validate all baselines against current version
   */
  validateBaselines(): void {
    const files = readdirSync(this.baselinesDir).filter((f) => f.endsWith('.baseline.json'));

    if (files.length === 0) {
      console.log('⚠️  No baselines to validate');
      return;
    }

    const currentVersion = this.getVersion();
    console.log(`\n🔍 Validating baselines against version ${currentVersion}...\n`);

    let outdatedCount = 0;
    files.forEach((file) => {
      const filepath = join(this.baselinesDir, file);
      const baseline = JSON.parse(readFileSync(filepath, 'utf-8')) as Baseline;

      if (baseline.version !== currentVersion) {
        console.log(`⚠️  Outdated: ${baseline.name} (version ${baseline.version})`);
        outdatedCount++;
      } else {
        console.log(`✅ Current: ${baseline.name}`);
      }
    });

    if (outdatedCount > 0) {
      console.log(`\n💡 Run with --update to update outdated baselines\n`);
    } else {
      console.log('\n✅ All baselines are current\n');
    }
  }
}

// CLI execution - ES module compatible
const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const args = process.argv.slice(2);
  const command = args[0];

  const manager = new BaselineManager();

  switch (command) {
    case 'list':
      manager.listBaselines();
      break;
    case 'init':
      manager.initializeDefaults();
      break;
    case 'validate':
      manager.validateBaselines();
      break;
    case 'help':
    default:
      console.log('Test Baseline Manager\n');
      console.log('Usage: tsx scripts/manage-baselines.ts [command]\n');
      console.log('Commands:');
      console.log('  list      - List all baselines');
      console.log('  init      - Initialize default baselines');
      console.log('  validate  - Validate baselines against current version');
      console.log('  help      - Show this help message\n');
      break;
  }
}

export default BaselineManager;
