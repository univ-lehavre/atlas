import { describe, it, expect } from 'vitest';
import {
  HealthStatus,
  AttributeHealth,
  CollectionHealth,
  DatabaseHealth,
  ServiceHealth,
  HealthCheckResponse,
} from './types';

describe('HealthStatus', () => {
  it('should accept valid status values', () => {
    expect(HealthStatus.parse('healthy')).toBe('healthy');
    expect(HealthStatus.parse('degraded')).toBe('degraded');
    expect(HealthStatus.parse('unhealthy')).toBe('unhealthy');
  });

  it('should reject invalid status values', () => {
    expect(() => HealthStatus.parse('unknown')).toThrow();
  });
});

describe('AttributeHealth', () => {
  it('should validate complete attribute health', () => {
    const data = {
      name: 'email',
      exists: true,
      type: 'string',
    };
    expect(AttributeHealth.parse(data)).toEqual(data);
  });

  it('should validate without optional type', () => {
    const data = { name: 'email', exists: false };
    expect(AttributeHealth.parse(data)).toEqual(data);
  });
});

describe('CollectionHealth', () => {
  it('should validate complete collection health', () => {
    const data = {
      id: 'col123',
      name: 'users',
      exists: true,
      attributes: [{ name: 'email', exists: true }],
    };
    expect(CollectionHealth.parse(data)).toEqual(data);
  });

  it('should validate with error', () => {
    const data = {
      id: 'col123',
      name: 'users',
      exists: false,
      error: 'Collection not found',
    };
    expect(CollectionHealth.parse(data)).toEqual(data);
  });
});

describe('DatabaseHealth', () => {
  it('should validate complete database health', () => {
    const data = {
      id: 'db123',
      name: 'production',
      exists: true,
      apiKeyValid: true,
      collections: [{ id: 'col1', name: 'users', exists: true }],
    };
    expect(DatabaseHealth.parse(data)).toEqual(data);
  });
});

describe('ServiceHealth', () => {
  it('should validate healthy service', () => {
    const data = {
      name: 'appwrite',
      status: 'healthy',
      responseTimeMs: 42,
    };
    expect(ServiceHealth.parse(data)).toEqual(data);
  });

  it('should validate unhealthy service with error', () => {
    const data = {
      name: 'appwrite',
      status: 'unhealthy',
      error: 'Connection timeout',
    };
    expect(ServiceHealth.parse(data)).toEqual(data);
  });
});

describe('HealthCheckResponse', () => {
  it('should validate complete health check response', () => {
    const data = {
      status: 'healthy',
      timestamp: '2024-01-01T00:00:00Z',
      services: [
        { name: 'appwrite', status: 'healthy', responseTimeMs: 50 },
        { name: 'github', status: 'healthy', responseTimeMs: 100 },
      ],
    };
    expect(HealthCheckResponse.parse(data)).toEqual(data);
  });

  it('should validate degraded response', () => {
    const data = {
      status: 'degraded',
      timestamp: '2024-01-01T00:00:00Z',
      services: [
        { name: 'appwrite', status: 'unhealthy', error: 'Down' },
        { name: 'github', status: 'healthy' },
      ],
    };
    expect(HealthCheckResponse.parse(data)).toEqual(data);
  });
});
