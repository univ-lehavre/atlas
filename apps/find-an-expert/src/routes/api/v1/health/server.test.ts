import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/health', () => ({
  performHealthCheck: vi.fn(),
}));

describe('GET /api/v1/health', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 when health is healthy', async () => {
    const health = await import('$lib/server/health');
    (health.performHealthCheck as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 'healthy',
      timestamp: '2026-05-30T00:00:00.000Z',
      services: [{ name: 'baas', status: 'healthy', responseTimeMs: 12 }],
    });

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ url: 'https://example.com/api/v1/health' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
  });

  it('returns 200 when status is degraded (public endpoint)', async () => {
    const health = await import('$lib/server/health');
    (health.performHealthCheck as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 'degraded',
      timestamp: '2026-05-30T00:00:00.000Z',
      services: [{ name: 'baas', status: 'unhealthy', error: 'down' }],
    });

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ url: 'https://example.com/api/v1/health' }));

    expect(res.status).toBe(200);
  });

  it('returns 503 when status is unhealthy', async () => {
    const health = await import('$lib/server/health');
    (health.performHealthCheck as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      status: 'unhealthy',
      timestamp: '2026-05-30T00:00:00.000Z',
      services: [{ name: 'baas', status: 'unhealthy', error: 'down' }],
    });

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ url: 'https://example.com/api/v1/health' }));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe('unhealthy');
  });
});
