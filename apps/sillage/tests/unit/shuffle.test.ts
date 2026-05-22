import { describe, expect, it } from 'vitest';

import { shuffle } from '$lib/utils/shuffle';

describe('shuffle', () => {
  it('preserves array length', () => {
    const out = shuffle([1, 2, 3, 4, 5]);
    expect(out).toHaveLength(5);
  });

  it('keeps the same elements (sorted equality)', () => {
    const input = ['a', 'b', 'c', 'd', 'e', 'f'];
    const out = shuffle(input);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3];
    shuffle(input);
    expect(input).toEqual([1, 2, 3]);
  });

  it('with a deterministic rng, returns a deterministic permutation', () => {
    // Fisher–Yates with rng→0.999... at every call : the swap target
    // is always the current last index → array stays untouched. With
    // rng→0 at every call : swap target is always 0 → reverse-ish but
    // deterministic per length. The exact sequence depends on the
    // Math.floor(rng * (i+1)) bookkeeping ; just assert that two runs
    // with the same rng produce the same output.
    const rng = (): number => 0.42;
    const a = shuffle([1, 2, 3, 4, 5], rng);
    const b = shuffle([1, 2, 3, 4, 5], rng);
    expect(a).toEqual(b);
  });

  it('handles empty arrays', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('handles single-element arrays', () => {
    expect(shuffle([42])).toEqual([42]);
  });
});
