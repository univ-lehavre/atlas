import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/consent', async () => {
  const { z } = await import('zod');
  return {
    getConsentStatus: vi.fn(),
    grantConsent: vi.fn(),
    revokeConsent: vi.fn(),
    ConsentType: z.enum(['openalex_email']),
  };
});

// Mock duck-type le contrat ApplicationError → flat shape utilisé par
// `withHandler`, sans réimporter le vrai module (sinon Vitest construit
// une 2e instance de la classe et `instanceof` casse côté handler).
vi.mock('$lib/server/http', () => ({
  mapErrorToResponse: vi.fn((error: Error) => new Response(error.message, { status: 500 })),
  flatErrorMapper: vi.fn(
    (error: unknown): { body: { code: string; message: string }; status: number } => {
      const e = error as { code?: unknown; message?: unknown; httpStatus?: unknown };
      if (typeof e.code === 'string' && typeof e.httpStatus === 'number') {
        return {
          body: { code: e.code, message: String(e.message ?? '') },
          status: e.httpStatus,
        };
      }
      return {
        body: { code: 'unexpected_error', message: 'Unknown error' },
        status: 500,
      };
    }
  ),
}));

describe('GET /api/v1/consents/[id]', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with consent status', async () => {
    const consent = await import('$lib/server/consent');
    (consent.getConsentStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      consentType: 'openalex_email',
      granted: true,
      updatedAt: '2026-05-30T00:00:00.000Z',
    });

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/consents/openalex_email',
        params: { id: 'openalex_email' },
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.consentType).toBe('openalex_email');
  });

  it('returns 401 when not authenticated', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/consents/openalex_email',
        params: { id: 'openalex_email' },
        locals: {},
      })
    );

    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown consent type (malformed param)', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/consents/not-a-real-consent',
        params: { id: 'not-a-real-consent' },
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('not_found');
  });
});

describe('PUT /api/v1/consents/[id]', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 when granting', async () => {
    const consent = await import('$lib/server/consent');
    (consent.grantConsent as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      consentType: 'openalex_email',
      granted: true,
      updatedAt: '2026-05-30T00:00:00.000Z',
    });

    const mod = await import('./+server');
    const res = await mod.PUT(
      createRouteEvent({
        method: 'PUT',
        url: 'https://example.com/api/v1/consents/openalex_email',
        body: { granted: true },
        params: { id: 'openalex_email' },
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(200);
  });

  it('returns 401 when not authenticated', async () => {
    const mod = await import('./+server');
    const res = await mod.PUT(
      createRouteEvent({
        method: 'PUT',
        url: 'https://example.com/api/v1/consents/openalex_email',
        body: { granted: true },
        params: { id: 'openalex_email' },
        locals: {},
      })
    );

    expect(res.status).toBe(401);
  });

  it('returns 400 when body.granted is not a boolean (malformed payload)', async () => {
    const mod = await import('./+server');
    const res = await mod.PUT(
      createRouteEvent({
        method: 'PUT',
        url: 'https://example.com/api/v1/consents/openalex_email',
        body: { granted: 'yes' },
        params: { id: 'openalex_email' },
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('invalid_parameter');
  });
});

describe('DELETE /api/v1/consents/[id]', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 when revoking', async () => {
    const consent = await import('$lib/server/consent');
    (consent.revokeConsent as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      consentType: 'openalex_email',
      granted: false,
      updatedAt: '2026-05-30T00:00:00.000Z',
    });

    const mod = await import('./+server');
    const res = await mod.DELETE(
      createRouteEvent({
        method: 'DELETE',
        url: 'https://example.com/api/v1/consents/openalex_email',
        params: { id: 'openalex_email' },
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(200);
  });

  it('returns 401 when not authenticated', async () => {
    const mod = await import('./+server');
    const res = await mod.DELETE(
      createRouteEvent({
        method: 'DELETE',
        url: 'https://example.com/api/v1/consents/openalex_email',
        params: { id: 'openalex_email' },
        locals: {},
      })
    );

    expect(res.status).toBe(401);
  });

  it('returns 404 for an unknown consent type (malformed param)', async () => {
    const mod = await import('./+server');
    const res = await mod.DELETE(
      createRouteEvent({
        method: 'DELETE',
        url: 'https://example.com/api/v1/consents/unknown',
        params: { id: 'unknown' },
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(404);
  });
});
