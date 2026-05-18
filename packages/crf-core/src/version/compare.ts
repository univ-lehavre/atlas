/**
 * Pure version comparison functions
 */

import type { Version, VersionRange } from './types.js';

/**
 * Format a Version object as a string
 *
 * @example
 * ```ts
 * formatVersion({ major: 14, minor: 5, patch: 10 })
 * // "14.5.10"
 * ```
 */
export const formatVersion = (version: Version): string =>
  `${version.major}.${version.minor}.${version.patch}`;

/**
 * Compare two versions
 *
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
export const compareVersions = (a: Version, b: Version): -1 | 0 | 1 => {
  if (a.major !== b.major) {
    return a.major < b.major ? -1 : 1;
  }
  if (a.minor !== b.minor) {
    return a.minor < b.minor ? -1 : 1;
  }
  if (a.patch !== b.patch) {
    return a.patch < b.patch ? -1 : 1;
  }
  return 0;
};

/**
 * Check if two versions are equal
 */
export const versionsEqual = (a: Version, b: Version): boolean => compareVersions(a, b) === 0;

/**
 * Check if current version is at least the minimum version
 *
 * @example
 * ```ts
 * isVersionAtLeast({ major: 15, minor: 0, patch: 0 }, { major: 14, minor: 5, patch: 10 })
 * // true
 * ```
 */
export const isVersionAtLeast = (current: Version, minimum: Version): boolean =>
  compareVersions(current, minimum) >= 0;

/**
 * Check if current version is less than the maximum version
 */
export const isVersionLessThan = (current: Version, maximum: Version): boolean =>
  compareVersions(current, maximum) < 0;

/**
 * Check if current version is at most the maximum version
 */
export const isVersionAtMost = (current: Version, maximum: Version): boolean =>
  compareVersions(current, maximum) <= 0;

/**
 * Check if current version is within the specified range [min, max)
 *
 * min is inclusive, max is exclusive
 *
 * @example
 * ```ts
 * isVersionInRange(
 *   { major: 15, minor: 0, patch: 0 },
 *   { major: 14, minor: 0, patch: 0 },
 *   { major: 16, minor: 0, patch: 0 }
 * )
 * // true (14 <= 15 < 16)
 *
 * isVersionInRange(
 *   { major: 16, minor: 0, patch: 0 },
 *   { major: 14, minor: 0, patch: 0 },
 *   { major: 16, minor: 0, patch: 0 }
 * )
 * // false (16 is not < 16)
 * ```
 */
export const isVersionInRange = (current: Version, min: Version, max?: Version): boolean => {
  if (!isVersionAtLeast(current, min)) {
    return false;
  }
  if (max && !isVersionLessThan(current, max)) {
    return false;
  }
  return true;
};

/**
 * Check if current version matches a version range
 */
export const matchesVersionRange = (current: Version, range: VersionRange): boolean =>
  isVersionInRange(current, range.min, range.max);

/**
 * Get the major version number
 */
export const getMajorVersion = (version: Version): number => version.major;

/**
 * Get the minor version number
 */
export const getMinorVersion = (version: Version): number => version.minor;

/**
 * Create a version object
 */
export const createVersion = (major: number, minor: number, patch: number): Version => ({
  major,
  minor,
  patch,
});
