import { describe, it, expect } from 'vitest';
import { applyPatches } from './patches.js';
import type { RedcapLogEntry } from '@univ-lehavre/atlas-redcap-logs';

const makeEntry = (date: Date): RedcapLogEntry =>
  ({ timestamp: date }) as unknown as RedcapLogEntry;

describe('applyPatches', () => {
  it('keeps entries not in excluded dates', () => {
    const entries = [makeEntry(new Date('2026-04-06')), makeEntry(new Date('2026-04-09'))];
    expect(applyPatches(entries)).toHaveLength(2);
  });

  it('excludes April 7 2026', () => {
    const entries = [makeEntry(new Date(2026, 3, 7))];
    expect(applyPatches(entries)).toHaveLength(0);
  });

  it('excludes April 8 2026', () => {
    const entries = [makeEntry(new Date(2026, 3, 8))];
    expect(applyPatches(entries)).toHaveLength(0);
  });

  it('does not exclude same day in different year', () => {
    const entries = [makeEntry(new Date(2025, 3, 7))];
    expect(applyPatches(entries)).toHaveLength(1);
  });

  it('handles empty array', () => {
    expect(applyPatches([])).toHaveLength(0);
  });
});
