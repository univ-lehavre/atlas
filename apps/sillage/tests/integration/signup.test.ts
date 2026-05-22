import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the auth service before importing the handler. The real
// `signupWithEmail` reaches out to Appwrite ; we just need it to be
// a controllable spy here.
vi.mock('$lib/server/services/auth', () => ({
  signupWithEmail: vi.fn(async () => ({
    $id: 'token-123',
    userId: 'user-mock',
    $createdAt: '2026-05-22T10:00:00.000Z',
    $updatedAt: '2026-05-22T10:00:00.000Z',
    expire: '2026-05-22T10:15:00.000Z',
    secret: '',
    phrase: '',
    securityPhrase: null,
  })),
}));

import { POST } from '../../src/routes/api/v1/auth/signup/+server';
import { signupWithEmail } from '$lib/server/services/auth';

// Each test gets its own client IP so the in-memory rate limiter (5
// req / 60 s / IP) doesn't leak state across tests.
let nextIp = 1;
const freshIp = (): string => `10.0.0.${nextIp++}`;

const makeEvent = (body: unknown, ip = freshIp(), contentType = 'application/json'): RequestEvent =>
  ({
    request: new Request('http://localhost/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    getClientAddress: () => ip,
  }) as unknown as RequestEvent;

describe('POST /api/v1/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 + signedUp:true on a valid email from an allowed domain', async () => {
    const res = await POST(makeEvent({ email: 'someone@example.org' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { signedUp: true; createdAt: string } | null;
      error: unknown;
    };
    expect(body.data?.signedUp).toBe(true);
    expect(signupWithEmail).toHaveBeenCalledWith('someone@example.org');
  });

  it('returns 400 invalid_email when the email is malformed', async () => {
    const res = await POST(makeEvent({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      data: unknown;
      error: { code: string; message: string } | null;
    };
    expect(body.error?.code).toBe('invalid_email');
    expect(signupWithEmail).not.toHaveBeenCalled();
  });

  it('returns 400 invalid_email when the domain is not allowed', async () => {
    const res = await POST(makeEvent({ email: 'someone@evil.com' }));
    expect(res.status).toBe(400);
    expect(signupWithEmail).not.toHaveBeenCalled();
  });

  it('returns 429 rate_limited after 5 hits from the same IP', async () => {
    const ip = freshIp();
    // 5 hits within the window should succeed (rate.ok), the 6th rejects.
    for (let i = 0; i < 5; i++) {
      const ok = await POST(makeEvent({ email: `user${i}@example.org` }, ip));
      expect(ok.status).toBe(200);
    }
    const blocked = await POST(makeEvent({ email: 'last@example.org' }, ip));
    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as {
      error: { code: string } | null;
    };
    expect(body.error?.code).toBe('rate_limited');
  });
});
