import { describe, it, expect } from 'vitest';
import { formatJson } from './terminal.js';

describe('formatJson', () => {
  it('formats primitives', () => expect(formatJson(42)).toBe('42'));
  it('formats objects with 2-space indent', () => {
    expect(formatJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
  it('formats arrays', () => {
    expect(formatJson([1, 2])).toBe('[\n  1,\n  2\n]');
  });
  it('handles null', () => expect(formatJson(null)).toBe('null'));
});
