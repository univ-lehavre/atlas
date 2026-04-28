import { describe, it, expect } from 'vitest';
import { buildName, transformToName } from './build-name.js';
import type { EAV } from '../types/index.js';

const eav = (field_name: string, value: string): EAV => ({
  record: '1',
  redcap_repeat_instrument: '',
  redcap_repeat_instance: '',
  field_name,
  value,
});

describe('transformToName', () => {
  it('joins first, middle, last', () => {
    expect(transformToName('jean', '', 'dupont')).toBe('Jean Dupont');
  });

  it('skips empty parts', () => {
    expect(transformToName('jean', '', 'dupont')).toBe('Jean Dupont');
  });

  it('keeps "de" lowercase', () => {
    expect(transformToName('jean', 'de', 'la tour')).toBe('Jean de La Tour');
  });

  it('capitalizes hyphenated names', () => {
    expect(transformToName('jean-luc', '', 'picard')).toBe('Jean-Luc Picard');
  });

  it('returns empty string for all empty', () => {
    expect(transformToName('', '', '')).toBe('');
  });
});

describe('buildName', () => {
  it('builds name from EAV records', () => {
    const data = [eav('first_name', 'alice'), eav('last_name', 'martin')];
    expect(buildName(data)).toBe('Alice Martin');
  });

  it('uses first matching value for each field', () => {
    const data = [eav('first_name', 'alice'), eav('first_name', 'bob'), eav('last_name', 'martin')];
    expect(buildName(data)).toBe('Alice Martin');
  });
});
