import { describe, expect, it } from 'vitest';
import { parseDictionary } from './csv.js';
import type { Dictionary } from './csv.js';
import { generateRecord, generateRecords } from './fake.js';

const HEADER =
  'field_name,form_name,field_type,field_label,select_choices_or_calculations,text_validation_type_or_show_slider_number';

const buildDictionary = (...rows: string[]): Dictionary =>
  parseDictionary([HEADER, ...rows].join('\n'));

const FULL = buildDictionary(
  'record_id,demographics,text,Record ID,,',
  'first_name,demographics,text,First name,,',
  'birth_date,demographics,text,Birth date,,date_ymd',
  'age,demographics,text,Age,,integer',
  'sex,demographics,dropdown,Sex,"1, Male | 2, Female",',
  'arm,demographics,radio,Arm,"1, A | 2, B",',
  'consent,demographics,yesno,Consent,,',
  'active,demographics,truefalse,Active,,',
  'score,demographics,slider,Score,,',
  'comments,demographics,notes,Comments,,',
  'symptoms,demographics,checkbox,Symptoms,"1, Fever | 2, Cough",',
  'bmi,demographics,calc,BMI,[weight]/[height],',
  'instructions,demographics,descriptive,Instructions,,'
);

describe('generateRecords', () => {
  it('generates the requested number of records', () => {
    expect(generateRecords(FULL, { count: 5 })).toHaveLength(5);
    expect(generateRecords(FULL)).toHaveLength(1);
  });

  it('is deterministic for a given seed', () => {
    const a = generateRecords(FULL, { count: 3, seed: 42 });
    const b = generateRecords(FULL, { count: 3, seed: 42 });
    expect(a).toEqual(b);
  });

  it('produces different output for different seeds', () => {
    const a = generateRecords(FULL, { count: 3, seed: 1 });
    const b = generateRecords(FULL, { count: 3, seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('assigns a sequential record id to the first field by default', () => {
    const records = generateRecords(FULL, { count: 3 });
    expect(records.map((r) => r['record_id'])).toEqual(['1', '2', '3']);
  });

  it('honours an explicit recordIdField', () => {
    const records = generateRecords(FULL, { count: 2, recordIdField: 'first_name' });
    expect(records.map((r) => r['first_name'])).toEqual(['1', '2']);
  });

  it('produces coded values for categorical fields', () => {
    const records = generateRecords(FULL, { count: 20, seed: 7 });
    for (const r of records) {
      expect(['1', '2']).toContain(r['sex']);
      expect(['1', '2']).toContain(r['arm']);
      expect(['0', '1']).toContain(r['consent']);
      expect(['0', '1']).toContain(r['active']);
    }
  });

  it('expands checkbox fields into per-choice columns', () => {
    const record = generateRecord(FULL, { seed: 3 });
    expect(record).toHaveProperty('symptoms___1');
    expect(record).toHaveProperty('symptoms___2');
    expect(['0', '1']).toContain(record['symptoms___1']);
    expect(record).not.toHaveProperty('symptoms');
  });

  it('leaves calc/file/sql fields empty', () => {
    const record = generateRecord(FULL);
    expect(record['bmi']).toBe('');
  });

  it('omits descriptive fields entirely', () => {
    const record = generateRecord(FULL);
    expect(record).not.toHaveProperty('instructions');
  });

  it('emits a slider value within 0..100', () => {
    for (const r of generateRecords(FULL, { count: 30, seed: 9 })) {
      const score = Number(r['score']);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('respects date validation', () => {
    const record = generateRecord(FULL, { seed: 5 });
    expect(record['birth_date']).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('respects integer validation', () => {
    for (const r of generateRecords(FULL, { count: 10, seed: 11 })) {
      expect(r['age']).toMatch(/^\d+$/);
    }
  });

  it('produces free-text values for plain text fields', () => {
    const record = generateRecord(FULL, { seed: 2 });
    expect(record['first_name']).toMatch(/^[a-z]+-\d{3}$/);
  });

  it('blanks some optional fields in sparse mode, deterministically', () => {
    const a = generateRecords(FULL, { count: 10, seed: 4, sparse: true });
    const b = generateRecords(FULL, { count: 10, seed: 4, sparse: true });
    expect(a).toEqual(b);
    const blanks = a.filter((r) => r['first_name'] === '').length;
    expect(blanks).toBeGreaterThan(0);
  });

  it('never blanks fields when sparse is false', () => {
    const records = generateRecords(FULL, { count: 20, seed: 8 });
    for (const r of records) {
      expect(r['first_name']).not.toBe('');
    }
  });
});

describe('generateRecord', () => {
  it('returns a single record', () => {
    const record = generateRecord(FULL, { seed: 1 });
    expect(record['record_id']).toBe('1');
  });

  it('returns an empty record for an empty dictionary', () => {
    const empty = buildDictionary();
    expect(generateRecord(empty)).toEqual({});
    expect(generateRecords(empty, { count: 2 })).toEqual([{}, {}]);
  });

  it('returns empty value for a dropdown without choices', () => {
    const dict = buildDictionary('color,form,dropdown,Color,,');
    // first field is the id field -> add a second to exercise empty choices
    const dict2 = buildDictionary('id,form,text,Id,,', 'color,form,dropdown,Color,,');
    expect(generateRecord(dict, { recordIdField: '__none__' })['color']).toBe('');
    expect(generateRecord(dict2)['color']).toBe('');
  });
});
