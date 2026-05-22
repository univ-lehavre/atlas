import { describe, expect, it } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

import { load } from '../../src/routes/+page.server';
import { mockResearcherPool } from '$lib/mocks/researchers';
import { mockProjectPool, priorityQuestionnaires } from '$lib/mocks/projects';

const makeEvent = (userId?: string): RequestEvent =>
  ({
    locals: userId ? { userId } : {},
  }) as unknown as RequestEvent;

describe('+page.server load', () => {
  it('returns null userId when locals.userId is absent', async () => {
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent()
    )) as {
      userId: string | null;
      researchers: ReadonlyArray<{ id: string }>;
      projects: ReadonlyArray<{ id: string }>;
      questionnaires: ReadonlyArray<{ id: string }>;
    };
    expect(data.userId).toBeNull();
  });

  it('returns the userId from locals when set', async () => {
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent('abc123')
    )) as {
      userId: string | null;
      researchers: ReadonlyArray<{ id: string }>;
      projects: ReadonlyArray<{ id: string }>;
      questionnaires: ReadonlyArray<{ id: string }>;
    };
    expect(data.userId).toBe('abc123');
  });

  it('returns the full researcher pool shuffled (same length, same elements)', async () => {
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent()
    )) as {
      userId: string | null;
      researchers: ReadonlyArray<{ id: string }>;
      projects: ReadonlyArray<{ id: string }>;
      questionnaires: ReadonlyArray<{ id: string }>;
    };
    expect(data.researchers).toHaveLength(mockResearcherPool.length);
    expect([...data.researchers].map((r) => r.id).sort()).toEqual(
      [...mockResearcherPool].map((r) => r.id).sort()
    );
  });

  it('returns the full project pool shuffled', async () => {
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent('abc123')
    )) as {
      userId: string | null;
      researchers: ReadonlyArray<{ id: string }>;
      projects: ReadonlyArray<{ id: string }>;
      questionnaires: ReadonlyArray<{ id: string }>;
    };
    expect(data.projects).toHaveLength(mockProjectPool.length);
    expect([...data.projects].map((p) => p.id).sort()).toEqual(
      [...mockProjectPool].map((p) => p.id).sort()
    );
  });

  it('returns the four priority questionnaires in declaration order', async () => {
    const data = (await load(
      // @ts-expect-error — partial event stub.
      makeEvent('abc123')
    )) as {
      userId: string | null;
      researchers: ReadonlyArray<{ id: string }>;
      projects: ReadonlyArray<{ id: string }>;
      questionnaires: ReadonlyArray<{ id: string }>;
    };
    expect(data.questionnaires.map((q) => q.id)).toEqual(priorityQuestionnaires.map((q) => q.id));
  });
});
