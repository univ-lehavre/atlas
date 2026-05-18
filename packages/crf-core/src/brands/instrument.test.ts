/**
 * @module brands/instrument.test
 * @description Tests for REDCap instrument and field name branded types
 */

import { describe, it, expect } from 'vitest';
import { Either } from 'effect';
import {
  InstrumentName,
  INSTRUMENT_NAME_PATTERN,
  isValidInstrumentName,
  parseInstrumentName,
  FieldName,
  FIELD_NAME_PATTERN,
  isValidFieldName,
  parseFieldName,
} from './instrument.js';

describe('InstrumentName', () => {
  describe('INSTRUMENT_NAME_PATTERN', () => {
    it('should match lowercase names starting with letter', () => {
      expect(INSTRUMENT_NAME_PATTERN.test('survey')).toBe(true);
      expect(INSTRUMENT_NAME_PATTERN.test('demographics')).toBe(true);
      expect(INSTRUMENT_NAME_PATTERN.test('a')).toBe(true);
    });

    it('should match names with digits after first letter', () => {
      expect(INSTRUMENT_NAME_PATTERN.test('survey1')).toBe(true);
      expect(INSTRUMENT_NAME_PATTERN.test('form123')).toBe(true);
    });

    it('should match names with underscores', () => {
      expect(INSTRUMENT_NAME_PATTERN.test('my_survey')).toBe(true);
      expect(INSTRUMENT_NAME_PATTERN.test('patient_demographics')).toBe(true);
      expect(INSTRUMENT_NAME_PATTERN.test('survey_1_part_a')).toBe(true);
    });

    it('should not match names starting with digit', () => {
      expect(INSTRUMENT_NAME_PATTERN.test('1survey')).toBe(false);
      expect(INSTRUMENT_NAME_PATTERN.test('123form')).toBe(false);
    });

    it('should not match names starting with underscore', () => {
      expect(INSTRUMENT_NAME_PATTERN.test('_survey')).toBe(false);
      expect(INSTRUMENT_NAME_PATTERN.test('__form')).toBe(false);
    });

    it('should not match uppercase letters', () => {
      expect(INSTRUMENT_NAME_PATTERN.test('Survey')).toBe(false);
      expect(INSTRUMENT_NAME_PATTERN.test('SURVEY')).toBe(false);
      expect(INSTRUMENT_NAME_PATTERN.test('mySurvey')).toBe(false);
    });

    it('should not match hyphens', () => {
      expect(INSTRUMENT_NAME_PATTERN.test('my-survey')).toBe(false);
    });

    it('should not match spaces', () => {
      expect(INSTRUMENT_NAME_PATTERN.test('my survey')).toBe(false);
    });

    it('should not match empty string', () => {
      expect(INSTRUMENT_NAME_PATTERN.test('')).toBe(false);
    });
  });

  describe('InstrumentName validator', () => {
    it('should accept valid instrument names', () => {
      expect(() => InstrumentName('survey')).not.toThrow();
      expect(() => InstrumentName('my_instrument_123')).not.toThrow();
      expect(() => InstrumentName('a')).not.toThrow();
    });

    it('should return the branded value', () => {
      const name = InstrumentName('demographics');
      expect(name).toBe('demographics');
    });

    it('should throw for invalid names', () => {
      expect(() => InstrumentName('Survey')).toThrow();
      expect(() => InstrumentName('1survey')).toThrow();
      expect(() => InstrumentName('')).toThrow();
    });
  });

  describe('isValidInstrumentName', () => {
    it('should return true for valid names', () => {
      expect(isValidInstrumentName('survey')).toBe(true);
      expect(isValidInstrumentName('my_survey_1')).toBe(true);
    });

    it('should return false for invalid names', () => {
      expect(isValidInstrumentName('')).toBe(false);
      expect(isValidInstrumentName('Survey')).toBe(false);
      expect(isValidInstrumentName('1survey')).toBe(false);
    });

    it('should act as type guard', () => {
      const value: string = 'survey';
      if (isValidInstrumentName(value)) {
        const _name: InstrumentName = value;
        expect(_name).toBe(value);
      }
    });
  });

  describe('parseInstrumentName', () => {
    it('should return Right for valid names', () => {
      const result = parseInstrumentName('demographics');
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(result.right).toBe('demographics');
      }
    });

    it('should return Left for invalid names', () => {
      expect(Either.isLeft(parseInstrumentName('Survey'))).toBe(true);
      expect(Either.isLeft(parseInstrumentName(''))).toBe(true);
    });
  });
});

describe('FieldName', () => {
  describe('FIELD_NAME_PATTERN', () => {
    it('should have same pattern as instrument name', () => {
      expect(FIELD_NAME_PATTERN.source).toBe(INSTRUMENT_NAME_PATTERN.source);
    });

    it('should match valid field names', () => {
      expect(FIELD_NAME_PATTERN.test('record_id')).toBe(true);
      expect(FIELD_NAME_PATTERN.test('first_name')).toBe(true);
      expect(FIELD_NAME_PATTERN.test('age')).toBe(true);
    });
  });

  describe('FieldName validator', () => {
    it('should accept valid field names', () => {
      expect(() => FieldName('record_id')).not.toThrow();
      expect(() => FieldName('patient_age')).not.toThrow();
    });

    it('should throw for invalid names', () => {
      expect(() => FieldName('RecordId')).toThrow();
      expect(() => FieldName('1field')).toThrow();
    });
  });

  describe('isValidFieldName', () => {
    it('should return true for valid names', () => {
      expect(isValidFieldName('record_id')).toBe(true);
      expect(isValidFieldName('field_1')).toBe(true);
    });

    it('should return false for invalid names', () => {
      expect(isValidFieldName('')).toBe(false);
      expect(isValidFieldName('FIELD')).toBe(false);
    });

    it('should act as type guard', () => {
      const value: string = 'record_id';
      if (isValidFieldName(value)) {
        const _name: FieldName = value;
        expect(_name).toBe(value);
      }
    });
  });

  describe('parseFieldName', () => {
    it('should return Right for valid names', () => {
      const result = parseFieldName('record_id');
      expect(Either.isRight(result)).toBe(true);
    });

    it('should return Left for invalid names', () => {
      expect(Either.isLeft(parseFieldName('Record_ID'))).toBe(true);
    });
  });

  describe('REDCap field naming conventions', () => {
    it('should accept typical REDCap field names', () => {
      // Common REDCap field patterns
      expect(isValidFieldName('record_id')).toBe(true);
      expect(isValidFieldName('redcap_event_name')).toBe(true);
      expect(isValidFieldName('redcap_repeat_instrument')).toBe(true);
      expect(isValidFieldName('redcap_repeat_instance')).toBe(true);
      expect(isValidFieldName('demographics_complete')).toBe(true);
    });

    it('should reject invalid REDCap patterns', () => {
      // Invalid patterns that might be attempted
      expect(isValidFieldName('record-id')).toBe(false);
      expect(isValidFieldName('Record_ID')).toBe(false);
      expect(isValidFieldName('123_field')).toBe(false);
    });
  });
});
