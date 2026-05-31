import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

// Phase 3 — couverture handler `GET /api/v1/surveys/url`. L'endpoint
// renvoie 422 si REDCap répond une chaîne contenant `"error":` ;
// on couvre cette branche en plus du 200/401/500.

vi.mock('$lib/server/services/surveysService', () => ({
  getSurveyUrl: vi.fn(),
}));

describe('GET /api/v1/surveys/url', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with { url } when authenticated and service returns a valid URL', async () => {
    const services = await import('$lib/server/services/surveysService');
    (services.getSurveyUrl as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      'https://redcap.example.com/surveys/abc'
    );

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: { userId: 'rec-1' } }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.url).toBe('https://redcap.example.com/surveys/abc');
  });

  it('returns 401 with code "unauthenticated" when no userId in locals', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: {} }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('unauthenticated');
  });

  it('returns 422 when REDCap responds a string containing `"error":` (malformed upstream payload)', async () => {
    const services = await import('$lib/server/services/surveysService');
    (services.getSurveyUrl as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      '{"error":"record not found"}'
    );

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: { userId: 'rec-2' } }) as never);

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_url');
  });

  it('returns 500 when the service throws', async () => {
    const services = await import('$lib/server/services/surveysService');
    (services.getSurveyUrl as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
    // L'endpoint logge l'erreur via console.error ; on le neutralise
    // pour garder une sortie de test propre.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: { userId: 'rec-3' } }) as never);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
    errorSpy.mockRestore();
  });
});
