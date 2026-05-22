import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCommunityProjects,
  mapRedcapToProjectSnapshot,
} from '../../src/lib/server/services/projects';

const okFetch = (rows: unknown): typeof globalThis.fetch =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(rows), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  ) as unknown as typeof globalThis.fetch;

describe('mapRedcapToProjectSnapshot', () => {
  it('maps a typical row to a CommunityProject', () => {
    const out = mapRedcapToProjectSnapshot({
      userid: 'rec-42',
      acronym: 'SEAVAR',
      title: 'Sea variability long-term',
      abstract: 'A multi-decade study of variability indicators in the Channel.',
      keyword1: 'Climate',
      keyword2: 'Oceanography',
      keyword3: '',
      project_proposal_complete: '2',
    });
    expect(out).not.toBeNull();
    expect(out?.id).toBe('rec-42');
    expect(out?.title).toBe('Sea variability long-term');
    expect(out?.lead).toBe('SEAVAR');
    expect(out?.tags).toEqual(['Climate', 'Oceanography']);
    expect(out?.href).toBe('/coming-soon?project=rec-42');
  });

  it('returns null when userid is missing', () => {
    expect(
      mapRedcapToProjectSnapshot({
        title: 'No id',
      })
    ).toBeNull();
  });

  it('returns null when title is missing', () => {
    expect(
      mapRedcapToProjectSnapshot({
        userid: 'rec-1',
      })
    ).toBeNull();
  });

  it('falls back to title when acronym is empty', () => {
    const out = mapRedcapToProjectSnapshot({
      userid: 'rec-2',
      title: 'Only a title',
    });
    expect(out?.lead).toBe('Only a title');
  });

  it('strips html tags from rich-text fields', () => {
    const out = mapRedcapToProjectSnapshot({
      userid: 'rec-3',
      title: '<p>Wrapped title</p>',
      abstract: '<div class="rt"><span>Wrapped abstract</span></div>',
    });
    expect(out?.title).toBe('Wrapped title');
    expect(out?.abstract).toBe('Wrapped abstract');
  });

  it('keeps tag order and drops empty keywords', () => {
    const out = mapRedcapToProjectSnapshot({
      userid: 'rec-4',
      title: 'Title',
      keyword1: '',
      keyword2: 'Geography',
      keyword3: 'Heritage',
    });
    expect(out?.tags).toEqual(['Geography', 'Heritage']);
  });
});

describe('getCommunityProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped projects when REDCap responds with rows', async () => {
    const fetch = okFetch([
      {
        userid: 'p-1',
        title: 'Project one',
        acronym: 'P1',
        project_proposal_complete: '2',
      },
      {
        userid: 'p-2',
        title: 'Project two',
        acronym: 'P2',
        project_proposal_complete: '2',
      },
    ]);
    const out = await getCommunityProjects({ fetch });
    expect(out).toHaveLength(2);
    expect(out[0]?.id).toBe('p-1');
    expect(out[1]?.id).toBe('p-2');
  });

  it('drops rows that map to null (missing userid or title)', async () => {
    const fetch = okFetch([
      { userid: 'p-1', title: 'Project one' },
      { userid: 'p-2' /* no title */ },
      { title: 'Orphan project' /* no userid */ },
    ]);
    const out = await getCommunityProjects({ fetch });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe('p-1');
  });

  it('returns [] when REDCap throws', async () => {
    const failingFetch = vi.fn(async () => {
      throw new Error('redcap down');
    }) as unknown as typeof globalThis.fetch;
    // Silence the console.error emitted by the catch branch.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const out = await getCommunityProjects({ fetch: failingFetch });
    expect(out).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('sends a filterLogic scoped to validated projects', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
    );
    await getCommunityProjects({
      fetch: fetch as unknown as typeof globalThis.fetch,
    });
    const call = fetch.mock.calls[0] as [RequestInfo, RequestInit | undefined] | undefined;
    expect(call).toBeDefined();
    const body = call?.[1]?.body as string | undefined;
    expect(body).toContain('filterLogic=');
    expect(body).toContain('project_proposal_complete');
    expect(body).toContain('forms=project_proposal');
  });
});
