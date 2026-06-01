import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/github', () => ({
  getGitHubRepoFromPath: vi.fn(),
  buildGitHubUrl: vi.fn(() => 'https://github.com/owner/repo'),
  buildIssuesUrl: vi.fn(() => 'https://github.com/owner/repo/issues'),
  buildNewIssueUrl: vi.fn(() => 'https://github.com/owner/repo/issues/new'),
  buildPullRequestsUrl: vi.fn(() => 'https://github.com/owner/repo/pulls'),
  buildDiscussionsUrl: vi.fn(() => 'https://github.com/owner/repo/discussions'),
}));

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

describe('GET /api/v1/repositories/[id] (rate-limited public endpoint)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with repo details when authorised', async () => {
    const github = await import('$lib/server/github');
    (github.getGitHubRepoFromPath as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      owner: 'univ-lehavre',
      repo: 'atlas',
    });

    const mod = await import('./+server');
    const res = await mod.GET({
      params: { id: 'atlas' },
      getClientAddress: () => '203.0.113.30',
    } as never);

    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('60');
    const body = await res.json();
    expect(body.id).toBe('atlas');
    expect(body.urls.repository).toBe('https://github.com/owner/repo');
  });

  it('returns 429 after the 60 req/min window is saturated', async () => {
    const github = await import('$lib/server/github');
    (github.getGitHubRepoFromPath as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const mod = await import('./+server');
    const ip = '203.0.113.40';

    for (let i = 0; i < 60; i++) {
      const res = await mod.GET({
        params: { id: 'atlas' },
        getClientAddress: () => ip,
      } as never);
      expect(res.status).toBe(200);
    }

    const denied = await mod.GET({
      params: { id: 'atlas' },
      getClientAddress: () => ip,
    } as never);

    expect(denied.status).toBe(429);
    const body = await denied.json();
    expect(body.code).toBe('rate_limited');
  });
});
