/**
 * @module utils/string.test
 * @description Tests for string utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  capitalizeFirst,
  snakeToCamel,
  camelToSnake,
  truncate,
  normalizeWhitespace,
} from './string.js';

describe('capitalizeFirst', () => {
  it('should capitalize the first letter', () => {
    expect(capitalizeFirst('hello')).toBe('Hello');
    expect(capitalizeFirst('world')).toBe('World');
  });

  it('should handle already capitalized strings', () => {
    expect(capitalizeFirst('Hello')).toBe('Hello');
    expect(capitalizeFirst('HELLO')).toBe('HELLO');
  });

  it('should handle single character strings', () => {
    expect(capitalizeFirst('a')).toBe('A');
    expect(capitalizeFirst('Z')).toBe('Z');
  });

  it('should return empty string for empty input', () => {
    expect(capitalizeFirst('')).toBe('');
  });

  it('should handle strings starting with non-letter', () => {
    expect(capitalizeFirst('123abc')).toBe('123abc');
    expect(capitalizeFirst(' hello')).toBe(' hello');
  });
});

describe('snakeToCamel', () => {
  it('should convert snake_case to camelCase', () => {
    expect(snakeToCamel('record_id')).toBe('recordId');
    expect(snakeToCamel('first_name')).toBe('firstName');
    expect(snakeToCamel('my_variable_name')).toBe('myVariableName');
  });

  it('should handle strings without underscores', () => {
    expect(snakeToCamel('record')).toBe('record');
    expect(snakeToCamel('firstName')).toBe('firstName');
  });

  it('should handle multiple consecutive underscores', () => {
    expect(snakeToCamel('my__variable')).toBe('my_Variable');
  });

  it('should convert leading underscores followed by letter', () => {
    // The regex /_([a-z])/g matches _p and converts to P
    expect(snakeToCamel('_private')).toBe('Private');
    // Trailing underscore is preserved (no letter after)
    expect(snakeToCamel('trailing_')).toBe('trailing_');
  });

  it('should handle empty string', () => {
    expect(snakeToCamel('')).toBe('');
  });
});

describe('camelToSnake', () => {
  it('should convert camelCase to snake_case', () => {
    expect(camelToSnake('recordId')).toBe('record_id');
    expect(camelToSnake('firstName')).toBe('first_name');
    expect(camelToSnake('myVariableName')).toBe('my_variable_name');
  });

  it('should handle strings without uppercase', () => {
    expect(camelToSnake('record')).toBe('record');
    expect(camelToSnake('name')).toBe('name');
  });

  it('should handle PascalCase', () => {
    expect(camelToSnake('RecordId')).toBe('_record_id');
    expect(camelToSnake('MyClass')).toBe('_my_class');
  });

  it('should handle consecutive uppercase (acronyms)', () => {
    expect(camelToSnake('myAPIClient')).toBe('my_a_p_i_client');
  });

  it('should handle empty string', () => {
    expect(camelToSnake('')).toBe('');
  });
});

describe('truncate', () => {
  it('should truncate long strings', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
    expect(truncate('This is a long string', 10)).toBe('This is a ...');
  });

  it('should not truncate short strings', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
    expect(truncate('Hi', 5)).toBe('Hi');
  });

  it('should use custom suffix', () => {
    expect(truncate('Hello World', 5, '…')).toBe('Hello…');
    expect(truncate('Hello World', 5, '')).toBe('Hello');
  });

  it('should handle edge cases', () => {
    expect(truncate('', 5)).toBe('');
    expect(truncate('Hello', 0)).toBe('...');
  });

  it('should handle exact length', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });
});

describe('normalizeWhitespace', () => {
  it('should trim leading/trailing whitespace', () => {
    expect(normalizeWhitespace('  hello  ')).toBe('hello');
    expect(normalizeWhitespace('\thello\n')).toBe('hello');
  });

  it('should collapse internal whitespace', () => {
    expect(normalizeWhitespace('hello   world')).toBe('hello world');
    expect(normalizeWhitespace('a  b  c')).toBe('a b c');
  });

  it('should handle multiple types of whitespace', () => {
    expect(normalizeWhitespace('hello\t\nworld')).toBe('hello world');
    expect(normalizeWhitespace('a  \t\n  b')).toBe('a b');
  });

  it('should handle strings without extra whitespace', () => {
    expect(normalizeWhitespace('hello world')).toBe('hello world');
  });

  it('should handle empty string', () => {
    expect(normalizeWhitespace('')).toBe('');
  });

  it('should handle whitespace-only string', () => {
    expect(normalizeWhitespace('   ')).toBe('');
  });
});
