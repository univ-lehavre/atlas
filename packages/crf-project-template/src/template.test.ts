import { describe, expect, it } from 'vitest';
import { Either } from 'effect';
import {
  defaultTemplate,
  deserializeTemplate,
  encodeTemplate,
  isValidTemplate,
  serializeTemplate,
  validateTemplate,
} from './template.js';

describe('defaultTemplate', () => {
  it('produces a structurally valid template', () => {
    expect(isValidTemplate(defaultTemplate())).toBe(true);
  });

  it('contains a single enrollment instrument with three fields', () => {
    const template = defaultTemplate();
    expect(template.instruments).toHaveLength(1);
    expect(template.instruments[0].name).toBe('enrollment');
    expect(template.instruments[0].fields).toHaveLength(3);
  });
});

describe('validateTemplate', () => {
  it('accepts the default template', () => {
    const result = validateTemplate(defaultTemplate());
    expect(Either.isRight(result)).toBe(true);
  });

  it('rejects a non-object', () => {
    expect(Either.isLeft(validateTemplate(42))).toBe(true);
  });

  it('rejects a template with no instruments', () => {
    const result = validateTemplate({
      metadata: { name: 'P', version: '1.0.0' },
      instruments: [],
    });
    expect(Either.isLeft(result)).toBe(true);
  });
});

describe('isValidTemplate', () => {
  it('returns false for garbage', () => {
    expect(isValidTemplate({ foo: 'bar' })).toBe(false);
  });
});

describe('encodeTemplate', () => {
  it('round-trips through validate', () => {
    const encoded = encodeTemplate(defaultTemplate());
    expect(Either.isRight(encoded)).toBe(true);
    if (Either.isRight(encoded)) {
      expect(isValidTemplate(encoded.right)).toBe(true);
    }
  });
});

describe('serializeTemplate / deserializeTemplate', () => {
  it('round-trips a template', () => {
    const original = defaultTemplate();
    const json = serializeTemplate(original);
    expect(Either.isRight(json)).toBe(true);
    if (!Either.isRight(json)) return;

    const back = deserializeTemplate(json.right);
    expect(Either.isRight(back)).toBe(true);
    if (Either.isRight(back)) {
      expect(back.right).toStrictEqual(original);
    }
  });

  it('pretty prints when requested', () => {
    const json = serializeTemplate(defaultTemplate(), { pretty: true });
    expect(Either.isRight(json)).toBe(true);
    if (Either.isRight(json)) {
      expect(json.right).toContain('\n');
    }
  });

  it('produces compact JSON by default', () => {
    const json = serializeTemplate(defaultTemplate());
    expect(Either.isRight(json)).toBe(true);
    if (Either.isRight(json)) {
      expect(json.right).not.toContain('\n');
    }
  });

  it('fails to deserialize malformed JSON', () => {
    const result = deserializeTemplate('{ not json');
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(SyntaxError);
    }
  });

  it('fails to deserialize a valid-JSON but invalid template', () => {
    const result = deserializeTemplate(JSON.stringify({ metadata: {}, instruments: [] }));
    expect(Either.isLeft(result)).toBe(true);
  });
});
