import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

// Phase 3 — couverture du handler factory `createLoginHandler`
// (packages/auth/src/handlers.ts). On vérifie le contrat :
//   - 200 sur appel JSON `{ userId, secret }` valide
//   - 4xx sur Content-Type incorrect ou JSON invalide
//   - 401 sur identifiants invalides (le service lève)

vi.mock('$env/static/private', () => ({ APPWRITE_KEY: 'k' }));
vi.mock('$env/static/public', () => ({
  PUBLIC_APPWRITE_ENDPOINT: 'http://localhost',
  PUBLIC_APPWRITE_PROJECT: 'p',
  PUBLIC_LOGIN_URL: 'http://localhost',
}));

vi.mock('$lib/server/services/authService', () => ({
  login: vi.fn(),
}));

describe('POST /api/v1/auth/login', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with { loggedIn: true } when login succeeds', async () => {
    const services = await import('$lib/server/services/authService');
    // eslint-disable-next-line unicorn/no-useless-undefined -- mockResolvedValueOnce exige un argument
    (services.login as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/auth/login',
        body: { userId: 'abc123', secret: 'magic-secret' },
      }) as never
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { loggedIn: true }, error: null });
  });

  it('returns 401 when the service rejects with SessionError (invalid credentials)', async () => {
    const services = await import('$lib/server/services/authService');
    const { SessionError } = await import('@univ-lehavre/atlas-errors');
    (services.login as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new SessionError('Invalid magic link', { cause: 'expired secret' })
    );

    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/auth/login',
        body: { userId: 'abc123', secret: 'wrong' },
      }) as never
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('session_error');
  });

  it('returns 4xx when the request body is malformed (invalid JSON)', async () => {
    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/auth/login',
        body: 'this-is-not-json',
        headers: { 'content-type': 'application/json' },
      }) as never
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 4xx when content-type is not application/json', async () => {
    const mod = await import('./+server');
    const res = await mod.POST(
      createRouteEvent({
        method: 'POST',
        url: 'https://example.com/api/v1/auth/login',
        body: 'userId=abc&secret=x',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      }) as never
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
