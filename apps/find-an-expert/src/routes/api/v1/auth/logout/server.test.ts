import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/auth', () => ({
  logout: vi.fn(),
  validateUserId: vi.fn((id: unknown) => {
    if (typeof id !== 'string' || id.length === 0) {
      const err: Error & { code?: string } = new Error('invalid user id');
      err.code = 'invalid_user_id';
      throw err;
    }
    return id;
  }),
}));

vi.mock('$lib/server/http', () => ({
  mapErrorToResponse: vi.fn(
    (error: Error & { code?: string }) =>
      new Response(JSON.stringify({ code: error.code ?? 'error', message: error.message }), {
        status: error.code === 'invalid_user_id' ? 401 : 500,
        headers: { 'content-type': 'application/json' },
      })
  ),
}));

describe('POST /api/v1/auth/logout', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 when logout succeeds', async () => {
    const auth = await import('$lib/server/auth');
    (auth.logout as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/auth/logout',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.loggedOut).toBe(true);
  });

  it('returns 401 when there is no session userId', async () => {
    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/auth/logout',
        locals: {},
      })
    );

    expect(res.status).toBe(401);
  });

  it('returns 500 (mapped) when the auth service throws unexpectedly', async () => {
    const auth = await import('$lib/server/auth');
    (auth.logout as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('upstream error'));

    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/auth/logout',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(500);
  });
});
