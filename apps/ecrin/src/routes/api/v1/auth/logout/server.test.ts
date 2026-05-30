import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

// Phase 3 — couverture du handler factory `createLogoutHandler`
// (packages/auth/src/handlers.ts). Le service local `logout` lève
// SessionError quand `locals.userId` est manquant/invalide ; on
// laisse remonter pour vérifier la cartographie d'erreur.

vi.mock('$env/static/private', () => ({ APPWRITE_KEY: 'k' }));
vi.mock('$env/static/public', () => ({
  PUBLIC_APPWRITE_ENDPOINT: 'http://localhost',
  PUBLIC_APPWRITE_PROJECT: 'p',
  PUBLIC_LOGIN_URL: 'http://localhost',
}));

vi.mock('$lib/server/services/authService', () => ({
  logout: vi.fn(),
}));

describe('POST /api/v1/auth/logout', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with { loggedOut: true } when authenticated', async () => {
    const services = await import('$lib/server/services/authService');
    (services.logout as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({ method: 'POST', locals: { userId: 'abc123' } }) as never
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { loggedOut: true }, error: null });
  });

  it('returns 401 with code "session_error" when no userId in locals', async () => {
    const services = await import('$lib/server/services/authService');
    // Le vrai `logout` lève SessionError ; on simule la propagation.
    const { SessionError } = await import('@univ-lehavre/atlas-errors');
    (services.logout as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new SessionError('No active session', { cause: 'missing userId' })
    );

    const mod = await import('./+server');
    const res = await mod.POST(createRouteEvent({ method: 'POST', locals: {} }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('session_error');
  });

  it('returns 401 when locals.userId is malformed (non-string)', async () => {
    const services = await import('$lib/server/services/authService');
    const { UserIdValidationError } = await import('@univ-lehavre/atlas-errors');
    (services.logout as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new UserIdValidationError('userId must be a non-empty string')
    );

    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        locals: { userId: { not: 'a-string' } },
      }) as never
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
    const body = await res.json();
    expect(body.error.code).toBeDefined();
  });
});
