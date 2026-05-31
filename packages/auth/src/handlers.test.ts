import { describe, expect, it, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import {
  createLoginHandler,
  createLogoutHandler,
  createMeHandler,
  createSignupHandler,
} from './handlers.js';

const cookies = (): Cookies =>
  ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
    serialize: vi.fn(),
  }) as unknown as Cookies;

const jsonRequest = (body: unknown, contentType = 'application/json'): Request =>
  new Request('https://example.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('createLoginHandler', () => {
  it('returns 200 when service.login resolves', async () => {
    const login = vi.fn().mockResolvedValueOnce({ $id: 'session_1' });
    const POST = createLoginHandler({ login });
    const res = await POST({
      request: jsonRequest({ userId: 'abc123', secret: 'def456' }),
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { loggedIn: true }, error: null });
    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith('abc123', 'def456', expect.any(Object));
  });

  it('returns 400 when Content-Type is not application/json', async () => {
    const login = vi.fn();
    const POST = createLoginHandler({ login });
    const res = await POST({
      request: jsonRequest('userId=x&secret=y', 'application/x-www-form-urlencoded'),
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_content_type');
    expect(login).not.toHaveBeenCalled();
  });

  it('returns 400 when the body is malformed JSON', async () => {
    const login = vi.fn();
    const POST = createLoginHandler({ login });
    const res = await POST({
      request: jsonRequest('{ broken json'),
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_json');
    expect(login).not.toHaveBeenCalled();
  });

  it('propagates a service error to the response (via mapErrorToApiResponse)', async () => {
    const { MagicUrlLoginValidationError } = await import('@univ-lehavre/atlas-errors');
    const login = vi.fn().mockRejectedValueOnce(
      new MagicUrlLoginValidationError('Login failed', {
        cause: 'Invalid userId or secret format',
      })
    );
    const POST = createLoginHandler({ login });
    const res = await POST({
      request: jsonRequest({ userId: 'not-hex', secret: 'def456' }),
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('magicurl_login_validation_error');
  });

  it('maps a non-ApplicationError thrown by the service to 500', async () => {
    const login = vi.fn().mockRejectedValueOnce(new Error('boom'));
    const POST = createLoginHandler({ login });
    const res = await POST({
      request: jsonRequest({ userId: 'abc123', secret: 'def456' }),
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
  });
});

describe('createLogoutHandler', () => {
  it('returns 200 when service.logout resolves', async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- mockResolvedValueOnce(undefined) explicite Promise<void>
    const logout = vi.fn<() => Promise<void>>().mockResolvedValueOnce(undefined);
    const POST = createLogoutHandler({ logout });
    const res = await POST({
      locals: { userId: 'abc123' },
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { loggedOut: true }, error: null });
    expect(logout).toHaveBeenCalledWith('abc123', expect.any(Object));
  });

  it('returns 401 when service.logout raises SessionError on missing userId', async () => {
    const { SessionError } = await import('@univ-lehavre/atlas-errors');
    const logout = vi
      .fn()
      .mockRejectedValueOnce(
        new SessionError('No active session', { cause: 'Missing userId in session' })
      );
    const POST = createLogoutHandler({ logout });
    const res = await POST({
      locals: {},
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('session_error');
    expect(body.error.message).toBe('No active session');
  });

  it('returns 400 when service.logout raises UserIdValidationError on malformed userId', async () => {
    const { UserIdValidationError } = await import('@univ-lehavre/atlas-errors');
    const logout = vi
      .fn()
      .mockRejectedValueOnce(
        new UserIdValidationError('Operation failed', { cause: 'Invalid userId format' })
      );
    const POST = createLogoutHandler({ logout });
    const res = await POST({
      locals: { userId: 'not-hex' },
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('userid_validation_error');
  });

  it('maps a non-ApplicationError thrown by the service to 500', async () => {
    const logout = vi.fn().mockRejectedValueOnce(new Error('boom'));
    const POST = createLogoutHandler({ logout });
    const res = await POST({
      locals: { userId: 'abc123' },
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
  });
});

const signupJsonReq = (body: Record<string, unknown>): Request =>
  new Request('https://example.com/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const signupEventFor = (
  request: Request,
  ip = '203.0.113.1'
): { request: Request; getClientAddress: () => string } => ({
  request,
  getClientAddress: () => ip,
});

describe('createSignupHandler', () => {
  it('returns 200 with createdAt when signup succeeds (default JSON extractor)', async () => {
    const validateEmail = vi.fn().mockResolvedValueOnce('user@example.com');
    const signupWithEmail = vi
      .fn()
      .mockResolvedValueOnce({ $createdAt: '2026-01-01T00:00:00.000Z' });
    const POST = createSignupHandler({ validateEmail, signupWithEmail });

    const res = await POST(signupEventFor(signupJsonReq({ email: 'user@example.com' })) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      data: { signedUp: true, createdAt: '2026-01-01T00:00:00.000Z' },
      error: null,
    });
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(validateEmail).toHaveBeenCalledWith('user@example.com');
    expect(signupWithEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({ request: expect.any(Request) })
    );
  });

  it('uses the provided extractEmail strategy (e.g. FormData)', async () => {
    const formReq = new Request('https://example.com/api/v1/auth/signup', {
      method: 'POST',
      body: (() => {
        const form = new FormData();
        form.set('email', 'user@example.com');
        return form;
      })(),
    });

    const validateEmail = vi.fn().mockResolvedValueOnce('user@example.com');
    const signupWithEmail = vi.fn().mockResolvedValueOnce({ $createdAt: 't' });
    const extractEmail = vi.fn(async (request: Request) => {
      const form = await request.formData();
      return form.get('email');
    });

    const POST = createSignupHandler({ extractEmail, validateEmail, signupWithEmail });
    const res = await POST(signupEventFor(formReq) as never);

    expect(res.status).toBe(200);
    expect(extractEmail).toHaveBeenCalledTimes(1);
    expect(validateEmail).toHaveBeenCalledWith('user@example.com');
  });

  it('returns 429 with Retry-After when the rate limit is hit', async () => {
    const validateEmail = vi.fn(async (e: unknown) => e as string);
    const signupWithEmail = vi.fn().mockResolvedValue({ $createdAt: 't' });
    const POST = createSignupHandler({
      validateEmail,
      signupWithEmail,
      rateLimit: { limit: 2, windowMs: 60_000 },
    });

    const ip = '203.0.113.42';
    await POST(signupEventFor(signupJsonReq({ email: 'a@b' }), ip) as never);
    await POST(signupEventFor(signupJsonReq({ email: 'a@b' }), ip) as never);
    const third = await POST(signupEventFor(signupJsonReq({ email: 'a@b' }), ip) as never);

    expect(third.status).toBe(429);
    expect(third.headers.get('Retry-After')).toMatch(/^\d+$/);
    const body = await third.json();
    expect(body.error.code).toBe('rate_limited');
    expect(signupWithEmail).toHaveBeenCalledTimes(2);
  });

  it('isolates the rate limit per client IP', async () => {
    const validateEmail = vi.fn(async (e: unknown) => e as string);
    const signupWithEmail = vi.fn().mockResolvedValue({ $createdAt: 't' });
    const POST = createSignupHandler({
      validateEmail,
      signupWithEmail,
      rateLimit: { limit: 1, windowMs: 60_000 },
    });

    const res1 = await POST(
      signupEventFor(signupJsonReq({ email: 'a@b' }), '203.0.113.1') as never
    );
    const res2 = await POST(
      signupEventFor(signupJsonReq({ email: 'a@b' }), '203.0.113.2') as never
    );

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });

  it('returns 400 when extractEmail throws an ApplicationError (missing field)', async () => {
    const POST = createSignupHandler({
      validateEmail: vi.fn(),
      signupWithEmail: vi.fn(),
    });
    const res = await POST(signupEventFor(signupJsonReq({}), '203.0.113.5') as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('request_body_validation_error');
  });

  it('propagates a validateEmail rejection as 400 (e.g. NotAnEmailError)', async () => {
    const { NotAnEmailError } = await import('@univ-lehavre/atlas-errors');
    const validateEmail = vi
      .fn()
      .mockRejectedValueOnce(new NotAnEmailError('Invalid', { cause: 'malformed' }));
    const signupWithEmail = vi.fn();
    const POST = createSignupHandler({ validateEmail, signupWithEmail });

    const res = await POST(
      signupEventFor(signupJsonReq({ email: 'not-an-email' }), '203.0.113.6') as never
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_email');
    expect(signupWithEmail).not.toHaveBeenCalled();
  });

  it('maps a non-ApplicationError thrown by signupWithEmail to 500', async () => {
    const POST = createSignupHandler({
      validateEmail: vi.fn(async (e: unknown) => e as string),
      signupWithEmail: vi.fn().mockRejectedValueOnce(new Error('boom')),
    });

    const res = await POST(signupEventFor(signupJsonReq({ email: 'a@b' }), '203.0.113.7') as never);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
  });
});

describe('createMeHandler', () => {
  it('returns 401 with code "unauthenticated" when no userId in locals', async () => {
    const getProfile = vi.fn();
    const GET = createMeHandler({ getProfile });
    const res = await GET({ locals: {} } as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({
      data: null,
      error: { code: 'unauthenticated', message: 'User not authenticated' },
    });
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('returns 401 when userId is not a non-empty string', async () => {
    const getProfile = vi.fn();
    const GET = createMeHandler({ getProfile });
    const res1 = await GET({ locals: { userId: '' } } as never);
    const res2 = await GET({ locals: { userId: 42 } } as never);

    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
    expect(getProfile).not.toHaveBeenCalled();
  });

  it('returns 200 with the profile wrapped in the data envelope when authenticated', async () => {
    const getProfile = vi.fn().mockResolvedValueOnce({
      id: 'abc123',
      email: 'user@example.com',
      labels: ['amarre'],
    });
    const GET = createMeHandler({ getProfile });
    const res = await GET({ locals: { userId: 'abc123' } } as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      data: { id: 'abc123', email: 'user@example.com', labels: ['amarre'] },
      error: null,
    });
    expect(getProfile).toHaveBeenCalledWith('abc123');
  });

  it('propagates an ApplicationError from getProfile (e.g. UserIdValidationError)', async () => {
    const { UserIdValidationError } = await import('@univ-lehavre/atlas-errors');
    const getProfile = vi
      .fn()
      .mockRejectedValueOnce(
        new UserIdValidationError('Operation failed', { cause: 'Invalid userId format' })
      );
    const GET = createMeHandler({ getProfile });
    const res = await GET({ locals: { userId: 'not-hex' } } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('userid_validation_error');
  });

  it('maps a non-ApplicationError thrown by getProfile to 500', async () => {
    const getProfile = vi.fn().mockRejectedValueOnce(new Error('boom'));
    const GET = createMeHandler({ getProfile });
    const res = await GET({ locals: { userId: 'abc123' } } as never);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
  });
});
