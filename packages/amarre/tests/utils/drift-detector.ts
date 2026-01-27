/**
 * Drift Detector Utility
 *
 * This utility helps detect unintended changes (drift) in application behavior
 * by comparing current behavior against established baselines.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Timestamp detection constants
const ISO_8601_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const MIN_TIMESTAMP_MS = 1_000_000_000_000; // Sept 9, 2001 01:46:40 GMT
const MAX_TIMESTAMP_MS = 9_999_999_999_999; // Nov 20, 2286 17:46:39 GMT

export interface DriftCheckResult {
  hasDrift: boolean;
  driftDetails: DriftDetail[];
  timestamp: string;
}

export interface DriftDetail {
  category: 'api' | 'performance' | 'schema' | 'behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expected: unknown;
  actual: unknown;
  location?: string;
}

export class DriftDetector {
  private baselinesDir: string;

  constructor(baselinesDir = 'tests/baselines') {
    this.baselinesDir = baselinesDir;
  }

  /**
   * Check for API response drift
   */
  checkApiDrift(
    endpointName: string,
    currentResponse: Record<string, unknown>,
    options: { strictMode?: boolean } = {}
  ): DriftCheckResult {
    const baselinePath = join(this.baselinesDir, `${endpointName}.json`);
    const driftDetails: DriftDetail[] = [];

    if (!existsSync(baselinePath)) {
      // No baseline exists, create one
      this.saveBaseline(endpointName, currentResponse);
      return { hasDrift: false, driftDetails: [], timestamp: new Date().toISOString() };
    }

    const baseline = JSON.parse(readFileSync(baselinePath, 'utf-8'));

    // Compare structure
    const structureDrift = this.compareStructure(baseline, currentResponse);
    if (structureDrift) {
      driftDetails.push({
        category: 'schema',
        severity: 'high',
        description: 'API response structure has changed',
        expected: baseline,
        actual: currentResponse,
        location: endpointName,
      });
    }

    // Compare values in strict mode
    if (options.strictMode) {
      const valueDrift = this.compareValues(baseline, currentResponse);
      if (valueDrift.length > 0) {
        driftDetails.push(...valueDrift);
      }
    }

    return { hasDrift: driftDetails.length > 0, driftDetails, timestamp: new Date().toISOString() };
  }

  /**
   * Check for performance drift
   */
  checkPerformanceDrift(
    operationName: string,
    currentDuration: number,
    thresholdPercent = 20
  ): DriftCheckResult {
    const baselinePath = join(this.baselinesDir, `perf-${operationName}.json`);
    const driftDetails: DriftDetail[] = [];

    if (!existsSync(baselinePath)) {
      this.saveBaseline(`perf-${operationName}`, { duration: currentDuration });
      return { hasDrift: false, driftDetails: [], timestamp: new Date().toISOString() };
    }

    const baseline = JSON.parse(readFileSync(baselinePath, 'utf-8'));
    const baselineDuration = baseline.duration;
    const percentChange = ((currentDuration - baselineDuration) / baselineDuration) * 100;

    if (Math.abs(percentChange) > thresholdPercent) {
      driftDetails.push({
        category: 'performance',
        severity: percentChange > 50 ? 'critical' : percentChange > 30 ? 'high' : 'medium',
        description: `Performance degraded by ${percentChange.toFixed(2)}%`,
        expected: baselineDuration,
        actual: currentDuration,
        location: operationName,
      });
    }

    return { hasDrift: driftDetails.length > 0, driftDetails, timestamp: new Date().toISOString() };
  }

  /**
   * Save a new baseline
   */
  saveBaseline(name: string, data: unknown): void {
    const baselinePath = join(this.baselinesDir, `${name}.json`);
    writeFileSync(baselinePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Update existing baseline
   */
  updateBaseline(name: string, data: unknown): void {
    this.saveBaseline(name, data);
  }

  /**
   * Compare object structures recursively
   */
  private compareStructure(expected: unknown, actual: unknown, path = ''): boolean {
    if (typeof expected !== typeof actual) return true;

    if (expected === null || actual === null) {
      return expected !== actual;
    }

    if (typeof expected === 'object' && typeof actual === 'object') {
      const expectedKeys = Object.keys(expected as object).sort();
      const actualKeys = Object.keys(actual as object).sort();

      if (expectedKeys.length !== actualKeys.length) return true;
      if (expectedKeys.some((key, i) => key !== actualKeys[i])) return true;

      for (const key of expectedKeys) {
        const newPath = path ? `${path}.${key}` : key;
        if (
          this.compareStructure(
            (expected as Record<string, unknown>)[key],
            (actual as Record<string, unknown>)[key],
            newPath
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Compare values recursively
   */
  private compareValues(expected: unknown, actual: unknown, path = ''): DriftDetail[] {
    const drifts: DriftDetail[] = [];

    if (typeof expected !== typeof actual) {
      drifts.push({
        category: 'behavior',
        severity: 'medium',
        description: `Type mismatch at ${path}`,
        expected,
        actual,
        location: path,
      });
      return drifts;
    }

    if (typeof expected === 'object' && expected !== null && actual !== null) {
      const expectedObj = expected as Record<string, unknown>;
      const actualObj = actual as Record<string, unknown>;

      for (const key of Object.keys(expectedObj)) {
        const newPath = path ? `${path}.${key}` : key;
        drifts.push(...this.compareValues(expectedObj[key], actualObj[key], newPath));
      }
    } else if (expected !== actual) {
      // Ignore timestamp and date differences
      if (this.isTimestampLike(expected) && this.isTimestampLike(actual)) {
        return drifts;
      }

      drifts.push({
        category: 'behavior',
        severity: 'low',
        description: `Value changed at ${path}`,
        expected,
        actual,
        location: path,
      });
    }

    return drifts;
  }

  /**
   * Check if value looks like a timestamp
   */
  private isTimestampLike(value: unknown): boolean {
    if (typeof value === 'string') {
      // ISO 8601 date format
      return ISO_8601_DATE_PATTERN.test(value);
    }
    if (typeof value === 'number') {
      // Unix timestamp in milliseconds
      return value > MIN_TIMESTAMP_MS && value < MAX_TIMESTAMP_MS;
    }
    return false;
  }
}

export default DriftDetector;
