import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createRouteEvent,
  assertNoXss,
  xssPayloads,
} from '@univ-lehavre/atlas-test-utils-sveltekit';

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

describe('GET /api/v1/repositories/[id]/contributors', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with an empty contributors list (stub endpoint)', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/repositories/atlas/contributors',
        params: { id: 'atlas' },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.contributors).toEqual([]);
    expect(body.message).toMatch(/not yet implemented/i);
  });

  it('returns 200 even when no id is provided (public stub, no auth gate)', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/repositories//contributors',
        params: { id: '' },
      })
    );

    expect(res.status).toBe(200);
  });

  it.each(xssPayloads())('does not reflect xss payload %s in body', async (payload) => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: `https://example.com/api/v1/repositories/${encodeURIComponent(payload)}/contributors`,
        params: { id: payload },
      })
    );

    await assertNoXss(res, payload);
    expect(res.status).toBeLessThan(600);
  });
});
