import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
  HealthStatus,
  AttributeHealth,
  CollectionHealth,
  DatabaseHealth,
  ServiceHealth,
  HealthCheckResponse,
} from './types';

const mocks = vi.hoisted(() => ({
  databases: {
    get: vi.fn(),
    getCollection: vi.fn(),
    listAttributes: vi.fn(),
  },
  createAdminClient: vi.fn(),
}));

// On mocke le module env de l'app (getters) plutôt que `$env/dynamic/private` :
// on reste sur la forme « getter -> string » du code prod, sans re-traverser la
// validation fail-closed, et le test ne dépend pas de la forme objet de dynamic.
vi.mock('$lib/server/env', () => ({
  appwriteEndpoint: () => 'https://appwrite.example.test/v1',
  appwriteDatabaseId: () => 'atlas',
  appwriteConsentEventsCollectionId: () => 'consent-events',
  appwriteCurrentConsentsCollectionId: () => 'current-consents',
}));

vi.mock('$lib/server/baas', () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { performHealthCheck } from './service';

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
      name: 'baas',
      status: 'healthy',
      responseTimeMs: 42,
    };
    expect(ServiceHealth.parse(data)).toEqual(data);
  });

  it('should validate unhealthy service with error', () => {
    const data = {
      name: 'baas',
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
        { name: 'baas', status: 'healthy', responseTimeMs: 50 },
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
        { name: 'baas', status: 'unhealthy', error: 'Down' },
        { name: 'github', status: 'healthy' },
      ],
    };
    expect(HealthCheckResponse.parse(data)).toEqual(data);
  });
});

describe('performHealthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAdminClient.mockReturnValue({ databases: mocks.databases });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response);
    mocks.databases.get.mockResolvedValue({ name: 'Atlas' });
    mocks.databases.getCollection.mockImplementation(
      async (_databaseId: string, collectionId: string) => ({
        name: collectionId === 'consent-events' ? 'Consent events' : 'Current consents',
      })
    );
    mocks.databases.listAttributes.mockImplementation(
      async (_databaseId: string, collectionId: string) => ({
        attributes:
          collectionId === 'consent-events'
            ? [
                { key: 'userId', type: 'string' },
                { key: 'consentType', type: 'string' },
                { key: 'action', type: 'string' },
              ]
            : [
                { key: 'userId', type: 'string' },
                { key: 'consentType', type: 'string' },
                { key: 'granted', type: 'boolean' },
              ],
      })
    );
  });

  it('should report healthy when Appwrite endpoint and schema are available', async () => {
    const result = await performHealthCheck();

    expect(result.status).toBe('healthy');
    expect(result.services).toHaveLength(1);
    expect(result.services[0]).toMatchObject({
      name: 'baas',
      status: 'healthy',
      database: {
        id: 'atlas',
        name: 'Atlas',
        exists: true,
        apiKeyValid: true,
      },
    });
    expect(globalThis.fetch).toHaveBeenCalledWith('https://appwrite.example.test/v1/health', {
      method: 'HEAD',
      signal: expect.any(AbortSignal),
    });
  });

  it('should report degraded when expected collection attributes are missing', async () => {
    mocks.databases.listAttributes.mockResolvedValue({
      attributes: [{ key: 'userId', type: 'string' }],
    });

    const result = await performHealthCheck();

    expect(result.status).toBe('degraded');
    expect(result.services[0]?.error).toBe(
      'Missing attributes: consent-events.consentType, consent-events.action, current-consents.consentType, current-consents.granted'
    );
  });

  it('should check internet connectivity when Appwrite is unreachable', async () => {
    vi.mocked(globalThis.fetch)
      .mockRejectedValueOnce(new Error('lookup failed', { cause: { code: 'ENOTFOUND' } }))
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response);

    const result = await performHealthCheck();

    expect(result.status).toBe('unhealthy');
    expect(result.services).toEqual([
      expect.objectContaining({
        name: 'baas',
        status: 'unhealthy',
        error: 'DNS lookup failed - hostname not found',
      }),
      expect.objectContaining({
        name: 'internet',
        status: 'healthy',
      }),
    ]);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });
});
