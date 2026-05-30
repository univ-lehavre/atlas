import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

// Phase 3 — couverture du handler factory `createMeHandler`
// (packages/auth/src/handlers.ts). On mocke le service `getProfile`
// et on exerce les trois branches : 401 (unauthenticated), 200
// (profil renvoyé), et une 4ᵉ branche pour le payload malformé
// (locals.userId non-string).

vi.mock('$lib/server/services/profileService', () => ({
  getProfile: vi.fn(),
}));

describe('GET /api/v1/me', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 401 with code "unauthenticated" when no userId in locals', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: {} }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({
      data: null,
      error: { code: 'unauthenticated', message: 'User not authenticated' },
    });
  });

  it('returns 200 with the profile when authenticated', async () => {
    const services = await import('$lib/server/services/profileService');
    (services.getProfile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'abc123',
      email: 'alice@example.org',
      labels: ['user'],
    });

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: { userId: 'abc123' } }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({ id: 'abc123', email: 'alice@example.org' });
  });

  it('returns 401 when locals.userId is not a string (malformed)', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({ locals: { userId: 42 as unknown as string } }) as never
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('unauthenticated');
  });
});
