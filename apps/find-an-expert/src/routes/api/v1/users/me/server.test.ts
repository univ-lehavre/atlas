import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/user', () => ({
  getProfile: vi.fn(),
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

describe('GET /api/v1/users/me', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with the user profile when authenticated', async () => {
    const user = await import('$lib/server/user');
    (user.getProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      userId: 'user-1',
      email: 'user@example.org',
      isAdmin: false,
    });

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/users/me',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe('user-1');
  });

  it('returns 401 when not authenticated', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({ url: 'https://example.com/api/v1/users/me', locals: {} })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('unauthenticated');
  });

  it('returns 500 via mapErrorToResponse when the service throws', async () => {
    const user = await import('$lib/server/user');
    (user.getProfile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('db down'));

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/users/me',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(500);
  });
});
