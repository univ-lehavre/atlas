import { describe, expect, it, vi, beforeEach } from 'vitest';

// Phase 7.2 DevSecOps — couverture 401 sur l'endpoint `/users`
// (lecture utilisateurs côté CRF, AUTH-gated).
vi.mock('$lib/server/services/userService', () => ({
  listUsersFromCrf: vi.fn(),
}));

describe('GET /api/v1/users (AUTH)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('401 with code "unauthenticated" when no userId in locals', async () => {
    const mod = await import('./+server');
    const res = await mod.GET({
      locals: {},
      fetch: vi.fn(),
    } as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({
      data: null,
      error: { code: 'unauthenticated', message: 'User not authenticated' },
    });
  });

  it('200 with the list of users when authenticated', async () => {
    const services = await import('$lib/server/services/userService');
    (services.listUsersFromCrf as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { username: 'alice' },
      { username: 'bob' },
    ]);

    const mod = await import('./+server');
    const res = await mod.GET({
      locals: { userId: 'abc123' },
      fetch: vi.fn(),
    } as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(2);
  });
});
