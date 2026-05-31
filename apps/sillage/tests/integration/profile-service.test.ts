import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProfileState } from '../../src/lib/server/services/profile';
import { EMPTY_PROFILE_STATE } from '$lib/types/api/profile';

const mockFetch = (rows: unknown): typeof globalThis.fetch =>
  vi.fn(async () =>
    Response.json(rows, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  ) as unknown as typeof globalThis.fetch;

describe('getProfileState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps REDCap "2" / "0" / "1" status values onto CompleteStatus', async () => {
    const fetch = mockFetch([
      {
        researcher_profile_complete: '2',
        research_questions_complete: '1',
        publications_complete: '0',
        project_proposal_complete: '2',
      },
    ]);
    const out = await getProfileState('user-1', { fetch });
    expect(out.researcher_profile_complete).toBe('2');
    expect(out.research_questions_complete).toBe('1');
    expect(out.publications_complete).toBe('0');
    expect(out.project_proposal_complete).toBe('2');
  });

  it('coerces missing / unknown status values to null', async () => {
    const fetch = mockFetch([
      {
        researcher_profile_complete: '2',
        // research_questions_complete missing
        publications_complete: 'garbage',
        project_proposal_complete: '',
      },
    ]);
    const out = await getProfileState('user-1', { fetch });
    expect(out.researcher_profile_complete).toBe('2');
    expect(out.research_questions_complete).toBeNull();
    expect(out.publications_complete).toBeNull();
    expect(out.project_proposal_complete).toBeNull();
  });

  it('returns EMPTY_PROFILE_STATE when REDCap responds with an empty array', async () => {
    const fetch = mockFetch([]);
    const out = await getProfileState('user-1', { fetch });
    expect(out).toEqual(EMPTY_PROFILE_STATE);
  });

  it('takes the first row when multiple records match the userid', async () => {
    const fetch = mockFetch([
      { researcher_profile_complete: '2' },
      { researcher_profile_complete: '0' },
    ]);
    const out = await getProfileState('user-1', { fetch });
    expect(out.researcher_profile_complete).toBe('2');
  });

  it('passes a filterLogic that scopes to the userid', async () => {
    const fetch = vi.fn(async () =>
      Response.json([], {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    await getProfileState('user-quoted', {
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
    // The first arg is the URL ; the second the RequestInit with the
    // urlencoded body containing filterLogic.
    const call = fetch.mock.calls[0] as [RequestInfo, RequestInit | undefined] | undefined;
    expect(call).toBeDefined();
    const init = call?.[1];
    const body = init?.body as string | undefined;
    expect(body).toContain('filterLogic=');
    expect(body).toContain('user-quoted');
  });
});
