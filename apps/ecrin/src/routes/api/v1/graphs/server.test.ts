import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/services/graphsService', () => ({
  fetchGraphForRecord: vi.fn(),
}));

describe('GET /api/v1/graphs (rate-limited public endpoint)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 400 when record param is missing', async () => {
    const mod = await import('./+server');
    const res = await mod.GET({
      url: new URL('https://example.com/api/v1/graphs'),
      getClientAddress: () => '203.0.113.1',
    } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('missing_parameter');
  });

  it('returns 200 with the graph when record param is provided', async () => {
    const services = await import('$lib/server/services/graphsService');
    (services.fetchGraphForRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      nodes: [{ id: 'n1' }],
      edges: [],
    });

    const mod = await import('./+server');
    const res = await mod.GET({
      url: new URL('https://example.com/api/v1/graphs?record=abc123'),
      getClientAddress: () => '203.0.113.2',
    } as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.graph).toMatchObject({ nodes: [{ id: 'n1' }], edges: [] });
    expect(res.headers.get('X-RateLimit-Limit')).toBe('30');
  });

  it('returns 429 with Retry-After once the per-IP window is saturated', async () => {
    const services = await import('$lib/server/services/graphsService');
    (services.fetchGraphForRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
      nodes: [],
      edges: [],
    });

    const mod = await import('./+server');
    const ip = '203.0.113.99';

    // Saturate the 30 req/min window
    for (let i = 0; i < 30; i++) {
      const res = await mod.GET({
        url: new URL('https://example.com/api/v1/graphs?record=abc123'),
        getClientAddress: () => ip,
      } as never);
      expect(res.status).toBe(200);
    }

    const denied = await mod.GET({
      url: new URL('https://example.com/api/v1/graphs?record=abc123'),
      getClientAddress: () => ip,
    } as never);

    expect(denied.status).toBe(429);
    const body = await denied.json();
    expect(body.error.code).toBe('rate_limited');
    expect(denied.headers.get('Retry-After')).toMatch(/^\d+$/);
    expect(denied.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('isolates rate-limit buckets by IP', async () => {
    const services = await import('$lib/server/services/graphsService');
    (services.fetchGraphForRecord as ReturnType<typeof vi.fn>).mockResolvedValue({
      nodes: [],
      edges: [],
    });

    const mod = await import('./+server');

    // Burn the bucket for one IP
    for (let i = 0; i < 30; i++) {
      await mod.GET({
        url: new URL('https://example.com/api/v1/graphs?record=abc123'),
        getClientAddress: () => '203.0.113.100',
      } as never);
    }
    const denied = await mod.GET({
      url: new URL('https://example.com/api/v1/graphs?record=abc123'),
      getClientAddress: () => '203.0.113.100',
    } as never);
    expect(denied.status).toBe(429);

    // A different IP should still be allowed
    const other = await mod.GET({
      url: new URL('https://example.com/api/v1/graphs?record=abc123'),
      getClientAddress: () => '203.0.113.101',
    } as never);
    expect(other.status).toBe(200);
  });
});
