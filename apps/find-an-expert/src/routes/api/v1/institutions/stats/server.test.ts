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

describe('GET /api/v1/institutions/stats', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with stats when authorised', async () => {
    const citation = await import('$lib/server/citation');
    (citation.getInstitutionStats as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Effect.succeed({
        institutions: [{ id: 'I1', works: 100, articles: 80, authors: 50 }],
      })
    );

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/institutions/stats?ids=I1',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.institutions).toHaveLength(1);
  });

  it('maps an upstream ResponseParseError to 502 (ADR 0046, no opaque 500)', async () => {
    const citation = await import('$lib/server/citation');
    (citation.getInstitutionStats as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Effect.fail({ _tag: 'ResponseParseError', message: 'malformed OpenAlex payload' })
    );

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/institutions/stats?ids=I1',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe('upstream_parse_error');
  });

  it('returns 401 when not authenticated', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/institutions/stats?ids=I1',
        locals: {},
      })
    );

    expect(res.status).toBe(401);
  });

  it('returns 400 when ids parameter is missing', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/institutions/stats',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('missing_parameter');
  });

  it('returns 400 when ids parameter contains only empty entries', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/institutions/stats?ids=,,,',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('invalid_parameter');
  });

  it('returns 400 when too many ids are passed', async () => {
    const ids = Array.from({ length: 11 }, (_, i) => `I${i}`).join(',');
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: `https://example.com/api/v1/institutions/stats?ids=${ids}`,
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('too_many_institutions');
  });

  it.each(xssPayloads())('does not reflect xss payload %s in body', async (payload) => {
    const citation = await import('$lib/server/citation');
    (citation.getInstitutionStats as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Effect.succeed({
        institutions: [],
      })
    );

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: `https://example.com/api/v1/institutions/stats?ids=${encodeURIComponent(payload)}`,
        locals: { userId: 'user-1' },
      })
    );

    await assertNoXss(res, payload);
    expect(res.status).toBeLessThan(600);
  });
});
