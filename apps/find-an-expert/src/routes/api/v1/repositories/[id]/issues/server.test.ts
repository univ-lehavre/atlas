import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createRouteEvent,
  assertNoXss,
  xssPayloads,
} from '@univ-lehavre/atlas-test-utils-sveltekit';

vi.mock('$lib/server/github', () => ({
  getGitHubStats: vi.fn(),
}));

vi.mock('$lib/server/http', () => ({
  mapErrorToResponse: vi.fn((error: Error) => new Response(error.message, { status: 500 })),
}));

describe('GET /api/v1/repositories/[id]/issues', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns 200 with issue counts', async () => {
    const github = await import('$lib/server/github');
    (github.getGitHubStats as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      pullRequests: { open: 0, closed: 0 },
      issues: { open: 7, closed: 12 },
    });

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/repositories/atlas/issues',
        params: { id: 'atlas' },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.open).toBe(7);
    expect(body.closed).toBe(12);
  });

  it('returns 200 even without auth (public endpoint)', async () => {
    const github = await import('$lib/server/github');
    (github.getGitHubStats as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      pullRequests: { open: 0, closed: 0 },
      issues: { open: 0, closed: 0 },
    });

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/repositories/atlas/issues',
        params: { id: 'atlas' },
        locals: {},
      })
    );

    expect(res.status).toBe(200);
  });

  it('returns 500 via mapErrorToResponse when github stats fail', async () => {
    const github = await import('$lib/server/github');
    (github.getGitHubStats as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('github down')
    );

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: 'https://example.com/api/v1/repositories/atlas/issues',
        params: { id: 'atlas' },
      })
    );

    expect(res.status).toBe(500);
  });

  it.each(xssPayloads())('does not reflect xss payload %s in body', async (payload) => {
    const github = await import('$lib/server/github');
    (github.getGitHubStats as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      pullRequests: { open: 0, closed: 0 },
      issues: { open: 0, closed: 0 },
    });

    const mod = await import('./+server');
    const res = await mod.GET(
      createRouteEvent({
        url: `https://example.com/api/v1/repositories/${encodeURIComponent(payload)}/issues`,
        params: { id: payload },
      })
    );

    await assertNoXss(res, payload);
    expect(res.status).toBeLessThan(600);
  });
});
