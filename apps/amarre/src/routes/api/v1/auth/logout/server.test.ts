import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/services/auth', () => ({
  logout: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('POST /api/v1/auth/logout — 200', () => {
  it('returns 200 when the session is closed successfully', async () => {
    const authService = await import('$lib/server/services/auth');
    // eslint-disable-next-line unicorn/no-useless-undefined -- mockResolvedValueOnce exige un argument explicite
    (authService.logout as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    // `validateUserId` (paquet atlas-auth) exige un ID hexadécimal — on
    // fournit donc une valeur conforme au format Appwrite.
    const userId = 'abcdef1234567890abcdef1234567890';
    const mod = await import('./+server');
    const event = createRouteEvent({
      method: 'POST',
      url: 'https://example.com/api/v1/auth/logout',
      locals: { userId },
    });
    const res = await mod.POST(event as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ data: { loggedOut: true }, error: null });
    expect(authService.logout).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/v1/auth/logout — 401', () => {
  it('returns 401 when the request is unauthenticated', async () => {
    const authService = await import('$lib/server/services/auth');
    const logout = authService.logout as ReturnType<typeof vi.fn>;
    // Le service lui-même valide l'absence d'userId via `validateUserId`
    // qui lève `SessionError(401)` ; on s'assure que le code 401 est
    // bien remonté par le handler.
    const { SessionError } = await import('@univ-lehavre/atlas-errors');
    logout.mockRejectedValueOnce(new SessionError('No active session'));

    const mod = await import('./+server');
    const event = createRouteEvent({
      method: 'POST',
      url: 'https://example.com/api/v1/auth/logout',
      locals: {},
    });
    const res = await mod.POST(event as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({
      data: null,
      error: { code: 'session_error' },
    });
  });
});

describe('POST /api/v1/auth/logout — payload malformé', () => {
  it('returns 400 when locals.userId is malformed (wrong type)', async () => {
    const authService = await import('$lib/server/services/auth');
    const logout = authService.logout as ReturnType<typeof vi.fn>;
    const { UserIdValidationError } = await import('@univ-lehavre/atlas-errors');
    logout.mockRejectedValueOnce(new UserIdValidationError('Invalid user id'));

    const mod = await import('./+server');
    const event = createRouteEvent({
      method: 'POST',
      url: 'https://example.com/api/v1/auth/logout',
      locals: { userId: 12_345 as unknown as string },
    });
    const res = await mod.POST(event as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({
      data: null,
      error: { code: 'userid_validation_error' },
    });
  });
});
