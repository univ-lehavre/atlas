import { describe, expect, it } from 'vitest';
import { DriftDetector } from '../utils/drift-detector';

/**
 * Drift Detection Integration Tests
 *
 * These tests demonstrate how to use the drift detection system
 * to monitor API responses and performance over time.
 */

describe('Drift Detection - Integration Examples', () => {
  const detector = new DriftDetector('tests/baselines');

  describe('API Response Drift', () => {
    it('should detect drift in health check endpoint', async () => {
      // Simulate a health check API response
      const healthCheckResponse = {
        data: {
          online: true,
          host: 'www.google.com',
          port: 443,
          timeoutMs: 3000,
          tcp: { ok: true, latencyMs: 10 },
          tls: { ok: true, latencyMs: 20, authorized: true },
        },
        error: null,
      };

      // Check for drift (will create baseline on first run)
      const result = detector.checkApiDrift('health-online-response', healthCheckResponse);

      // On first run, no drift should be detected
      expect(result.hasDrift).toBe(false);
    });

    it('should detect when API structure changes', async () => {
      // Original response structure
      const originalResponse = {
        data: { surveys: [{ id: 1, name: 'Survey 1' }], total: 1 },
        error: null,
      };

      // Modified response structure (added new field)
      const modifiedResponse = {
        data: {
          surveys: [{ id: 1, name: 'Survey 1', status: 'active' }], // New 'status' field
          total: 1,
        },
        error: null,
      };

      // Save original as baseline
      detector.saveBaseline('surveys-list-response', originalResponse);

      // Check modified response
      const result = detector.checkApiDrift('surveys-list-response', modifiedResponse);

      // Should detect drift due to structure change
      expect(result.hasDrift).toBe(true);
      const [firstDrift] = result.driftDetails;
      expect(firstDrift).toBeDefined();
      if (!firstDrift) throw new Error('Expected at least one drift detail');
      expect(firstDrift.category).toBe('schema');
    });
  });

  describe('Performance Drift', () => {
    it('should track API response times', async () => {
      // Simulate API response time measurement
      const responseTime = 150; // milliseconds

      const result = detector.checkPerformanceDrift('health-check-latency', responseTime);

      // First run should not detect drift
      expect(result.hasDrift).toBe(false);
    });

    it('should detect performance degradation', async () => {
      // Establish baseline
      detector.saveBaseline('perf-survey-query', { duration: 100 });

      // Simulate degraded performance (2x slower)
      const degradedTime = 200;

      const result = detector.checkPerformanceDrift('survey-query', degradedTime, 20);

      // Should detect significant performance drift
      expect(result.hasDrift).toBe(true);
      const [firstDrift] = result.driftDetails;
      expect(firstDrift).toBeDefined();
      if (!firstDrift) throw new Error('Expected at least one drift detail');
      expect(firstDrift.category).toBe('performance');
    });
  });

  describe('Schema Validation', () => {
    it('should validate API response matches expected schema', async () => {
      const actualResponse = { data: { id: 1, name: 'Test' }, error: null };

      // This is a simple structure check
      const result = detector.checkApiDrift('schema-validation', actualResponse);

      // Should pass on first run
      expect(result.hasDrift).toBe(false);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should ignore timestamp changes in responses', async () => {
      const response1 = { data: { message: 'Success' }, timestamp: '2024-01-01T00:00:00Z' };

      const response2 = {
        data: { message: 'Success' },
        timestamp: '2024-01-02T00:00:00Z', // Different timestamp
      };

      detector.saveBaseline('timestamped-response', response1);
      const result = detector.checkApiDrift('timestamped-response', response2, {
        strictMode: true,
      });

      // Should not detect drift in timestamps
      expect(result.hasDrift).toBe(false);
    });

    it('should detect breaking changes in error responses', async () => {
      const originalError = {
        data: null,
        error: { code: 'invalid_parameters', message: 'Missing required field' },
      };

      const modifiedError = {
        data: null,
        error: { errorCode: 'invalid_parameters', message: 'Missing required field' }, // 'code' renamed to 'errorCode'
      };

      detector.saveBaseline('error-response-structure', originalError);
      const result = detector.checkApiDrift('error-response-structure', modifiedError);

      expect(result.hasDrift).toBe(true);
      const [firstDrift] = result.driftDetails;
      expect(firstDrift).toBeDefined();
      if (!firstDrift) throw new Error('Expected at least one drift detail');
      expect(firstDrift.severity).toBe('high');
    });
  });
});
