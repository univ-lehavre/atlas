import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

// Phase 3 — couverture handler `GET /api/v1/surveys/delete`.
// Endpoint AUTH-gated qui supprime l'enregistrement REDCap de
// l'utilisateur connecté.

vi.mock('$lib/server/services/surveysService', () => ({
  deleteSurveyRecord: vi.fn(),
}));

describe('GET /api/v1/surveys/delete', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with { result } when authenticated', async () => {
    const services = await import('$lib/server/services/surveysService');
    (services.deleteSurveyRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      records: 1,
    });

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: { userId: 'rec-42' } }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(body.data.result).toEqual({ records: 1 });
  });

  it('returns 401 with code "unauthenticated" when no userId in locals', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: {} }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({
      data: null,
      error: { code: 'unauthenticated', message: 'No authenticated user' },
    });
  });

  it('returns 500 with code "internal_error" when the service throws (malformed/unexpected)', async () => {
    const services = await import('$lib/server/services/surveysService');
    (services.deleteSurveyRecord as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('REDCap returned a malformed payload')
    );

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: { userId: 'rec-42' } }) as never);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
  });
});
