import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/services/authService', () => ({
  signupWithEmail: vi.fn(),
}));

vi.mock('$lib/validators/server/auth', () => ({
  validateSignupEmail: vi.fn(async (email: string) => email),
}));

vi.mock('$lib/errors/mapper', () => ({
  mapErrorToResponse: vi.fn((error: Error) => new Response(error.message, { status: 500 })),
}));

const buildRequest = (email: string): Request => {
  const form = new FormData();
  form.append('email', email);
  return new Request('https://example.com/api/v1/auth/signup', { method: 'POST', body: form });
};

describe('POST /api/v1/auth/signup (rate-limited)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 when signup succeeds', async () => {
    const services = await import('$lib/server/services/authService');
    (services.signupWithEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      $createdAt: '2026-01-01T00:00:00.000Z',
    });

    const mod = await import('./+server');
    const res = await mod.POST({
      request: buildRequest('user@univ-lehavre.fr'),
      fetch: vi.fn(),
      cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      getClientAddress: () => '203.0.113.70',
    } as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
  });

  it('returns 429 after the 5 req/min anti-spam threshold is hit', async () => {
    const services = await import('$lib/server/services/authService');
    (services.signupWithEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      $createdAt: '2026-01-01T00:00:00.000Z',
    });

    const mod = await import('./+server');
    const ip = '203.0.113.80';

    for (let i = 0; i < 5; i++) {
      const res = await mod.POST({
        request: buildRequest('user@univ-lehavre.fr'),
        fetch: vi.fn(),
        cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
        getClientAddress: () => ip,
      } as never);
      expect(res.status).toBe(200);
    }

    const denied = await mod.POST({
      request: buildRequest('user@univ-lehavre.fr'),
      fetch: vi.fn(),
      cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      getClientAddress: () => ip,
    } as never);

    expect(denied.status).toBe(429);
    const body = await denied.json();
    expect(body.error.code).toBe('rate_limited');
  });
});
