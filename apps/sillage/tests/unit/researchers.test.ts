import { describe, expect, it } from 'vitest';

import { mockResearcherPool } from '$lib/mocks/researchers';

describe('mockResearcherPool', () => {
  it('contains exactly 24 researchers (enough for the 8-tile grid + rotation)', () => {
    expect(mockResearcherPool).toHaveLength(24);
  });

  it('every entry has all four required fields', () => {
    for (const r of mockResearcherPool) {
      expect(r.id).toMatch(/^rsr-\d+$/);
      expect(r.fullName).toMatch(/^Personne Fictive/);
      expect(r.photoUrl).toMatch(/^https:\/\/i\.pravatar\.cc\/300\?u=sillage-rsr-/);
      expect(r.bio.length).toBeGreaterThan(10);
    }
  });

  it('every id is unique (so the rotation offPool filter is sound)', () => {
    const ids = new Set(mockResearcherPool.map((r) => r.id));
    expect(ids.size).toBe(mockResearcherPool.length);
  });

  it('every photo URL has a unique seed (no two researchers share a face)', () => {
    const seeds = new Set(mockResearcherPool.map((r) => new URL(r.photoUrl).searchParams.get('u')));
    expect(seeds.size).toBe(mockResearcherPool.length);
  });
});
