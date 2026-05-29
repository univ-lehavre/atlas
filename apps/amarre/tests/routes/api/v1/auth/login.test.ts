import { describe, expect, it, vi, beforeEach } from 'vitest';

// Use the real validators (they don't need env). Mock only the side-effecting
// service layer so the handler exercises the validators' real branches and
// returns the actual ApplicationError subclasses defined in
// @univ-lehavre/atlas-errors.
vi.mock('$env/static/private', () => ({
  ALLOWED_DOMAINS_REGEXP: '.*',
}));

vi.mock('$lib/server/services/auth', () => ({
  login: vi.fn(),
}));

const cookies = () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() });

const jsonRequest = (body: unknown): Request =>
  new Request('https://example.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const rawRequest = (rawBody: string, contentType: string): Request =>
  new Request('https://example.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: rawBody,
  });

describe('POST /api/v1/auth/login (PUBLIC)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('400 when Content-Type is not application/json', async () => {
    const mod = await import('../../../../../src/routes/api/v1/auth/login/+server');
    const res = await mod.POST({
      request: rawRequest('userId=x&secret=y', 'application/x-www-form-urlencoded'),
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_content_type');
  });

  it('400 when the body is malformed JSON', async () => {
    const mod = await import('../../../../../src/routes/api/v1/auth/login/+server');
    const res = await mod.POST({
      request: rawRequest('{ this is not json', 'application/json'),
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_json');
  });

  it('400 when userId is missing from payload', async () => {
    const mod = await import('../../../../../src/routes/api/v1/auth/login/+server');
    const res = await mod.POST({
      request: jsonRequest({ secret: 'deadbeef' }),
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('magicurl_login_validation_error');
  });

  it('400 when secret is missing from payload', async () => {
    const mod = await import('../../../../../src/routes/api/v1/auth/login/+server');
    const res = await mod.POST({
      request: jsonRequest({ userId: 'deadbeef' }),
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('magicurl_login_validation_error');
  });

  it('400 when userId or secret are not hexadecimal', async () => {
    const mod = await import('../../../../../src/routes/api/v1/auth/login/+server');
    const res = await mod.POST({
      request: jsonRequest({ userId: 'not-hex', secret: 'deadbeef' }),
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('magicurl_login_validation_error');
  });

  it('200 when payload is valid (hexadecimal userId + secret)', async () => {
    const services = await import('$lib/server/services/auth');
    (services.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const mod = await import('../../../../../src/routes/api/v1/auth/login/+server');
    const res = await mod.POST({
      request: jsonRequest({
        userId: 'abc123',
        secret: 'def456',
      }),
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.loggedIn).toBe(true);
  });
});
