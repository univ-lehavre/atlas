/**
 * @module version/parse.test
 * @description Tests for version parsing utilities
 */

import { describe, it, expect } from 'vitest';
import { Effect, Either } from 'effect';
import { VERSION_PATTERN, parseVersion, tryParseVersion } from './parse.js';
import { VersionParseError } from '../errors/version.js';

describe('VERSION_PATTERN', () => {
  it('should match valid version strings', () => {
    expect(VERSION_PATTERN.test('14.5.10')).toBe(true);
    expect(VERSION_PATTERN.test('1.0.0')).toBe(true);
    expect(VERSION_PATTERN.test('0.0.0')).toBe(true);
    expect(VERSION_PATTERN.test('100.200.300')).toBe(true);
  });

  it('should not match incomplete versions', () => {
    expect(VERSION_PATTERN.test('14.5')).toBe(false);
    expect(VERSION_PATTERN.test('14')).toBe(false);
    expect(VERSION_PATTERN.test('')).toBe(false);
  });

  it('should not match versions with extra parts', () => {
    expect(VERSION_PATTERN.test('14.5.10.1')).toBe(false);
    expect(VERSION_PATTERN.test('14.5.10-beta')).toBe(false);
    expect(VERSION_PATTERN.test('v14.5.10')).toBe(false);
  });

  it('should not match versions with non-numeric parts', () => {
    expect(VERSION_PATTERN.test('a.b.c')).toBe(false);
    expect(VERSION_PATTERN.test('14.5.x')).toBe(false);
  });

  it('should capture major, minor, patch groups', () => {
    const match = VERSION_PATTERN.exec('14.5.10');
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('14');
    expect(match?.[2]).toBe('5');
    expect(match?.[3]).toBe('10');
  });
});

describe('parseVersion', () => {
  it('should parse valid version strings', async () => {
    const result = await Effect.runPromise(parseVersion('14.5.10'));
    expect(result).toEqual({ major: 14, minor: 5, patch: 10 });
  });

  it('should parse version 0.0.0', async () => {
    const result = await Effect.runPromise(parseVersion('0.0.0'));
    expect(result).toEqual({ major: 0, minor: 0, patch: 0 });
  });

  it('should parse version 1.0.0', async () => {
    const result = await Effect.runPromise(parseVersion('1.0.0'));
    expect(result).toEqual({ major: 1, minor: 0, patch: 0 });
  });

  it('should parse large version numbers', async () => {
    const result = await Effect.runPromise(parseVersion('100.200.300'));
    expect(result).toEqual({ major: 100, minor: 200, patch: 300 });
  });

  it('should trim whitespace', async () => {
    const result = await Effect.runPromise(parseVersion('  14.5.10  '));
    expect(result).toEqual({ major: 14, minor: 5, patch: 10 });
  });

  it('should fail for invalid version strings', async () => {
    const result = await Effect.runPromiseExit(parseVersion('invalid'));
    expect(result._tag).toBe('Failure');
  });

  it('should fail for incomplete versions', async () => {
    const result = await Effect.runPromiseExit(parseVersion('14.5'));
    expect(result._tag).toBe('Failure');
  });

  it('should fail for empty string', async () => {
    const result = await Effect.runPromiseExit(parseVersion(''));
    expect(result._tag).toBe('Failure');
  });

  it('should return VersionParseError on failure', async () => {
    const effect = parseVersion('invalid');
    const either = await Effect.runPromise(Effect.either(effect));

    expect(Either.isLeft(either)).toBe(true);
    if (Either.isLeft(either)) {
      expect(either.left).toBeInstanceOf(VersionParseError);
      expect(either.left.input).toBe('invalid');
    }
  });
});

describe('tryParseVersion', () => {
  it('should parse valid version strings', () => {
    const result = tryParseVersion('14.5.10');
    expect(result).toEqual({ major: 14, minor: 5, patch: 10 });
  });

  it('should parse version 0.0.0', () => {
    const result = tryParseVersion('0.0.0');
    expect(result).toEqual({ major: 0, minor: 0, patch: 0 });
  });

  it('should trim whitespace', () => {
    const result = tryParseVersion('  14.5.10  ');
    expect(result).toEqual({ major: 14, minor: 5, patch: 10 });
  });

  it('should return undefined for invalid version strings', () => {
    expect(tryParseVersion('invalid')).toBeUndefined();
    expect(tryParseVersion('14.5')).toBeUndefined();
    expect(tryParseVersion('')).toBeUndefined();
    expect(tryParseVersion('14.5.10.1')).toBeUndefined();
  });
});

describe('REDCap version examples', () => {
  it('should parse known REDCap versions', async () => {
    // Known supported versions
    expect(await Effect.runPromise(parseVersion('14.5.10'))).toEqual({
      major: 14,
      minor: 5,
      patch: 10,
    });
    expect(await Effect.runPromise(parseVersion('15.5.32'))).toEqual({
      major: 15,
      minor: 5,
      patch: 32,
    });
    expect(await Effect.runPromise(parseVersion('16.0.8'))).toEqual({
      major: 16,
      minor: 0,
      patch: 8,
    });
  });

  it('should parse older REDCap versions', () => {
    expect(tryParseVersion('8.0.0')).toEqual({ major: 8, minor: 0, patch: 0 });
    expect(tryParseVersion('9.5.13')).toEqual({ major: 9, minor: 5, patch: 13 });
    expect(tryParseVersion('10.6.0')).toEqual({ major: 10, minor: 6, patch: 0 });
  });
});
