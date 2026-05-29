import { describe, expect, it, vi } from 'vitest';
import type { Cookies } from '@sveltejs/kit';
import { createLoginHandler, createLogoutHandler } from './handlers.js';

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
    // eslint-disable-next-line unicorn/no-useless-undefined
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
