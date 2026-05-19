import { describe, it, expect, vi, beforeEach } from 'vitest';

// Le service est maintenant un thin wrapper autour de
// `createAuthService` du package `@univ-lehavre/atlas-auth`. Les tests
// du factory (signup / login / logout / deleteUser) vivent dans
// `packages/auth/src/index.test.ts`. On ne re-teste ici que le câblage
// spécifique à l'app : la résolution d'ID via `fetchUserId` (REDCap)
// passée au factory en `resolveUserId`.

const mocks = vi.hoisted(() => ({
  createAuthService: vi.fn(),
  fetchUserId: vi.fn(),
}));

vi.mock('@univ-lehavre/atlas-auth', () => ({
  createAuthService: mocks.createAuthService,
}));

vi.mock('$env/static/private', () => ({ APPWRITE_KEY: 'k' }));
vi.mock('$env/static/public', () => ({
  PUBLIC_APPWRITE_ENDPOINT: 'https://endpoint.test',
  PUBLIC_APPWRITE_PROJECT: 'proj',
  PUBLIC_LOGIN_URL: 'https://example.com',
}));
vi.mock('$lib/server/services/userService', () => ({ fetchUserId: mocks.fetchUserId }));

describe('authService wrapping', () => {
  beforeEach(() => {
    mocks.createAuthService.mockReset();
    mocks.fetchUserId.mockReset();
  });

  it('crée le service partagé login/logout avec la config app', async () => {
    mocks.createAuthService.mockReturnValue({
      signupWithEmail: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      deleteUser: vi.fn(),
    });

    await import('./authService');

    expect(mocks.createAuthService).toHaveBeenCalledWith(
      expect.objectContaining({
        baas: expect.objectContaining({
          endpoint: 'https://endpoint.test',
          projectId: 'proj',
          apiKey: 'k',
        }),
        loginUrl: 'https://example.com',
      })
    );
  });

  it('passe resolveUserId basé sur fetchUserId au signup, et tombe sur undefined si fetchUserId renvoie null', async () => {
    const innerSignup = vi.fn().mockResolvedValue({});
    mocks.createAuthService.mockReturnValue({
      signupWithEmail: innerSignup,
      login: vi.fn(),
      logout: vi.fn(),
      deleteUser: vi.fn(),
    });
    mocks.fetchUserId.mockResolvedValue(null);

    const mod = await import('./authService');
    await mod.signupWithEmail('user@example.org', { fetch: vi.fn() as never });

    // Récupère la config passée au factory pour le signup (dernier appel)
    const lastCallConfig = mocks.createAuthService.mock.calls.at(-1)?.[0] as {
      resolveUserId?: (email: string) => Promise<string | undefined>;
    };
    expect(lastCallConfig.resolveUserId).toBeTypeOf('function');

    const resolved = await lastCallConfig.resolveUserId?.('user@example.org');
    expect(resolved).toBeUndefined();
    expect(mocks.fetchUserId).toHaveBeenCalled();
  });
});
