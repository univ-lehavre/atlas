/**
 * Property-based tests for validators using fast-check.
 *
 * These tests complement the example-based tests in `index.test.ts` by
 * exercising invariants over randomly generated inputs.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isEmail,
  isHexadecimal,
  ensureJsonContentType,
  parseJsonBody,
  validateAndParseJsonBody,
  normalizeEmail,
} from './index.js';
import { InvalidContentTypeError, InvalidJsonBodyError } from '@univ-lehavre/atlas-errors';

describe('isEmail — properties', () => {
  it('accepts any address produced by fc.emailAddress()', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        expect(isEmail(email)).toBe(true);
      })
    );
  });

  it('rejects any string that does not contain an @', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.includes('@')),
        (s) => {
          expect(isEmail(s)).toBe(false);
        }
      )
    );
  });

  it('rejects any input strictly longer than 254 characters', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 255, maxLength: 500 }), (s) => {
        expect(isEmail(s)).toBe(false);
      })
    );
  });

  it('always returns a boolean for arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(typeof isEmail(s)).toBe('boolean');
      })
    );
  });
});

describe('isHexadecimal — properties', () => {
  it('accepts any non-empty string of hex characters', () => {
    fc.assert(
      fc.property(fc.hexaString({ minLength: 1, maxLength: 64 }), (s) => {
        expect(isHexadecimal(s)).toBe(true);
      })
    );
  });

  it('rejects any string containing at least one non-hex character', () => {
    // Build a string with guaranteed non-hex characters (g-z range)
    fc.assert(
      fc.property(fc.stringMatching(/^[g-z]{1,20}$/), (s) => {
        expect(isHexadecimal(s)).toBe(false);
      })
    );
  });

  it('always returns a boolean for arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(typeof isHexadecimal(s)).toBe('boolean');
      })
    );
  });
});

describe('normalizeEmail — properties', () => {
  it('is idempotent: normalizeEmail(normalizeEmail(x)) === normalizeEmail(x)', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        const once = normalizeEmail(email);
        const twice = normalizeEmail(once);
        expect(twice).toBe(once);
      })
    );
  });

  it('the result is always lowercase', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const normalized = normalizeEmail(s);
        expect(normalized).toBe(normalized.toLowerCase());
      })
    );
  });

  it('removes the +tag part of the local segment when present', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[a-z0-9]{1,10}$/),
          fc.stringMatching(/^[a-z0-9]{1,10}$/),
          fc.stringMatching(/^[a-z0-9]{1,10}$/)
        ),
        ([local, tag, domain]) => {
          const email = `${local}+${tag}@${domain}.com`;
          expect(normalizeEmail(email)).toBe(`${local}@${domain}.com`);
        }
      )
    );
  });

  it('leaves emails without "+" unchanged apart from lowercasing', () => {
    fc.assert(
      fc.property(fc.emailAddress(), (email) => {
        if (email.includes('+')) return;
        expect(normalizeEmail(email)).toBe(email.toLowerCase());
      })
    );
  });
});

describe('ensureJsonContentType — properties', () => {
  it('throws InvalidContentTypeError for any content-type that does not contain "application/json"', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => !s.toLowerCase().includes('application/json')),
        (contentType) => {
          const request = new Request('http://test', {
            headers: { 'content-type': contentType },
          });
          expect(() => ensureJsonContentType(request)).toThrow(InvalidContentTypeError);
        }
      )
    );
  });

  it('does not throw when "application/json" is present (case-insensitive)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('application/json'),
          fc.constant('Application/JSON'),
          fc.constant('application/json; charset=utf-8'),
          fc.constant('APPLICATION/JSON; charset=utf-8')
        ),
        (contentType) => {
          const request = new Request('http://test', {
            headers: { 'content-type': contentType },
          });
          expect(() => ensureJsonContentType(request)).not.toThrow();
        }
      )
    );
  });
});

describe('parseJsonBody — properties', () => {
  it('round-trips any plain JSON object', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null))
        ),
        async (obj) => {
          const request = new Request('http://test', {
            method: 'POST',
            body: JSON.stringify(obj),
          });
          const parsed = await parseJsonBody(request);
          expect(parsed).toEqual(obj);
        }
      )
    );
  });

  it('rejects any JSON array body', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer()), async (arr) => {
        const request = new Request('http://test', {
          method: 'POST',
          body: JSON.stringify(arr),
        });
        await expect(parseJsonBody(request)).rejects.toThrow(InvalidJsonBodyError);
      })
    );
  });

  it('rejects any JSON primitive body (string / number / boolean / null)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
        async (primitive) => {
          const request = new Request('http://test', {
            method: 'POST',
            body: JSON.stringify(primitive),
          });
          await expect(parseJsonBody(request)).rejects.toThrow(InvalidJsonBodyError);
        }
      )
    );
  });
});

describe('validateAndParseJsonBody — properties', () => {
  it('round-trips any plain JSON object when the content-type is application/json', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }),
          fc.oneof(fc.string(), fc.integer(), fc.boolean())
        ),
        async (obj) => {
          const request = new Request('http://test', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(obj),
          });
          const parsed = await validateAndParseJsonBody(request);
          expect(parsed).toEqual(obj);
        }
      )
    );
  });
});
