import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/server/services/auth', () => ({
  logout: vi.fn(async () => undefined),
}));

import { POST } from '../../src/routes/api/v1/auth/logout/+server';
import { logout } from '$lib/server/services/auth';

const makeEvent = (userId: string | undefined): RequestEvent =>
  ({
    locals: { userId },
    cookies: { delete: vi.fn(), set: vi.fn(), get: vi.fn(), getAll: vi.fn(), serialize: vi.fn() },
  }) as unknown as RequestEvent;

describe('POST /api/v1/auth/logout', () => {
  it('returns 200 + loggedOut:true with a valid session', async () => {
    const res = await POST(makeEvent('abc'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { loggedOut: true } | null;
      error: unknown;
    };
    expect(body.data?.loggedOut).toBe(true);
    expect(logout).toHaveBeenCalled();
  });

  it('returns an error response when no session is present', async () => {
    const res = await POST(makeEvent(undefined));
    expect(res.status).toBeGreaterThanOrEqual(400);
    const body = (await res.json()) as {
      data: unknown;
      error: { code: string; message: string } | null;
    };
    expect(body.error).not.toBeNull();
  });
});
