import { describe, expect, it, vi, beforeEach } from 'vitest';

// Phase 7.2 DevSecOps — couverture 401 sur les endpoints AUTH non
// servis par les factories (cf. packages/auth/src/handlers.ts). Mock
// les services + l'env SvelteKit pour exercer uniquement le contrat
// handler.
vi.mock('$env/static/private', () => ({ APPWRITE_KEY: 'k' }));
vi.mock('$env/static/public', () => ({
  PUBLIC_APPWRITE_ENDPOINT: 'http://localhost',
  PUBLIC_APPWRITE_PROJECT: 'p',
  PUBLIC_LOGIN_URL: 'http://localhost',
}));

vi.mock('$lib/server/services/authService', () => ({
  deleteUser: vi.fn(),
}));

vi.mock('$lib/errors/mapper', async () => {
  const { mapErrorToApiResponse } = await import('@univ-lehavre/atlas-errors');
  return {
    mapErrorToResponse: (error: unknown): Response => {
      const { body, status } = mapErrorToApiResponse(error);
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    },
  };
});

describe('POST /api/v1/auth/delete (AUTH)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('401 with code "session_error" when no userId in locals', async () => {
    const mod = await import('./+server');
    const res = await mod.POST({
      locals: {},
      cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
    } as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('session_error');
  });

  it('200 with { deleted: true } when authenticated', async () => {
    const services = await import('$lib/server/services/authService');
    (services.deleteUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    const mod = await import('./+server');
    const res = await mod.POST({
      locals: { userId: 'abc123' },
      cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
    } as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ data: { deleted: true }, error: null });
  });
});
