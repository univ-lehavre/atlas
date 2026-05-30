import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

// `$env/static/private` est résolu par mergeConfig(viteConfig, …) à
// partir des fichiers `.env` du paquet. Le handler appelle
// `signupWithEmail` du service `$lib/server/services/auth` — mocké ici
// pour ne pas joindre Appwrite. La validation d'email passe par le
// vrai `validateSignupEmail` du paquet `@univ-lehavre/atlas-auth`.
vi.mock('$lib/server/services/auth', () => ({
  signupWithEmail: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe('POST /api/v1/auth/signup — 200', () => {
  it('returns 200 when signup succeeds for an allowed domain', async () => {
    const authService = await import('$lib/server/services/auth');
    (authService.signupWithEmail as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      $createdAt: '2026-05-30T10:00:00.000Z',
    });

    const mod = await import('./+server');
    const event = createRouteEvent({
      method: 'POST',
      url: 'https://example.com/api/v1/auth/signup',
      body: { email: 'someone@example.org' },
      ip: '203.0.113.200',
    });
    const res = await mod.POST(event as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({ signedUp: true });
  });
});

describe('POST /api/v1/auth/signup — 401 (rate-limit)', () => {
  it('returns 401-equivalent (rate-limit) after the 5 req/min cap', async () => {
    // L'endpoint signup est non authentifié par nature (création de
    // compte) ; le contrat « 401 » se traduit ici par la protection
    // anti-abus qui rejette les requêtes excédentaires (Phase 6.5).
    const authService = await import('$lib/server/services/auth');
    (authService.signupWithEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      $createdAt: '2026-05-30T10:00:00.000Z',
    });

    const mod = await import('./+server');
    const ip = '203.0.113.201';

    for (let i = 0; i < 5; i++) {
      const res = await mod.POST(
        createRouteEvent({
          method: 'POST',
          url: 'https://example.com/api/v1/auth/signup',
          body: { email: 'someone@example.org' },
          ip,
        }) as never
      );
      expect(res.status).toBe(200);
    }

    const denied = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/auth/signup',
        body: { email: 'someone@example.org' },
        ip,
      }) as never
    );

    expect(denied.status).toBe(429);
    const body = await denied.json();
    expect(body.error.code).toBe('rate_limited');
  });
});

describe('POST /api/v1/auth/signup — payload malformé', () => {
  it('returns 400 when the payload is malformed (missing email field)', async () => {
    const authService = await import('$lib/server/services/auth');
    const signupWithEmail = authService.signupWithEmail as ReturnType<typeof vi.fn>;

    const mod = await import('./+server');
    const event = createRouteEvent({
      method: 'POST',
      url: 'https://example.com/api/v1/auth/signup',
      body: { not_email: 'oops' },
      ip: '203.0.113.202',
    });
    const res = await mod.POST(event as never);

    expect(res.status).toBe(400);
    expect(signupWithEmail).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body).toMatchObject({ data: null, error: { code: expect.any(String) } });
  });
});
