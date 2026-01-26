/**
 * @module version/compare.test
 * @description Tests for version comparison utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatVersion,
  compareVersions,
  versionsEqual,
  isVersionAtLeast,
  isVersionLessThan,
  isVersionAtMost,
  isVersionInRange,
  matchesVersionRange,
  getMajorVersion,
  getMinorVersion,
  createVersion,
} from './compare.js';
import type { Version, VersionRange } from './types.js';

describe('formatVersion', () => {
  it('should format version as X.Y.Z', () => {
    expect(formatVersion({ major: 14, minor: 5, patch: 10 })).toBe('14.5.10');
  });

  it('should format version with zeros', () => {
    expect(formatVersion({ major: 0, minor: 0, patch: 0 })).toBe('0.0.0');
    expect(formatVersion({ major: 1, minor: 0, patch: 0 })).toBe('1.0.0');
  });

  it('should format large version numbers', () => {
    expect(formatVersion({ major: 100, minor: 200, patch: 300 })).toBe('100.200.300');
  });
});

describe('compareVersions', () => {
  it('should return 0 for equal versions', () => {
    expect(
      compareVersions({ major: 14, minor: 5, patch: 10 }, { major: 14, minor: 5, patch: 10 })
    ).toBe(0);
    expect(
      compareVersions({ major: 0, minor: 0, patch: 0 }, { major: 0, minor: 0, patch: 0 })
    ).toBe(0);
  });

  it('should compare major versions', () => {
    expect(
      compareVersions({ major: 15, minor: 0, patch: 0 }, { major: 14, minor: 0, patch: 0 })
    ).toBe(1);
    expect(
      compareVersions({ major: 14, minor: 0, patch: 0 }, { major: 15, minor: 0, patch: 0 })
    ).toBe(-1);
  });

  it('should compare minor versions when major is equal', () => {
    expect(
      compareVersions({ major: 14, minor: 6, patch: 0 }, { major: 14, minor: 5, patch: 0 })
    ).toBe(1);
    expect(
      compareVersions({ major: 14, minor: 5, patch: 0 }, { major: 14, minor: 6, patch: 0 })
    ).toBe(-1);
  });

  it('should compare patch versions when major and minor are equal', () => {
    expect(
      compareVersions({ major: 14, minor: 5, patch: 11 }, { major: 14, minor: 5, patch: 10 })
    ).toBe(1);
    expect(
      compareVersions({ major: 14, minor: 5, patch: 10 }, { major: 14, minor: 5, patch: 11 })
    ).toBe(-1);
  });

  it('should prioritize major over minor', () => {
    expect(
      compareVersions({ major: 15, minor: 0, patch: 0 }, { major: 14, minor: 99, patch: 99 })
    ).toBe(1);
  });

  it('should prioritize minor over patch', () => {
    expect(
      compareVersions({ major: 14, minor: 6, patch: 0 }, { major: 14, minor: 5, patch: 99 })
    ).toBe(1);
  });
});

describe('versionsEqual', () => {
  it('should return true for equal versions', () => {
    expect(
      versionsEqual({ major: 14, minor: 5, patch: 10 }, { major: 14, minor: 5, patch: 10 })
    ).toBe(true);
  });

  it('should return false for different versions', () => {
    expect(
      versionsEqual({ major: 14, minor: 5, patch: 10 }, { major: 14, minor: 5, patch: 11 })
    ).toBe(false);
    expect(
      versionsEqual({ major: 14, minor: 5, patch: 10 }, { major: 14, minor: 6, patch: 10 })
    ).toBe(false);
    expect(
      versionsEqual({ major: 14, minor: 5, patch: 10 }, { major: 15, minor: 5, patch: 10 })
    ).toBe(false);
  });
});

describe('isVersionAtLeast', () => {
  it('should return true when current >= minimum', () => {
    expect(
      isVersionAtLeast({ major: 15, minor: 0, patch: 0 }, { major: 14, minor: 0, patch: 0 })
    ).toBe(true);
    expect(
      isVersionAtLeast({ major: 14, minor: 0, patch: 0 }, { major: 14, minor: 0, patch: 0 })
    ).toBe(true);
  });

  it('should return false when current < minimum', () => {
    expect(
      isVersionAtLeast({ major: 13, minor: 0, patch: 0 }, { major: 14, minor: 0, patch: 0 })
    ).toBe(false);
  });
});

describe('isVersionLessThan', () => {
  it('should return true when current < maximum', () => {
    expect(
      isVersionLessThan({ major: 14, minor: 0, patch: 0 }, { major: 15, minor: 0, patch: 0 })
    ).toBe(true);
  });

  it('should return false when current >= maximum', () => {
    expect(
      isVersionLessThan({ major: 15, minor: 0, patch: 0 }, { major: 15, minor: 0, patch: 0 })
    ).toBe(false);
    expect(
      isVersionLessThan({ major: 16, minor: 0, patch: 0 }, { major: 15, minor: 0, patch: 0 })
    ).toBe(false);
  });
});

describe('isVersionAtMost', () => {
  it('should return true when current <= maximum', () => {
    expect(
      isVersionAtMost({ major: 14, minor: 0, patch: 0 }, { major: 15, minor: 0, patch: 0 })
    ).toBe(true);
    expect(
      isVersionAtMost({ major: 15, minor: 0, patch: 0 }, { major: 15, minor: 0, patch: 0 })
    ).toBe(true);
  });

  it('should return false when current > maximum', () => {
    expect(
      isVersionAtMost({ major: 16, minor: 0, patch: 0 }, { major: 15, minor: 0, patch: 0 })
    ).toBe(false);
  });
});

describe('isVersionInRange', () => {
  const min: Version = { major: 14, minor: 0, patch: 0 };
  const max: Version = { major: 16, minor: 0, patch: 0 };

  it('should return true for version at minimum (inclusive)', () => {
    expect(isVersionInRange({ major: 14, minor: 0, patch: 0 }, min, max)).toBe(true);
  });

  it('should return true for version in range', () => {
    expect(isVersionInRange({ major: 15, minor: 0, patch: 0 }, min, max)).toBe(true);
    expect(isVersionInRange({ major: 15, minor: 5, patch: 32 }, min, max)).toBe(true);
  });

  it('should return false for version at maximum (exclusive)', () => {
    expect(isVersionInRange({ major: 16, minor: 0, patch: 0 }, min, max)).toBe(false);
  });

  it('should return false for version below minimum', () => {
    expect(isVersionInRange({ major: 13, minor: 0, patch: 0 }, min, max)).toBe(false);
  });

  it('should return false for version above maximum', () => {
    expect(isVersionInRange({ major: 17, minor: 0, patch: 0 }, min, max)).toBe(false);
  });

  it('should work without max (open-ended range)', () => {
    expect(isVersionInRange({ major: 14, minor: 0, patch: 0 }, min)).toBe(true);
    expect(isVersionInRange({ major: 100, minor: 0, patch: 0 }, min)).toBe(true);
    expect(isVersionInRange({ major: 13, minor: 0, patch: 0 }, min)).toBe(false);
  });
});

describe('matchesVersionRange', () => {
  it('should match version within range', () => {
    const range: VersionRange = {
      min: { major: 14, minor: 0, patch: 0 },
      max: { major: 16, minor: 0, patch: 0 },
    };
    expect(matchesVersionRange({ major: 15, minor: 0, patch: 0 }, range)).toBe(true);
  });

  it('should not match version outside range', () => {
    const range: VersionRange = {
      min: { major: 14, minor: 0, patch: 0 },
      max: { major: 16, minor: 0, patch: 0 },
    };
    expect(matchesVersionRange({ major: 13, minor: 0, patch: 0 }, range)).toBe(false);
  });

  it('should work with open-ended range', () => {
    const range: VersionRange = {
      min: { major: 14, minor: 0, patch: 0 },
    };
    expect(matchesVersionRange({ major: 100, minor: 0, patch: 0 }, range)).toBe(true);
  });
});

describe('getMajorVersion', () => {
  it('should return major version', () => {
    expect(getMajorVersion({ major: 14, minor: 5, patch: 10 })).toBe(14);
  });
});

describe('getMinorVersion', () => {
  it('should return minor version', () => {
    expect(getMinorVersion({ major: 14, minor: 5, patch: 10 })).toBe(5);
  });
});

describe('createVersion', () => {
  it('should create version object', () => {
    const version = createVersion(14, 5, 10);
    expect(version).toEqual({ major: 14, minor: 5, patch: 10 });
  });

  it('should create version with zeros', () => {
    const version = createVersion(0, 0, 0);
    expect(version).toEqual({ major: 0, minor: 0, patch: 0 });
  });
});

describe('integration', () => {
  it('should format and compare REDCap versions', () => {
    const v14 = createVersion(14, 5, 10);
    const v15 = createVersion(15, 5, 32);
    const v16 = createVersion(16, 0, 8);

    expect(formatVersion(v14)).toBe('14.5.10');
    expect(formatVersion(v15)).toBe('15.5.32');
    expect(formatVersion(v16)).toBe('16.0.8');

    expect(compareVersions(v14, v15)).toBe(-1);
    expect(compareVersions(v15, v16)).toBe(-1);
    expect(compareVersions(v16, v14)).toBe(1);
  });

  it('should check version compatibility', () => {
    const minSupported = createVersion(14, 0, 0);
    const current = createVersion(15, 5, 32);

    expect(isVersionAtLeast(current, minSupported)).toBe(true);
    expect(isVersionAtLeast(createVersion(13, 0, 0), minSupported)).toBe(false);
  });
});
