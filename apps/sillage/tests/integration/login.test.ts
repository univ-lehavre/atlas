import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/server/services/auth', () => ({
  login: vi.fn(async () => ({
    $id: 'session-123',
    userId: 'abc',
    expire: '2026-05-22T11:00:00.000Z',
    provider: 'magic-url',
    ip: '127.0.0.1',
  })),
}));

import { POST } from '../../src/routes/api/v1/auth/login/+server';
import { login } from '$lib/server/services/auth';

const makeEvent = (body: Record<string, unknown>, contentType = 'application/json'): RequestEvent =>
  ({
    request: new Request('http://localhost/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: JSON.stringify(body),
    }),
    cookies: { delete: vi.fn(), set: vi.fn(), get: vi.fn(), getAll: vi.fn(), serialize: vi.fn() },
  }) as unknown as RequestEvent;

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 + loggedIn:true with valid userId + secret', async () => {
    const res = await POST(makeEvent({ userId: 'abc', secret: 'def' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { loggedIn: true } | null;
      error: unknown;
    };
    expect(body.data?.loggedIn).toBe(true);
    expect(login).toHaveBeenCalledWith('abc', 'def', expect.anything());
  });

  it('returns an error response when userId is missing', async () => {
    const res = await POST(makeEvent({ secret: 'abc' }));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(login).not.toHaveBeenCalled();
  });

  it('returns an error response when secret is missing', async () => {
    const res = await POST(makeEvent({ userId: 'user-123' }));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(login).not.toHaveBeenCalled();
  });

  it('returns an error response on a non-JSON content-type', async () => {
    const res = await POST(makeEvent({ userId: 'u', secret: 's' }, 'text/plain'));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(login).not.toHaveBeenCalled();
  });
});
