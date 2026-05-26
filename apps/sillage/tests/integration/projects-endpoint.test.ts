import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/server/services/projects', () => ({
  getCommunityProjects: vi.fn(async () => [
    {
      id: 'rec-mock',
      title: 'Mocked project',
      lead: 'MK',
      abstract: 'A mocked abstract.',
      tags: ['Mock'],
      date: '2025-01-01',
      href: '/coming-soon?project=rec-mock',
    },
  ]),
}));

import { GET } from '../../src/routes/api/v1/projects/community/+server';
import { getCommunityProjects } from '$lib/server/services/projects';

const makeEvent = (): RequestEvent =>
  ({ fetch: globalThis.fetch.bind(globalThis) }) as unknown as RequestEvent;

describe('GET /api/v1/projects/community', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the projects from the service', async () => {
    const res = await GET(
      // @ts-expect-error — partial event stub.
      makeEvent()
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ id: string; title: string }>;
      error: unknown;
    };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.id).toBe('rec-mock');
    expect(getCommunityProjects).toHaveBeenCalled();
  });

  it('is reachable without an authenticated session (community = public)', async () => {
    const res = await GET(
      // @ts-expect-error — partial event stub.
      makeEvent()
    );
    // No 401 — the endpoint does not gate on locals.userId.
    expect(res.status).toBe(200);
  });
});
