import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

// Phase 3 — couverture handler `GET /api/v1/account/push`. AUTH-gated
// par `getSession(cookies)` (lève `SessionError` si pas de cookie).
// On mocke à la fois `$lib/baas/server` (wrapper Appwrite local) et
// le service métier.

vi.mock('$env/static/private', () => ({ APPWRITE_KEY: 'k', REDCAP_API_TOKEN: 'tok' }));
vi.mock('$env/static/public', () => ({
  PUBLIC_APPWRITE_ENDPOINT: 'http://localhost',
  PUBLIC_APPWRITE_PROJECT: 'p',
  PUBLIC_LOGIN_URL: 'http://localhost',
}));

vi.mock('$lib/baas/server', () => ({
  getSession: vi.fn(),
}));

vi.mock('$lib/server/services/accountService', () => ({
  pushAccountToCrf: vi.fn(),
}));

describe('GET /api/v1/account/push', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with the CRF result when the session is valid and the push succeeds', async () => {
    const baas = await import('$lib/baas/server');
    const services = await import('$lib/server/services/accountService');
    (baas.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'rec-1',
      email: 'alice@example.org',
    });
    (services.pushAccountToCrf as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      count: 1,
    });

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({}) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data).toEqual({ count: 1 });
  });

  it('returns 500 with code "internal_error" when no session cookie is present (getSession throws)', async () => {
    const baas = await import('$lib/baas/server');
    const { SessionError } = await import('@univ-lehavre/atlas-errors');
    (baas.getSession as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new SessionError('No active session', { cause: 'missing cookie' })
    );

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({}) as never);

    // Le handler attrape toutes les erreurs et renvoie 500 (pas 401).
    // Documente le comportement actuel pour qu'une régression de
    // mapping HTTP soit signalée.
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
  });

  it('returns 502 with code "crf_error" when REDCap returns an unexpected count (malformed upstream response)', async () => {
    const baas = await import('$lib/baas/server');
    const services = await import('$lib/server/services/accountService');
    (baas.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'rec-2',
      email: 'bob@example.org',
    });
    (services.pushAccountToCrf as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      count: 0,
    });

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({}) as never);

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe('crf_error');
  });
});
