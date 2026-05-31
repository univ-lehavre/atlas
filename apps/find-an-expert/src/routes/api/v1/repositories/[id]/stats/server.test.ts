import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createRouteEvent,
  assertNoXss,
  xssPayloads,
} from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/git-stats', () => ({
  getRepositoryStats: vi.fn(),
}));

// Mock duck-type le contrat ApplicationError → flat shape utilisé par
// `withHandler`, sans réimporter le vrai module (sinon Vitest construit
// une 2e instance de la classe et `instanceof` casse côté handler).
vi.mock('$lib/server/http', () => ({
  mapErrorToResponse: vi.fn((error: Error) => new Response(error.message, { status: 500 })),
  flatErrorMapper: vi.fn(
    (error: unknown): { body: { code: string; message: string }; status: number } => {
      const e = error as { code?: unknown; message?: unknown; httpStatus?: unknown };
      if (typeof e.code === 'string' && typeof e.httpStatus === 'number') {
        return {
          body: { code: e.code, message: String(e.message ?? '') },
          status: e.httpStatus,
        };
      }
      return {
        body: { code: 'unexpected_error', message: 'Unknown error' },
        status: 500,
      };
    }
  ),
}));

describe('GET /api/v1/repositories/[id]/stats', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with repository stats', async () => {
    const gitStats = await import('$lib/server/git-stats');
    (gitStats.getRepositoryStats as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      commits: { total: 100 },
      code: { files: 200 },
    });

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/repositories/atlas/stats',
        params: { id: 'atlas' },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.commits.total).toBe(100);
  });

  it('returns 200 even without auth (public endpoint)', async () => {
    const gitStats = await import('$lib/server/git-stats');
    (gitStats.getRepositoryStats as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/repositories/atlas/stats',
        params: { id: 'atlas' },
        locals: {},
      })
    );

    expect(res.status).toBe(200);
  });

  it('returns 500 via mapErrorToResponse when stats computation fails', async () => {
    const gitStats = await import('$lib/server/git-stats');
    (gitStats.getRepositoryStats as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('git not available')
    );

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/repositories/atlas/stats',
        params: { id: 'atlas' },
      })
    );

    expect(res.status).toBe(500);
  });

  it.each(xssPayloads())('does not reflect xss payload %s in body', async (payload) => {
    const gitStats = await import('$lib/server/git-stats');
    (gitStats.getRepositoryStats as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: `https://example.com/api/v1/repositories/${encodeURIComponent(payload)}/stats`,
        params: { id: payload },
      })
    );

    await assertNoXss(res, payload);
    expect(res.status).toBeLessThan(600);
  });
});
