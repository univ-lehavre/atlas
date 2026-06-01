import { describe, expect, it } from 'vitest';
import { DictionaryParseError, parseChoices, parseDictionary } from './csv.js';
import type { Dictionary } from './csv.js';

const VERBOSE_HEADER =
  '"Variable / Field Name","Form Name","Section Header","Field Type","Field Label","Choices, Calculations, OR Slider Labels","Field Note","Text Validation Type OR Show Slider Number","Text Validation Min","Text Validation Max",Identifier?,"Branching Logic (Show field only if...)","Required Field?","Custom Alignment","Question Number (surveys only)","Matrix Group Name","Matrix Ranking?","Field Annotation"';

const csv = (...lines: string[]): string => [VERBOSE_HEADER, ...lines].join('\n');

describe('parseDictionary', () => {
  it('parses the verbose export header into canonical keys', () => {
    const dict = parseDictionary(csv('record_id,demographics,,text,"Record ID",,,,,,,,,,,,,'));
    expect(dict.fields).toHaveLength(1);
    const field = dict.fields[0];
    expect(field).toBeDefined();
    expect(field).toMatchObject({
      field_name: 'record_id',
      form_name: 'demographics',
      field_type: 'text',
      field_label: 'Record ID',
    });
  });

  it('omits absent optional columns and includes filled ones', () => {
    const dict = parseDictionary(csv('age,demographics,Vitals,text,"Age",,,integer,0,120,,,,,,,,'));
    const field = dict.fields[0]!;
    expect(field.section_header).toBe('Vitals');
    expect(field.text_validation_type_or_show_slider_number).toBe('integer');
    expect(field.text_validation_min).toBe('0');
    expect(field.text_validation_max).toBe('120');
    // Blank cells -> property absent
    expect(field.field_note).toBeUndefined();
    expect(field.branching_logic).toBeUndefined();
  });

  it('preserves embedded commas inside quoted choice cells', () => {
    const dict = parseDictionary(
      csv('sex,demographics,,dropdown,"Sex","1, Male | 2, Female",,,,,,,,,,,,')
    );
    const field = dict.fields[0]!;
    expect(field.select_choices_or_calculations).toBe('1, Male | 2, Female');
  });

  it('accepts canonical snake_case headers', () => {
    const content = [
      'field_name,form_name,field_type,field_label',
      'record_id,demographics,text,Record ID',
    ].join('\n');
    const dict = parseDictionary(content);
    expect(dict.fields[0]?.field_name).toBe('record_id');
  });

  it('ignores unknown columns', () => {
    const content = [
      'field_name,form_name,field_type,field_label,extra_unknown',
      'record_id,demographics,text,Record ID,junk',
    ].join('\n');
    const dict = parseDictionary(content);
    expect(dict.fields[0]).not.toHaveProperty('extra_unknown');
    expect(Object.keys(dict.fields[0] ?? {})).not.toContain('__ignored_extra_unknown');
  });

  it('skips empty lines', () => {
    const dict = parseDictionary(csv('record_id,demographics,,text,"Record ID",,,,,,,,,,,,,', ''));
    expect(dict.fields).toHaveLength(1);
  });

  it('parses an empty dictionary (header only)', () => {
    const dict: Dictionary = parseDictionary(VERBOSE_HEADER);
    expect(dict.fields).toEqual([]);
  });

  it('throws on a missing required column value', () => {
    expect(() => parseDictionary(csv(',demographics,,text,"No name",,,,,,,,,,,,,'))).toThrow(
      DictionaryParseError
    );
  });

  it('throws on an unknown field type', () => {
    expect(() => parseDictionary(csv('weird,demographics,,banana,"Weird",,,,,,,,,,,,,'))).toThrow(
      /unknown field_type "banana"/
    );
  });

  it('throws DictionaryParseError on malformed CSV', () => {
    // Unterminated quote -> csv-parse error wrapped.
    expect(() => parseDictionary('field_name\n"unterminated')).toThrow(DictionaryParseError);
  });

  it('sets the error name', () => {
    const error = new DictionaryParseError('boom', { cause: new Error('x') });
    expect(error.name).toBe('DictionaryParseError');
    expect(error.message).toBe('boom');
  });
});

describe('parseChoices', () => {
  it('parses code/label pairs separated by pipes', () => {
    expect(parseChoices('1, Male | 2, Female')).toEqual([
      { code: '1', label: 'Male' },
      { code: '2', label: 'Female' },
    ]);
  });

  it('returns an empty array for blank or undefined input', () => {
    expect(parseChoices()).toEqual([]);
    expect(parseChoices('')).toEqual([]);
    expect(parseChoices('   ')).toEqual([]);
  });

  it('handles a label that itself contains commas', () => {
    expect(parseChoices('3, Other, please specify')).toEqual([
      { code: '3', label: 'Other, please specify' },
    ]);
  });

  it('falls back to code===label for a segment without a comma', () => {
    expect(parseChoices('yes | no')).toEqual([
      { code: 'yes', label: 'yes' },
      { code: 'no', label: 'no' },
    ]);
  });
});
