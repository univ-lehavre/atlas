import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRouteEvent } from '@univ-lehavre/atlas-test-utils-sveltekit';

// Phase 3 — couverture handler `GET /api/v1/surveys/download`.
// AUTH-gated, délègue à `downloadSurvey` (REDCap).

vi.mock('$lib/server/services/surveysService', () => ({
  downloadSurvey: vi.fn(),
}));

describe('GET /api/v1/surveys/download', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with the survey payload when authenticated', async () => {
    const services = await import('$lib/server/services/surveysService');
    (services.downloadSurvey as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { record_id: 'rec-1', q1: 'a' },
    ]);

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: { userId: 'rec-1' } }) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error).toBeNull();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0]).toMatchObject({ record_id: 'rec-1' });
  });

  it('returns 401 with code "unauthenticated" when no userId in locals', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: {} }) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('unauthenticated');
  });

  it('returns 500 with code "internal_error" when REDCap returns a malformed response (service throws)', async () => {
    const services = await import('$lib/server/services/surveysService');
    (services.downloadSurvey as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('parse error')
    );

    const mod = await import('./+server');
    const res = await mod.GET(createRouteEvent({ locals: { userId: 'rec-1' } }) as never);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('internal_error');
  });
});
