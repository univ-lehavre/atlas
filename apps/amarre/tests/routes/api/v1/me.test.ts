import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/services/profile', () => ({
  getProfile: vi.fn(),
}));

describe('GET /api/v1/me (AUTH)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('401 when no userId in locals (unauthenticated)', async () => {
    const mod = await import('../../../../src/routes/api/v1/me/+server');
    const res = await mod.GET({ locals: {} } as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({
      data: null,
      error: { code: 'unauthenticated', message: 'User not authenticated' },
    });
  });

  it('200 with the profile when authenticated', async () => {
    const services = await import('$lib/server/services/profile');
    (services.getProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'user_1',
      email: 'user@univ-lehavre.fr',
      labels: ['amarre'],
    });

    const mod = await import('../../../../src/routes/api/v1/me/+server');
    const res = await mod.GET({ locals: { userId: 'user_1' } } as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.id).toBe('user_1');
  });
});
