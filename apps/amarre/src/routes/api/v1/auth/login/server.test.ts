import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/services/auth', () => ({
  login: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('POST /api/v1/auth/login — 200', () => {
  it('returns 200 when the magic-link credentials are accepted', async () => {
    const authService = await import('$lib/server/services/auth');
    (authService.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      userId: 'abcdef1234567890abcdef1234567890',
    });

    const mod = await import('./+server');
    const event = createRouteEvent({
      method: 'POST',
      url: 'https://example.com/api/v1/auth/login',
      body: {
        userId: 'abcdef1234567890abcdef1234567890',
        secret: 'cafebabe1234567890abcdef1234567890abcdef',
      },
    });
    const res = await mod.POST(event as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ data: { loggedIn: true }, error: null });
    expect(authService.login).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/v1/auth/login — 401', () => {
  it('returns 401 when the login service rejects the session', async () => {
    // Login est non authentifié par essence (créer la session) — le
    // contrat 401 correspond ici au cas où le service rejette parce
    // que la session ne peut pas être ouverte.
    const authService = await import('$lib/server/services/auth');
    const login = authService.login as ReturnType<typeof vi.fn>;
    const { SessionError } = await import('@univ-lehavre/atlas-errors');
    login.mockRejectedValueOnce(new SessionError('No active session'));

    const mod = await import('./+server');
    const event = createRouteEvent({
      method: 'POST',
      url: 'https://example.com/api/v1/auth/login',
      body: {
        userId: 'abcdef1234567890abcdef1234567890',
        secret: 'cafebabe1234567890abcdef1234567890abcdef',
      },
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

describe('POST /api/v1/auth/login — payload malformé', () => {
  it('returns 400 when the payload is malformed (missing content-type)', async () => {
    const authService = await import('$lib/server/services/auth');
    const login = authService.login as ReturnType<typeof vi.fn>;

    // Pas de content-type → le handler doit refuser avant d'appeler
    // le service. On utilise un Request brut pour contrôler les headers.
    const request = new Request('https://example.com/api/v1/auth/login', {
      method: 'POST',
      body: 'not-json-at-all',
    });
    const event = {
      request,
      cookies: {
        get: () => {},
        getAll: () => [],
        set: () => {},
        delete: () => {},
        serialize: () => '',
      },
    };

    const mod = await import('./+server');
    const res = await mod.POST(event as never);

    expect(res.status).toBe(400);
    expect(login).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body).toMatchObject({ data: null, error: { code: expect.any(String) } });
  });
});
