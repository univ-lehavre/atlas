import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/citation', () => ({
  searchInstitutions: vi.fn(),
}));

vi.mock('$lib/server/http', () => ({
  mapErrorToResponse: vi.fn((error: Error) => new Response(error.message, { status: 500 })),
}));

describe('GET /api/v1/institutions/search (rate-limited public endpoint)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with results and exposes rate-limit headers', async () => {
    const citation = await import('$lib/server/citation');
    (citation.searchInstitutions as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 'I1', name: 'University A' },
    ]);

    const mod = await import('./+server');
    const res = await mod.GET({
      url: new URL('https://example.com/api/v1/institutions/search?q=test'),
      getClientAddress: () => '203.0.113.10',
    } as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('30');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('29');
  });

  it('returns 429 after the 30 req/min window is saturated', async () => {
    const citation = await import('$lib/server/citation');
    (citation.searchInstitutions as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const mod = await import('./+server');
    const ip = '203.0.113.20';

    for (let i = 0; i < 30; i++) {
      const res = await mod.GET({
        url: new URL('https://example.com/api/v1/institutions/search?q=x'),
        getClientAddress: () => ip,
      } as never);
      expect(res.status).toBe(200);
    }

    const denied = await mod.GET({
      url: new URL('https://example.com/api/v1/institutions/search?q=x'),
      getClientAddress: () => ip,
    } as never);

    expect(denied.status).toBe(429);
    const body = await denied.json();
    expect(body.code).toBe('rate_limited');
    expect(denied.headers.get('Retry-After')).toMatch(/^\d+$/);
  });
});
