import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/consent', () => ({
  getAllConsents: vi.fn(),
}));

vi.mock('$lib/server/http', () => ({
  mapErrorToResponse: vi.fn((error: Error) => new Response(error.message, { status: 500 })),
}));

describe('GET /api/v1/consents', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with the consents list for an authenticated user', async () => {
    const consent = await import('$lib/server/consent');
    (consent.getAllConsents as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { consentType: 'openalex_email', granted: true, updatedAt: '2026-05-30T00:00:00.000Z' },
    ]);

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/consents',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.consents)).toBe(true);
    expect(body.consents).toHaveLength(1);
  });

  it('returns 401 when the user is not authenticated', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({ url: 'https://example.com/api/v1/consents', locals: {} })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('unauthenticated');
  });

  it('returns 500 via mapErrorToResponse when the service throws', async () => {
    const consent = await import('$lib/server/consent');
    (consent.getAllConsents as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom upstream')
    );

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/consents',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(500);
  });
});
