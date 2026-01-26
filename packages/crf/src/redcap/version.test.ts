import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import {
  parseVersion,
  formatVersion,
  compareVersions,
  isVersionAtLeast,
  isVersionLessThan,
  isVersionInRange,
  getMajorVersion,
  VersionParseError,
  UnsupportedVersionError,
  SUPPORTED_VERSIONS,
  type Version,
} from './version.js';

describe('Version Module', () => {
  describe('parseVersion', () => {
    it('should parse valid version string', async () => {
      const result = await Effect.runPromise(parseVersion('14.5.10'));

      expect(result).toEqual({ major: 14, minor: 5, patch: 10 });
    });

    it('should parse version with zeros', async () => {
      const result = await Effect.runPromise(parseVersion('15.0.0'));

      expect(result).toEqual({ major: 15, minor: 0, patch: 0 });
    });

    it('should handle whitespace', async () => {
      const result = await Effect.runPromise(parseVersion('  16.0.8  '));

      expect(result).toEqual({ major: 16, minor: 0, patch: 8 });
    });

    it('should fail on invalid format (too few parts)', async () => {
      const result = await Effect.runPromiseExit(parseVersion('14.5'));

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        const error = result.cause;
        expect(error._tag).toBe('Fail');
      }
    });

    it('should fail on invalid format (too many parts)', async () => {
      const result = await Effect.runPromiseExit(parseVersion('14.5.10.1'));

      expect(result._tag).toBe('Failure');
    });

    it('should fail on non-numeric parts', async () => {
      const result = await Effect.runPromiseExit(parseVersion('14.x.10'));

      expect(result._tag).toBe('Failure');
    });

    it('should fail on negative numbers', async () => {
      const result = await Effect.runPromiseExit(parseVersion('-14.5.10'));

      expect(result._tag).toBe('Failure');
    });

    it('should fail on empty string', async () => {
      const result = await Effect.runPromiseExit(parseVersion(''));

      expect(result._tag).toBe('Failure');
    });
  });

  describe('formatVersion', () => {
    it('should format version object to string', () => {
      const version: Version = { major: 14, minor: 5, patch: 10 };

      expect(formatVersion(version)).toBe('14.5.10');
    });

    it('should format version with zeros', () => {
      const version: Version = { major: 15, minor: 0, patch: 0 };

      expect(formatVersion(version)).toBe('15.0.0');
    });

    it('should be inverse of parseVersion', async () => {
      const original = '16.0.8';
      const parsed = await Effect.runPromise(parseVersion(original));
      const formatted = formatVersion(parsed);

      expect(formatted).toBe(original);
    });
  });

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      const a: Version = { major: 14, minor: 5, patch: 10 };
      const b: Version = { major: 14, minor: 5, patch: 10 };

      expect(compareVersions(a, b)).toBe(0);
    });

    it('should return -1 when a < b (major)', () => {
      const a: Version = { major: 14, minor: 5, patch: 10 };
      const b: Version = { major: 15, minor: 0, patch: 0 };

      expect(compareVersions(a, b)).toBe(-1);
    });

    it('should return 1 when a > b (major)', () => {
      const a: Version = { major: 16, minor: 0, patch: 0 };
      const b: Version = { major: 15, minor: 5, patch: 32 };

      expect(compareVersions(a, b)).toBe(1);
    });

    it('should return -1 when a < b (minor)', () => {
      const a: Version = { major: 14, minor: 4, patch: 10 };
      const b: Version = { major: 14, minor: 5, patch: 10 };

      expect(compareVersions(a, b)).toBe(-1);
    });

    it('should return 1 when a > b (minor)', () => {
      const a: Version = { major: 14, minor: 6, patch: 0 };
      const b: Version = { major: 14, minor: 5, patch: 99 };

      expect(compareVersions(a, b)).toBe(1);
    });

    it('should return -1 when a < b (patch)', () => {
      const a: Version = { major: 14, minor: 5, patch: 9 };
      const b: Version = { major: 14, minor: 5, patch: 10 };

      expect(compareVersions(a, b)).toBe(-1);
    });

    it('should return 1 when a > b (patch)', () => {
      const a: Version = { major: 14, minor: 5, patch: 11 };
      const b: Version = { major: 14, minor: 5, patch: 10 };

      expect(compareVersions(a, b)).toBe(1);
    });
  });

  describe('isVersionAtLeast', () => {
    it('should return true when current equals minimum', () => {
      const current: Version = { major: 14, minor: 5, patch: 10 };
      const minimum: Version = { major: 14, minor: 5, patch: 10 };

      expect(isVersionAtLeast(current, minimum)).toBe(true);
    });

    it('should return true when current is greater', () => {
      const current: Version = { major: 15, minor: 0, patch: 0 };
      const minimum: Version = { major: 14, minor: 5, patch: 10 };

      expect(isVersionAtLeast(current, minimum)).toBe(true);
    });

    it('should return false when current is less', () => {
      const current: Version = { major: 14, minor: 4, patch: 0 };
      const minimum: Version = { major: 14, minor: 5, patch: 10 };

      expect(isVersionAtLeast(current, minimum)).toBe(false);
    });
  });

  describe('isVersionLessThan', () => {
    it('should return false when current equals maximum', () => {
      const current: Version = { major: 15, minor: 0, patch: 0 };
      const maximum: Version = { major: 15, minor: 0, patch: 0 };

      expect(isVersionLessThan(current, maximum)).toBe(false);
    });

    it('should return true when current is less', () => {
      const current: Version = { major: 14, minor: 5, patch: 10 };
      const maximum: Version = { major: 15, minor: 0, patch: 0 };

      expect(isVersionLessThan(current, maximum)).toBe(true);
    });

    it('should return false when current is greater', () => {
      const current: Version = { major: 16, minor: 0, patch: 0 };
      const maximum: Version = { major: 15, minor: 0, patch: 0 };

      expect(isVersionLessThan(current, maximum)).toBe(false);
    });
  });

  describe('isVersionInRange', () => {
    it('should return true when version is in range [min, max)', () => {
      const current: Version = { major: 14, minor: 5, patch: 10 };
      const min: Version = { major: 14, minor: 0, patch: 0 };
      const max: Version = { major: 15, minor: 0, patch: 0 };

      expect(isVersionInRange(current, min, max)).toBe(true);
    });

    it('should return true when version equals min', () => {
      const current: Version = { major: 14, minor: 0, patch: 0 };
      const min: Version = { major: 14, minor: 0, patch: 0 };
      const max: Version = { major: 15, minor: 0, patch: 0 };

      expect(isVersionInRange(current, min, max)).toBe(true);
    });

    it('should return false when version equals max (exclusive)', () => {
      const current: Version = { major: 15, minor: 0, patch: 0 };
      const min: Version = { major: 14, minor: 0, patch: 0 };
      const max: Version = { major: 15, minor: 0, patch: 0 };

      expect(isVersionInRange(current, min, max)).toBe(false);
    });

    it('should return false when version is below min', () => {
      const current: Version = { major: 13, minor: 0, patch: 0 };
      const min: Version = { major: 14, minor: 0, patch: 0 };
      const max: Version = { major: 15, minor: 0, patch: 0 };

      expect(isVersionInRange(current, min, max)).toBe(false);
    });

    it('should return true when max is undefined (no upper bound)', () => {
      const current: Version = { major: 20, minor: 0, patch: 0 };
      const min: Version = { major: 16, minor: 0, patch: 0 };

      expect(isVersionInRange(current, min)).toBe(true);
    });
  });

  describe('getMajorVersion', () => {
    it('should return major version number', () => {
      expect(getMajorVersion({ major: 14, minor: 5, patch: 10 })).toBe(14);
      expect(getMajorVersion({ major: 15, minor: 0, patch: 0 })).toBe(15);
      expect(getMajorVersion({ major: 16, minor: 0, patch: 8 })).toBe(16);
    });
  });

  describe('VersionParseError', () => {
    it('should have correct message', () => {
      const error = new VersionParseError({ input: 'invalid' });

      expect(error.message).toContain('invalid');
      expect(error.message).toContain('Invalid version format');
      expect(error._tag).toBe('VersionParseError');
    });

    it('should store version string', () => {
      const error = new VersionParseError({ input: '1.2' });

      expect(error.input).toBe('1.2');
    });
  });

  describe('UnsupportedVersionError', () => {
    it('should have correct message', () => {
      const error = new UnsupportedVersionError({
        version: '13.0.0',
      });

      expect(error.message).toContain('13.0.0');
      expect(error.message).toContain('not supported');
      expect(error._tag).toBe('UnsupportedVersionError');
    });

    it('should store version', () => {
      const version = '13.0.0';
      const error = new UnsupportedVersionError({ version });

      expect(error.version).toBe(version);
    });
  });

  describe('SUPPORTED_VERSIONS', () => {
    it('should contain expected versions', () => {
      expect(SUPPORTED_VERSIONS).toContain('14.5.10');
      expect(SUPPORTED_VERSIONS).toContain('15.5.32');
      expect(SUPPORTED_VERSIONS).toContain('16.0.8');
    });

    it('should be readonly array', () => {
      expect(Array.isArray(SUPPORTED_VERSIONS)).toBe(true);
      expect(SUPPORTED_VERSIONS.length).toBeGreaterThan(0);
    });
  });
});
