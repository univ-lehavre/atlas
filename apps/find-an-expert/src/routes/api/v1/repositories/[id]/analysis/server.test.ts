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

describe('POST /api/v1/repositories/[id]/analysis', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 202 with a pending status (stub endpoint)', async () => {
    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/repositories/atlas/analysis',
        params: { id: 'atlas' },
      })
    );

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.status).toBe('pending');
    expect(body.message).toMatch(/not yet implemented/i);
  });

  it('returns 202 even when the id is missing (public stub, no auth gate)', async () => {
    // The endpoint is a stub and ignores params; we document that
    // behaviour explicitly here so a future implementation must update
    // the test deliberately.
    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/repositories//analysis',
        params: { id: '' },
      })
    );

    expect(res.status).toBe(202);
  });

  it.each(xssPayloads())('does not reflect xss payload %s in body', async (payload) => {
    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: `https://example.com/api/v1/repositories/${encodeURIComponent(payload)}/analysis`,
        params: { id: payload },
      })
    );

    await assertNoXss(res, payload);
    expect(res.status).toBeLessThan(600);
  });
});
