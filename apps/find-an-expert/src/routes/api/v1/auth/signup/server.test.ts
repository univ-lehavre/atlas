import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/auth', () => ({
  signupWithEmail: vi.fn(),
  checkRequestBody: vi.fn((req: Request) => req.json()),
}));

vi.mock('$lib/server/http', () => ({
  mapErrorToResponse: vi.fn((error: Error) => new Response(error.message, { status: 500 })),
}));

const buildRequest = (body: unknown): Request =>
  new Request('https://example.com/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/v1/auth/signup (rate-limited)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 when signup succeeds', async () => {
    const auth = await import('$lib/server/auth');
    (auth.signupWithEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      $createdAt: '2026-01-01T00:00:00.000Z',
    });

    const mod = await import('./+server');
    const res = await mod.POST({
      request: buildRequest({ email: 'user@example.org' }),
      getClientAddress: () => '203.0.113.90',
    } as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
  });

  it('returns 429 after the 5 req/min anti-spam threshold is hit', async () => {
    const auth = await import('$lib/server/auth');
    (auth.signupWithEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      $createdAt: '2026-01-01T00:00:00.000Z',
    });

    const mod = await import('./+server');
    const ip = '203.0.113.91';

    for (let i = 0; i < 5; i++) {
      const res = await mod.POST({
        request: buildRequest({ email: 'user@example.org' }),
        getClientAddress: () => ip,
      } as never);
      expect(res.status).toBe(200);
    }

    const denied = await mod.POST({
      request: buildRequest({ email: 'user@example.org' }),
      getClientAddress: () => ip,
    } as never);

    expect(denied.status).toBe(429);
    const body = await denied.json();
    expect(body.code).toBe('rate_limited');
  });
});
