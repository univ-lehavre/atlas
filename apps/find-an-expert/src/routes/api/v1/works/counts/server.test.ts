import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createRouteEvent,
  assertNoXss,
  xssPayloads,
} from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/citation', () => ({
  getWorksCount: vi.fn(),
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

describe('GET /api/v1/works/counts', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with counts for an authenticated user', async () => {
    const citation = await import('$lib/server/citation');
    (citation.getWorksCount as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      counts: { I1: 100 },
    });

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/works/counts?institutions=I1',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.counts.I1).toBe(100);
  });

  it('returns 401 when not authenticated', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/works/counts?institutions=I1',
        locals: {},
      })
    );

    expect(res.status).toBe(401);
  });

  it('returns 400 when institutions parameter is missing', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/works/counts',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('missing_parameter');
  });

  it('returns 400 when institutions only contains empty values', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/works/counts?institutions=,,',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('invalid_parameter');
  });

  it('returns 400 when too many institutions are passed', async () => {
    const ids = Array.from({ length: 11 }, (_, i) => `I${i}`).join(',');
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: `https://example.com/api/v1/works/counts?institutions=${ids}`,
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('too_many_institutions');
  });

  it.each(xssPayloads())('does not reflect xss payload %s in body', async (payload) => {
    const citation = await import('$lib/server/citation');
    (citation.getWorksCount as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ counts: {} });

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: `https://example.com/api/v1/works/counts?institutions=${encodeURIComponent(payload)}`,
        locals: { userId: 'user-1' },
      })
    );

    await assertNoXss(res, payload);
    expect(res.status).toBeLessThan(600);
  });
});
