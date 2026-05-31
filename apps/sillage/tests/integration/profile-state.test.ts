import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

vi.mock('$lib/server/services/profile', () => ({
  getProfileState: vi.fn(async (_userId: string) => ({
    researcher_profile_complete: '2',
    research_questions_complete: '0',
    publications_complete: null,
    project_proposal_complete: null,
  })),
}));

import { GET } from '../../src/routes/api/v1/profile/state/+server';
import { getProfileState } from '$lib/server/services/profile';

const makeEvent = (userId: string | undefined): RequestEvent =>
  ({
    locals: { userId },
    fetch: globalThis.fetch.bind(globalThis),
  }) as unknown as RequestEvent;

describe('GET /api/v1/profile/state', () => {
  it('returns 401 unauthenticated when locals.userId is absent', async () => {
    const res = await GET(
      // @ts-expect-error — partial event stub.
      makeEvent()
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as {
      data: unknown;
      error: { code: string } | null;
    };
    expect(body.error?.code).toBe('unauthenticated');
    expect(getProfileState).not.toHaveBeenCalled();
  });

  it('returns the profile state from the service when authenticated', async () => {
    const res = await GET(
      // @ts-expect-error — partial event stub.
      makeEvent('user-abc')
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Record<string, string | null> | null;
      error: unknown;
    };
    expect(body.data?.researcher_profile_complete).toBe('2');
    expect(body.data?.research_questions_complete).toBe('0');
    expect(body.data?.publications_complete).toBeNull();
    expect(getProfileState).toHaveBeenCalledWith('user-abc', expect.anything());
  });
});
