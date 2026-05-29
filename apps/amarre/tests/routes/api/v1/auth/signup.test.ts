import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/services/auth', () => ({
  signupWithEmail: vi.fn(),
}));

vi.mock('$lib/server/validators/auth', () => ({
  checkRequestBody: vi.fn((req: Request) => req.json()),
  validateSignupEmail: vi.fn(async (email: unknown) => {
    if (typeof email !== 'string' || !email.includes('@')) {
      const { NotAnEmailError } = await import('$lib/errors');
      throw new NotAnEmailError('Invalid email');
    }
    return email;
  }),
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

  it('returns 400 when checkRequestBody rejects a missing required field', async () => {
    const validators = await import('$lib/server/validators/auth');
    const errors = await import('@univ-lehavre/atlas-errors');
    (validators.checkRequestBody as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new errors.RequestBodyValidationError('Missing required field', {
        cause: 'email is required',
      })
    );

    const mod = await import('../../../../../src/routes/api/v1/auth/signup/+server');
    const res = await mod.POST({
      request: buildRequest({}),
      fetch: vi.fn(),
      getClientAddress: () => '203.0.113.10',
    } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('request_body_validation_error');
  });

  it('returns 400 when validateSignupEmail rejects a malformed email', async () => {
    const validators = await import('$lib/server/validators/auth');
    (validators.checkRequestBody as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      email: 'not-an-email',
    });

    const mod = await import('../../../../../src/routes/api/v1/auth/signup/+server');
    const res = await mod.POST({
      request: buildRequest({ email: 'not-an-email' }),
      fetch: vi.fn(),
      getClientAddress: () => '203.0.113.20',
    } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_email');
  });

  it('returns 200 with token metadata when signup succeeds', async () => {
    const services = await import('$lib/server/services/auth');
    (services.signupWithEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      $createdAt: '2026-01-01T00:00:00.000Z',
    });

    const mod = await import('../../../../../src/routes/api/v1/auth/signup/+server');
    const res = await mod.POST({
      request: buildRequest({ email: 'user@univ-lehavre.fr' }),
      fetch: vi.fn(),
      getClientAddress: () => '203.0.113.50',
    } as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.signedUp).toBe(true);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
  });

  it('returns 429 after the 5 req/min anti-spam threshold is hit', async () => {
    const services = await import('$lib/server/services/auth');
    (services.signupWithEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      $createdAt: '2026-01-01T00:00:00.000Z',
    });

    const mod = await import('../../../../../src/routes/api/v1/auth/signup/+server');
    const ip = '203.0.113.60';

    for (let i = 0; i < 5; i++) {
      const res = await mod.POST({
        request: buildRequest({ email: 'user@univ-lehavre.fr' }),
        fetch: vi.fn(),
        getClientAddress: () => ip,
      } as never);
      expect(res.status).toBe(200);
    }

    const denied = await mod.POST({
      request: buildRequest({ email: 'user@univ-lehavre.fr' }),
      fetch: vi.fn(),
      getClientAddress: () => ip,
    } as never);

    expect(denied.status).toBe(429);
    const body = await denied.json();
    expect(body.error.code).toBe('rate_limited');
    expect(denied.headers.get('Retry-After')).toMatch(/^\d+$/);
  });
});
