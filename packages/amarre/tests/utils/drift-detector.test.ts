import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DriftDetector, type DriftDetail } from './drift-detector';

function getFirstDriftDetail(driftDetails: DriftDetail[]): DriftDetail {
  const [first] = driftDetails;
  expect(first).toBeDefined();
  if (!first) throw new Error('Expected at least one drift detail');
  return first;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEST_BASELINES_DIR = join(__dirname, 'test-baselines');

describe('DriftDetector', () => {
  let detector: DriftDetector;

  beforeEach(() => {
    // Create test baselines directory
    if (!existsSync(TEST_BASELINES_DIR)) {
      mkdirSync(TEST_BASELINES_DIR, { recursive: true });
    }
    detector = new DriftDetector(TEST_BASELINES_DIR);
  });

  afterEach(() => {
    // Clean up test baselines
    if (existsSync(TEST_BASELINES_DIR)) {
      rmSync(TEST_BASELINES_DIR, { recursive: true, force: true });
    }
  });

  describe('checkApiDrift', () => {
    it('creates baseline when none exists', () => {
      const response = { status: 'ok', data: { id: 1, name: 'test' } };
      const result = detector.checkApiDrift('test-endpoint', response);

      expect(result.hasDrift).toBe(false);
      expect(result.driftDetails).toHaveLength(0);
      expect(existsSync(join(TEST_BASELINES_DIR, 'test-endpoint.json'))).toBe(true);
    });

    it('detects no drift when structure matches', () => {
      const baseline = { status: 'ok', data: { id: 1, name: 'test' } };
      const current = { status: 'ok', data: { id: 2, name: 'updated' } };

      // Save baseline
      detector.saveBaseline('test-endpoint-2', baseline);

      const result = detector.checkApiDrift('test-endpoint-2', current);

      expect(result.hasDrift).toBe(false);
    });

    it('detects drift when structure changes', () => {
      const baseline = { status: 'ok', data: { id: 1, name: 'test' } };
      const current = { status: 'ok', data: { id: 2, title: 'updated' } }; // 'name' changed to 'title'

      detector.saveBaseline('test-endpoint-3', baseline);

      const result = detector.checkApiDrift('test-endpoint-3', current);

      expect(result.hasDrift).toBe(true);
      expect(result.driftDetails).toHaveLength(1);
      const detail = getFirstDriftDetail(result.driftDetails);
      expect(detail.category).toBe('schema');
      expect(detail.severity).toBe('high');
    });

    it('detects drift when field is added', () => {
      const baseline = { status: 'ok', data: { id: 1 } };
      const current = { status: 'ok', data: { id: 1, newField: 'value' } };

      detector.saveBaseline('test-endpoint-4', baseline);

      const result = detector.checkApiDrift('test-endpoint-4', current);

      expect(result.hasDrift).toBe(true);
      const detail = getFirstDriftDetail(result.driftDetails);
      expect(detail.category).toBe('schema');
    });

    it('detects drift when field is removed', () => {
      const baseline = { status: 'ok', data: { id: 1, name: 'test' } };
      const current = { status: 'ok', data: { id: 1 } };

      detector.saveBaseline('test-endpoint-5', baseline);

      const result = detector.checkApiDrift('test-endpoint-5', current);

      expect(result.hasDrift).toBe(true);
    });

    it('detects value drift in strict mode', () => {
      const baseline = { status: 'ok', count: 5 };
      const current = { status: 'ok', count: 10 };

      detector.saveBaseline('test-endpoint-6', baseline);

      const result = detector.checkApiDrift('test-endpoint-6', current, { strictMode: true });

      expect(result.hasDrift).toBe(true);
      expect(result.driftDetails.some((d) => d.category === 'behavior')).toBe(true);
    });

    it('ignores timestamp differences in strict mode', () => {
      const baseline = { timestamp: '2024-01-01T00:00:00Z', data: 'test' };
      const current = { timestamp: '2024-01-02T00:00:00Z', data: 'test' };

      detector.saveBaseline('test-endpoint-7', baseline);

      const result = detector.checkApiDrift('test-endpoint-7', current, { strictMode: true });

      // Should not detect drift in timestamp, only in other fields
      expect(result.hasDrift).toBe(false);
    });
  });

  describe('checkPerformanceDrift', () => {
    it('creates performance baseline when none exists', () => {
      const result = detector.checkPerformanceDrift('operation-1', 100);

      expect(result.hasDrift).toBe(false);
      expect(existsSync(join(TEST_BASELINES_DIR, 'perf-operation-1.json'))).toBe(true);
    });

    it('detects no drift when performance is within threshold', () => {
      detector.saveBaseline('perf-operation-2', { duration: 100 });

      const result = detector.checkPerformanceDrift('operation-2', 110, 20);

      expect(result.hasDrift).toBe(false);
    });

    it('detects drift when performance degrades beyond threshold', () => {
      detector.saveBaseline('perf-operation-3', { duration: 100 });

      const result = detector.checkPerformanceDrift('operation-3', 125, 20);

      expect(result.hasDrift).toBe(true);
      expect(result.driftDetails).toHaveLength(1);
      const detail = getFirstDriftDetail(result.driftDetails);
      expect(detail.category).toBe('performance');
      expect(detail.severity).toBe('medium');
    });

    it('sets critical severity for large performance degradation', () => {
      detector.saveBaseline('perf-operation-4', { duration: 100 });

      const result = detector.checkPerformanceDrift('operation-4', 200, 20);

      expect(result.hasDrift).toBe(true);
      const detail = getFirstDriftDetail(result.driftDetails);
      expect(detail.severity).toBe('critical');
    });

    it('detects improvement as drift with custom threshold', () => {
      detector.saveBaseline('perf-operation-5', { duration: 200 });

      const result = detector.checkPerformanceDrift('operation-5', 100, 20);

      expect(result.hasDrift).toBe(true);
      const detail = getFirstDriftDetail(result.driftDetails);
      expect(detail.category).toBe('performance');
    });
  });

  describe('saveBaseline and updateBaseline', () => {
    it('saves a new baseline', () => {
      const data = { test: 'data' };
      detector.saveBaseline('test-baseline', data);

      expect(existsSync(join(TEST_BASELINES_DIR, 'test-baseline.json'))).toBe(true);
    });

    it('updates existing baseline', () => {
      const data1 = { version: 1 };
      const data2 = { version: 2 };

      detector.saveBaseline('test-baseline-2', data1);
      detector.updateBaseline('test-baseline-2', data2);

      const result = detector.checkApiDrift('test-baseline-2', data2);
      expect(result.hasDrift).toBe(false);
    });
  });

  describe('nested object drift detection', () => {
    it('detects drift in nested objects', () => {
      const baseline = { user: { profile: { name: 'John', age: 30 } } };
      const current = {
        user: {
          profile: {
            name: 'John',
            age: 30,
            email: 'john@example.com', // New field
          },
        },
      };

      detector.saveBaseline('nested-test', baseline);

      const result = detector.checkApiDrift('nested-test', current);

      expect(result.hasDrift).toBe(true);
    });

    it('detects type changes in nested objects', () => {
      const baseline = { data: { count: 5 } };
      const current = {
        data: {
          count: '5', // Number changed to string
        },
      };

      detector.saveBaseline('nested-type-test', baseline);

      const result = detector.checkApiDrift('nested-type-test', current, { strictMode: true });

      expect(result.hasDrift).toBe(true);
      expect(result.driftDetails.some((d) => d.description.includes('Type mismatch'))).toBe(true);
    });
  });
});
