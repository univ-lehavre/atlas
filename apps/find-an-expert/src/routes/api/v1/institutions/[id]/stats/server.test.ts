import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Effect } from 'effect';
import {
  createRouteEvent,
  assertNoXss,
  xssPayloads,
} from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/citation', () => ({
  getInstitutionStats: vi.fn(),
}));

describe('GET /api/v1/institutions/[id]/stats', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with stats for an authenticated user', async () => {
    const citation = await import('$lib/server/citation');
    (citation.getInstitutionStats as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Effect.succeed({
        institutions: [{ id: 'I42', works: 200, articles: 150, authors: 60 }],
      })
    );

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/institutions/I42/stats',
        params: { id: 'I42' },
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.institutions[0].id).toBe('I42');
  });

  it('maps an upstream FetchError to 502 (ADR 0046, no opaque 500)', async () => {
    const citation = await import('$lib/server/citation');
    (citation.getInstitutionStats as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Effect.fail({ _tag: 'FetchError', message: 'OpenAlex unreachable' })
    );

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/institutions/I42/stats',
        params: { id: 'I42' },
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe('upstream_error');
  });

  it('returns 401 when not authenticated', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/institutions/I42/stats',
        params: { id: 'I42' },
        locals: {},
      })
    );

    expect(res.status).toBe(401);
  });

  it.each(xssPayloads())('does not reflect xss payload %s in body', async (payload) => {
    const citation = await import('$lib/server/citation');
    (citation.getInstitutionStats as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Effect.succeed({ institutions: [] })
    );

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: `https://example.com/api/v1/institutions/${encodeURIComponent(payload)}/stats`,
        params: { id: payload },
        locals: { userId: 'user-1' },
      })
    );

    await assertNoXss(res, payload);
    expect(res.status).toBeLessThan(600);
  });
});
