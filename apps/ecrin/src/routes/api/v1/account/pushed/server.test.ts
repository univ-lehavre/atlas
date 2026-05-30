import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

// Phase 3 — couverture handler `GET /api/v1/account/pushed`. AUTH-gated
// par `getSession(cookies)`.

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
  checkAccountPushed: vi.fn(),
}));

describe('GET /api/v1/account/pushed', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with the pushed-status payload when the session is valid', async () => {
    const baas = await import('$lib/baas/server');
    const services = await import('$lib/server/services/accountService');
    (baas.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'rec-1',
      email: 'alice@example.org',
    });
    (services.checkAccountPushed as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      hasPushedID: true,
      hasPushedEmail: true,
      hasPushedAccount: true,
      isActive: true,
    });

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({}) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data).toMatchObject({ hasPushedAccount: true });
  });

  it('returns 500 with code "internal_error" when no session cookie is present', async () => {
    const baas = await import('$lib/baas/server');
    const { SessionError } = await import('@univ-lehavre/atlas-errors');
    (baas.getSession as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new SessionError('No active session', { cause: 'missing cookie' })
    );

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({}) as never);

    // Le handler ne distingue pas SessionError vs autres ; il
    // renvoie 500 systématiquement. Documente le comportement actuel.
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
  });

  it('returns 500 with code "internal_error" when the service throws (malformed upstream response)', async () => {
    const baas = await import('$lib/baas/server');
    const services = await import('$lib/server/services/accountService');
    (baas.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'rec-1',
      email: 'alice@example.org',
    });
    (services.checkAccountPushed as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('REDCap returned a malformed payload')
    );

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({}) as never);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
  });
});
