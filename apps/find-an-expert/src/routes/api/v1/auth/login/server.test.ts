import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/auth', () => ({
  login: vi.fn(),
  ensureJsonContentType: vi.fn((req: Request) => {
    const ct = req.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      const err: Error & { code?: string } = new Error('invalid content-type');
      err.code = 'invalid_content_type';
      throw err;
    }
  }),
  parseJsonBody: vi.fn(async (req: Request) => {
    try {
      return await req.json();
    } catch {
      const err: Error & { code?: string } = new Error('invalid JSON body');
      err.code = 'invalid_json_body';
      throw err;
    }
  }),
  validateMagicUrlLogin: vi.fn((userId: unknown, secret: unknown) => {
    if (typeof userId !== 'string' || typeof secret !== 'string') {
      const err: Error & { code?: string } = new Error('invalid magic url');
      err.code = 'invalid_magic_url';
      throw err;
    }
    return { userId, secret };
  }),
}));

vi.mock('$lib/server/http', () => ({
  mapErrorToResponse: vi.fn((error: Error & { code?: string }) => {
    const code = error.code ?? 'error';
    const status = code === 'invalid_content_type' || code === 'invalid_json_body' ? 400 : 422;
    return new Response(JSON.stringify({ code, message: error.message }), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }),
}));

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 when login succeeds', async () => {
    const auth = await import('$lib/server/auth');
    (auth.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ $id: 'session-1' });

    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/auth/login',
        body: { userId: 'user-1', secret: 'magic-secret' },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.loggedIn).toBe(true);
  });

  it('returns 422 when the magic url payload is invalid (missing fields)', async () => {
    // Public endpoint: no auth gate. We exercise the "malformed payload"
    // path by omitting `secret`.
    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/auth/login',
        body: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe('invalid_magic_url');
  });

  it('returns 400 when the content-type is not JSON', async () => {
    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/auth/login',
        headers: { 'content-type': 'text/plain' },
        body: 'userId=user-1&secret=x',
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('invalid_content_type');
  });
});
