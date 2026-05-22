import { describe, expect, it } from 'vitest';

import { applyGating } from '../../src/lib/server/gating';
import { EMPTY_PROFILE_STATE, type ProfileState } from '$lib/types/api/profile';

const entries = [
  { id: 'researcher_profile', label: 'P', description: '', href: '/p' },
  { id: 'research_questions', label: 'Q', description: '', href: '/q' },
  { id: 'publications', label: 'R', description: '', href: '/r' },
  { id: 'project_proposal', label: 'J', description: '', href: '/j' },
] as const;

const stateWith = (overrides: Partial<ProfileState>): ProfileState => ({
  ...EMPTY_PROFILE_STATE,
  ...overrides,
});

describe('applyGating', () => {
  it('keeps researcher_profile always active', () => {
    const out = applyGating(entries, EMPTY_PROFILE_STATE);
    expect(out.find((e) => e.id === 'researcher_profile')?.disabled).toBe(false);
  });

  it('locks research_questions + publications when researcher_profile is incomplete', () => {
    const out = applyGating(entries, EMPTY_PROFILE_STATE);
    expect(out.find((e) => e.id === 'research_questions')?.disabled).toBe(true);
    expect(out.find((e) => e.id === 'publications')?.disabled).toBe(true);
  });

  it('unlocks research_questions + publications when researcher_profile_complete == 2', () => {
    const out = applyGating(entries, stateWith({ researcher_profile_complete: '2' }));
    expect(out.find((e) => e.id === 'research_questions')?.disabled).toBe(false);
    expect(out.find((e) => e.id === 'publications')?.disabled).toBe(false);
  });

  it('keeps research_questions locked when researcher_profile_complete is "0" or "1"', () => {
    for (const status of ['0', '1'] as const) {
      const out = applyGating(entries, stateWith({ researcher_profile_complete: status }));
      expect(out.find((e) => e.id === 'research_questions')?.disabled).toBe(true);
    }
  });

  it('locks project_proposal until publications_complete == 2', () => {
    const out1 = applyGating(entries, stateWith({ researcher_profile_complete: '2' }));
    expect(out1.find((e) => e.id === 'project_proposal')?.disabled).toBe(true);

    const out2 = applyGating(
      entries,
      stateWith({
        researcher_profile_complete: '2',
        publications_complete: '2',
      })
    );
    expect(out2.find((e) => e.id === 'project_proposal')?.disabled).toBe(false);
  });

  it('preserves entry order and shape (only disabled is recomputed)', () => {
    const out = applyGating(entries, stateWith({ researcher_profile_complete: '2' }));
    expect(out.map((e) => e.id)).toEqual(entries.map((e) => e.id));
    expect(out[0]?.label).toBe(entries[0]?.label);
    expect(out[0]?.href).toBe(entries[0]?.href);
  });
});
