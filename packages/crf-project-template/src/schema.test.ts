import { describe, expect, it } from 'vitest';
import { Either, Schema } from 'effect';
import {
  FieldType,
  FieldNameSchema,
  InstrumentNameSchema,
  ProjectTemplate,
  TemplateField,
  TemplateInstrument,
} from './schema.js';

const decodeField = Schema.decodeUnknownEither(TemplateField);
const decodeInstrument = Schema.decodeUnknownEither(TemplateInstrument);
const decodeName = Schema.decodeUnknownEither(InstrumentNameSchema);
const decodeFieldName = Schema.decodeUnknownEither(FieldNameSchema);

describe('FieldType', () => {
  it.each(['text', 'number', 'date', 'datetime', 'choice', 'boolean'])('accepts %s', (value) => {
    const result = Schema.decodeUnknownEither(FieldType)(value);
    expect(Either.isRight(result)).toBe(true);
  });

  it('rejects an unknown type', () => {
    const result = Schema.decodeUnknownEither(FieldType)('image');
    expect(Either.isLeft(result)).toBe(true);
  });
});

describe('InstrumentNameSchema / FieldNameSchema', () => {
  it.each(['enrollment', 'visit_1', 'a'])('accepts valid name %s', (name) => {
    expect(Either.isRight(decodeName(name))).toBe(true);
    expect(Either.isRight(decodeFieldName(name))).toBe(true);
  });

  it.each(['1visit', 'Enrollment', 'has space', '_leading', ''])(
    'rejects invalid name %s',
    (name) => {
      expect(Either.isLeft(decodeName(name))).toBe(true);
      expect(Either.isLeft(decodeFieldName(name))).toBe(true);
    }
  );
});

describe('TemplateField', () => {
  it('defaults required to false when omitted', () => {
    const result = decodeField({ name: 'age', label: 'Age', type: 'number' });
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right.required).toBe(false);
    }
  });

  it('keeps an explicit required flag', () => {
    const result = decodeField({
      name: 'age',
      label: 'Age',
      type: 'number',
      required: true,
    });
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right.required).toBe(true);
    }
  });

  it('accepts choice options', () => {
    const result = decodeField({
      name: 'sex',
      label: 'Sex',
      type: 'choice',
      options: [
        { value: 'm', label: 'Male' },
        { value: 'f', label: 'Female' },
      ],
    });
    expect(Either.isRight(result)).toBe(true);
  });

  it('rejects an invalid field name', () => {
    const result = decodeField({ name: 'Age', label: 'Age', type: 'number' });
    expect(Either.isLeft(result)).toBe(true);
  });

  it('rejects an empty label', () => {
    const result = decodeField({ name: 'age', label: '', type: 'number' });
    expect(Either.isLeft(result)).toBe(true);
  });
});

describe('TemplateInstrument', () => {
  it('requires at least one field', () => {
    const result = decodeInstrument({ name: 'empty', label: 'Empty', fields: [] });
    expect(Either.isLeft(result)).toBe(true);
  });

  it('accepts a one-field instrument', () => {
    const result = decodeInstrument({
      name: 'enrollment',
      label: 'Enrollment',
      fields: [{ name: 'record_id', label: 'Record ID', type: 'text' }],
    });
    expect(Either.isRight(result)).toBe(true);
  });
});

describe('ProjectTemplate', () => {
  it('requires at least one instrument', () => {
    const result = Schema.decodeUnknownEither(ProjectTemplate)({
      metadata: { name: 'P', version: '1.0.0' },
      instruments: [],
    });
    expect(Either.isLeft(result)).toBe(true);
  });
});
