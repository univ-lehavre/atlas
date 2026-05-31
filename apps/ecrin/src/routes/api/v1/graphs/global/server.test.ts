import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

// Phase 3 — couverture handler `GET /api/v1/graphs/global`.
// AUTH-gated (utilise `locals.userId` même s'il ne s'en sert pas
// pour la requête métier — voir +server.ts). On neutralise le
// `console.log(graph)` du handler pour garder la sortie propre.

vi.mock('$lib/server/services/graphsService', () => ({
  fetchGlobalGraph: vi.fn(),
}));

describe('GET /api/v1/graphs/global', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('returns 200 with the global graph when authenticated', async () => {
    const services = await import('$lib/server/services/graphsService');
    (services.fetchGlobalGraph as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      nodes: [{ id: 'n1' }, { id: 'n2' }],
      edges: [{ source: 'n1', target: 'n2' }],
    });

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: { userId: 'abc123' } }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.graph).toMatchObject({ nodes: [{ id: 'n1' }, { id: 'n2' }] });
  });

  it('returns 401 with code "unauthenticated" when no userId in locals', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: {} }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('unauthenticated');
  });

  it('returns 500 with code "internal_error" when the service throws (malformed upstream data)', async () => {
    const services = await import('$lib/server/services/graphsService');
    (services.fetchGlobalGraph as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('graph store unavailable')
    );

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: { userId: 'abc123' } }) as never);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
  });
});
