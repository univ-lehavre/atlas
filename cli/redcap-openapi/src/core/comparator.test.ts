import { describe, it, expect } from 'vitest';
import { compareSchemas, comparePaths, comparePatterns, compareSpecs } from './comparator.js';
import type { OpenApiSpec } from './types.js';

const emptySpec = (): OpenApiSpec => ({
  openapi: '3.0.0',
  info: { title: 'T', version: '1' },
  paths: {},
  components: {},
});

const withSchemas = (names: string[]): OpenApiSpec => ({
  ...emptySpec(),
  components: {
    schemas: Object.fromEntries(names.map((n) => [n, { type: 'object', properties: {} }])),
  },
});

const withPaths = (paths: string[]): OpenApiSpec => ({
  ...emptySpec(),
  paths: Object.fromEntries(paths.map((p) => [p, {}])),
});

describe('compareSchemas', () => {
  it('returns empty array when specs are identical', () => {
    const spec = withSchemas(['RecordRequest']);
    expect(compareSchemas(spec, spec)).toHaveLength(0);
  });

  it('detects added schema', () => {
    const old = withSchemas([]);
    const next = withSchemas(['NewSchema']);
    const results = compareSchemas(old, next);
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe('added');
    expect(results[0]?.field).toContain('NewSchema');
  });

  it('detects removed schema', () => {
    const old = withSchemas(['OldSchema']);
    const next = withSchemas([]);
    const results = compareSchemas(old, next);
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe('removed');
  });

  it('mentions similar schema in message', () => {
    const old = withSchemas(['RecordRequest']);
    const next = withSchemas(['RecordImport']);
    const removed = compareSchemas(old, next).filter((r) => r.status === 'removed');
    expect(removed[0]?.message).toContain('similar');
  });

  it('handles specs with no components', () => {
    expect(compareSchemas(emptySpec(), emptySpec())).toHaveLength(0);
  });
});

describe('comparePaths', () => {
  it('returns empty for identical paths', () => {
    const spec = withPaths(['/records']);
    expect(comparePaths(spec, spec)).toHaveLength(0);
  });

  it('detects added path', () => {
    const results = comparePaths(withPaths([]), withPaths(['/new']));
    expect(results[0]?.status).toBe('added');
    expect(results[0]?.message).toContain('/new');
  });

  it('detects removed path', () => {
    const results = comparePaths(withPaths(['/old']), withPaths([]));
    expect(results[0]?.status).toBe('removed');
  });

  it('handles specs with no paths', () => {
    expect(comparePaths(emptySpec(), emptySpec())).toHaveLength(0);
  });
});

describe('comparePatterns', () => {
  const specWithProp = (pattern: string | undefined, enumVals?: string[]): OpenApiSpec => ({
    ...emptySpec(),
    components: {
      schemas: {
        MySchema: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              ...(pattern ? { pattern } : {}),
              ...(enumVals ? { enum: enumVals } : {}),
            },
          },
        },
      },
    },
  });

  it('returns empty when patterns match', () => {
    const spec = specWithProp('^\\d+$');
    expect(comparePatterns(spec, spec)).toHaveLength(0);
  });

  it('detects pattern change', () => {
    const results = comparePatterns(specWithProp('^\\d+$'), specWithProp('^[a-z]+$'));
    expect(results[0]?.status).toBe('mismatch');
    expect(results[0]?.field).toContain('pattern');
  });

  it('detects enum change', () => {
    const results = comparePatterns(
      specWithProp(undefined, ['a', 'b']),
      specWithProp(undefined, ['a'])
    );
    expect(results[0]?.status).toBe('mismatch');
    expect(results[0]?.field).toContain('enum');
  });

  it('handles specs without components', () => {
    expect(comparePatterns(emptySpec(), emptySpec())).toHaveLength(0);
  });
});

describe('compareSpecs', () => {
  it('reports no breaking changes for identical specs', () => {
    const spec = withSchemas(['Record']);
    const summary = compareSpecs(spec, spec);
    expect(summary.hasBreakingChanges).toBe(false);
    expect(summary.removed).toHaveLength(0);
    expect(summary.added).toHaveLength(0);
    expect(summary.changed).toHaveLength(0);
  });

  it('reports breaking changes when schema removed', () => {
    const summary = compareSpecs(withSchemas(['Record']), withSchemas([]));
    expect(summary.hasBreakingChanges).toBe(true);
    expect(summary.removed).toHaveLength(1);
  });

  it('reports added without breaking change when schema added only', () => {
    const summary = compareSpecs(withSchemas([]), withSchemas(['NewRecord']));
    expect(summary.added).toHaveLength(1);
    expect(summary.hasBreakingChanges).toBe(false);
  });
});
