import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Effect } from 'effect';
import {
  createRouteEvent,
  assertNoXss,
  xssPayloads,
} from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/citation', () => ({
  getWorksCount: vi.fn(),
}));

describe('GET /api/v1/works/counts', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with counts for an authenticated user', async () => {
    const citation = await import('$lib/server/citation');
    (citation.getWorksCount as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Effect.succeed({ counts: { I1: 100 } })
    );

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/works/counts?institutions=I1',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.counts.I1).toBe(100);
  });

  it('maps an upstream FetchError to 502 (ADR 0046, no opaque 500)', async () => {
    const citation = await import('$lib/server/citation');
    (citation.getWorksCount as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Effect.fail({ _tag: 'FetchError', message: 'OpenAlex unreachable' })
    );

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/works/counts?institutions=I1',
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
        url: 'https://example.com/api/v1/works/counts?institutions=I1',
        locals: {},
      })
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('unauthenticated');
  });

  it('returns 400 when institutions parameter is missing', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/works/counts',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('missing_parameter');
  });

  it('returns 400 when institutions only contains empty values', async () => {
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/works/counts?institutions=,,',
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('invalid_parameter');
  });

  it('returns 400 when too many institutions are passed', async () => {
    const ids = Array.from({ length: 11 }, (_, i) => `I${i}`).join(',');
    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: `https://example.com/api/v1/works/counts?institutions=${ids}`,
        locals: { userId: 'user-1' },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('too_many_institutions');
  });

  it.each(xssPayloads())('does not reflect xss payload %s in body', async (payload) => {
    const citation = await import('$lib/server/citation');
    (citation.getWorksCount as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      Effect.succeed({ counts: {} })
    );

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: `https://example.com/api/v1/works/counts?institutions=${encodeURIComponent(payload)}`,
        locals: { userId: 'user-1' },
      })
    );

    await assertNoXss(res, payload);
    expect(res.status).toBeLessThan(600);
  });
});
