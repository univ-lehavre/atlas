import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/services/auth', () => ({
  logout: vi.fn(),
}));

const cookies = () => ({ get: vi.fn(), set: vi.fn(), delete: vi.fn() });

describe('POST /api/v1/auth/logout (AUTH)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('401 with code "session_error" when no userId in locals', async () => {
    const mod = await import('../../../../../src/routes/api/v1/auth/logout/+server');
    const res = await mod.POST({ locals: {}, cookies: cookies() } as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({
      data: null,
      error: { code: 'session_error', message: 'No active session' },
    });
  });

  it('200 when authenticated', async () => {
    const services = await import('$lib/server/services/auth');
    (services.logout as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const mod = await import('../../../../../src/routes/api/v1/auth/logout/+server');
    const res = await mod.POST({
      locals: { userId: 'abc123' },
      cookies: cookies(),
    } as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.loggedOut).toBe(true);
  });
});
