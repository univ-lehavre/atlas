import { describe, it, expect } from 'vitest';
import { coverageConfig } from './index.js';

describe('coverageConfig', () => {
  it('returns v8 provider', () => {
    expect(coverageConfig().provider).toBe('v8');
  });

  it('uses custom include when provided', () => {
    const cfg = coverageConfig({ include: ['lib/**/*.ts'] });
    expect(cfg.include).toEqual(['lib/**/*.ts']);
  });

  it('appends custom excludes to the defaults', () => {
    const cfg = coverageConfig({ exclude: ['src/generated/**'] });
    expect(cfg.exclude).toContain('src/generated/**');
    expect(cfg.exclude.some((e) => e.includes('*.test.'))).toBe(true);
  });

  it('passes through threshold overrides', () => {
    const thresholds = { statements: 80, branches: 70, functions: 80, lines: 80 };
    const cfg = coverageConfig({ thresholds });
    expect(cfg.thresholds).toEqual(thresholds);
  });
});
