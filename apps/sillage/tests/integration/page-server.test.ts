import { describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

import { load } from '../../src/routes/+page.server';
import { mockResearcherPool } from '$lib/mocks/researchers';
import { mockProjectPool, priorityQuestionnaires } from '$lib/mocks/projects';
import type { ProfileState } from '$lib/types/api/profile';

/**
 * Multi-endpoint fetch mock : `+page.server.ts` issues sub-requests
 * to both `/api/v1/profile/state` and `/api/v1/projects/community`.
 * The first arg of `fetch(input, init)` is a string here ; we route
 * by substring so each endpoint gets its own canned reply.
 */
const profileStateFetch = (
  state: ProfileState,
  projects: readonly unknown[] = []
): typeof globalThis.fetch =>
  vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/v1/projects/community')) {
      return Response.json(
        { data: projects, error: null },
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      );
    }
    return Response.json(
      { data: state, error: null },
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }
    );
  }) as unknown as typeof globalThis.fetch;

const makeEvent = (
  userId?: string,
  fetchImpl: typeof globalThis.fetch = profileStateFetch({
    researcher_profile_complete: null,
    research_questions_complete: null,
    publications_complete: null,
    project_proposal_complete: null,
  })
): RequestEvent =>
  ({
    locals: userId ? { userId } : {},
    fetch: fetchImpl,
  }) as unknown as RequestEvent;

interface LoadOutput {
  userId: string | null;
  researchers: readonly { id: string }[];
  projects: readonly { id: string }[];
  questionnaires: readonly { id: string; disabled?: boolean }[];
  profileState: ProfileState;
}

describe('+page.server load', () => {
  it('returns null userId when locals.userId is absent', async () => {
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent()
    )) as LoadOutput;
    expect(data.userId).toBeNull();
  });

  it('returns the userId from locals when set', async () => {
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent('abc123')
    )) as LoadOutput;
    expect(data.userId).toBe('abc123');
  });

  it('returns the full researcher pool shuffled', async () => {
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent()
    )) as LoadOutput;
    expect(data.researchers).toHaveLength(mockResearcherPool.length);
    expect([...data.researchers].map((r) => r.id).sort()).toEqual(
      [...mockResearcherPool].map((r) => r.id).sort()
    );
  });

  it('returns the full project pool shuffled', async () => {
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent('abc123')
    )) as LoadOutput;
    expect(data.projects).toHaveLength(mockProjectPool.length);
    expect([...data.projects].map((p) => p.id).sort()).toEqual(
      [...mockProjectPool].map((p) => p.id).sort()
    );
  });

  it('returns the four priority questionnaires in declaration order', async () => {
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent('abc123')
    )) as LoadOutput;
    expect(data.questionnaires.map((q) => q.id)).toEqual(priorityQuestionnaires.map((q) => q.id));
  });

  it('keeps the 3 non-profile questionnaires locked for a fresh user', async () => {
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent('abc123')
    )) as LoadOutput;
    expect(data.questionnaires.find((q) => q.id === 'researcher_profile')?.disabled).toBe(false);
    expect(data.questionnaires.find((q) => q.id === 'research_questions')?.disabled).toBe(true);
    expect(data.questionnaires.find((q) => q.id === 'publications')?.disabled).toBe(true);
    expect(data.questionnaires.find((q) => q.id === 'project_proposal')?.disabled).toBe(true);
  });

  it('unlocks research_questions + publications once researcher_profile_complete = "2"', async () => {
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent(
        'abc123',
        profileStateFetch({
          researcher_profile_complete: '2',
          research_questions_complete: null,
          publications_complete: null,
          project_proposal_complete: null,
        })
      )
    )) as LoadOutput;
    expect(data.questionnaires.find((q) => q.id === 'research_questions')?.disabled).toBe(false);
    expect(data.questionnaires.find((q) => q.id === 'publications')?.disabled).toBe(false);
    // project_proposal still gated on publications_complete = "2".
    expect(data.questionnaires.find((q) => q.id === 'project_proposal')?.disabled).toBe(true);
  });

  it('falls back to EMPTY_PROFILE_STATE when the profile fetch throws', async () => {
    const failingFetch = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof globalThis.fetch;
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent('abc123', failingFetch)
    )) as LoadOutput;
    expect(data.profileState).toEqual({
      researcher_profile_complete: null,
      research_questions_complete: null,
      publications_complete: null,
      project_proposal_complete: null,
    });
    // Default gating applies (only researcher_profile active).
    expect(data.questionnaires.filter((q) => !q.disabled)).toHaveLength(1);
  });
});
