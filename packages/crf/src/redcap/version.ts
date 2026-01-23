/**
 * @module version
 * @description REDCap version parsing, comparison, and validation utilities.
 */
import { Effect, Data, Option, pipe } from 'effect';

/**
 * Represents a semantic version with major, minor, and patch components.
 */
export interface Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/**
 * Supported REDCap versions that have been tested with this client.
 */
export const SUPPORTED_VERSIONS = ['14.5.10', '15.5.32', '16.0.8'] as const;
export type SupportedVersionString = (typeof SUPPORTED_VERSIONS)[number];

/**
 * Error thrown when a version string cannot be parsed.
 */
export class VersionParseError extends Data.TaggedError('VersionParseError')<{
  readonly versionString: string;
  readonly cause?: unknown;
}> {
  override get message(): string {
    return `Invalid version format: "${this.versionString}". Expected format: "X.Y.Z"`;
  }
}

/**
 * Error thrown when a version is not supported.
 */
export class UnsupportedVersionError extends Data.TaggedError('UnsupportedVersionError')<{
  readonly version: Version;
}> {
  override get message(): string {
    return `REDCap version ${String(this.version.major)}.${String(this.version.minor)}.${String(this.version.patch)} is not supported. Supported major versions: 14, 15, 16`;
  }
}

/**
 * Try to parse a single version part (major, minor, or patch).
 */
const parseVersionPart = (part: string | undefined): Option.Option<number> =>
  pipe(
    Option.fromNullable(part),
    Option.flatMap((str) => {
      const parsed = Number.parseInt(str, 10);
      return Number.isNaN(parsed) || parsed < 0 ? Option.none() : Option.some(parsed);
    })
  );

/**
 * Parse a version string into a Version object.
 *
 * @param versionString - Version string in format "X.Y.Z" (e.g., "14.5.10")
 * @returns Effect containing the parsed Version or a VersionParseError
 *
 * @example
 * ```typescript
 * const version = yield* parseVersion("14.5.10");
 * // { major: 14, minor: 5, patch: 10 }
 * ```
 */
export const parseVersion = (versionString: string): Effect.Effect<Version, VersionParseError> => {
  const trimmed = versionString.trim();
  const parts = trimmed.split('.');

  return parts.length === 3
    ? pipe(
        Effect.all([
          pipe(
            parseVersionPart(parts[0]),
            Effect.mapError(() => new VersionParseError({ versionString }))
          ),
          pipe(
            parseVersionPart(parts[1]),
            Effect.mapError(() => new VersionParseError({ versionString }))
          ),
          pipe(
            parseVersionPart(parts[2]),
            Effect.mapError(() => new VersionParseError({ versionString }))
          ),
        ]),
        Effect.map(([major, minor, patch]) => ({ major, minor, patch }))
      )
    : Effect.fail(new VersionParseError({ versionString }));
};

/**
 * Format a Version object as a string.
 *
 * @param version - The version to format
 * @returns Version string in format "X.Y.Z"
 */
export const formatVersion = (version: Version): string =>
  `${String(version.major)}.${String(version.minor)}.${String(version.patch)}`;

/**
 * Compare two versions.
 *
 * @param a - First version
 * @param b - Second version
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 */
export const compareVersions = (a: Version, b: Version): -1 | 0 | 1 =>
  a.major === b.major
    ? a.minor === b.minor
      ? a.patch === b.patch
        ? 0
        : a.patch < b.patch
          ? -1
          : 1
      : a.minor < b.minor
        ? -1
        : 1
    : a.major < b.major
      ? -1
      : 1;

/**
 * Check if a version is at least the specified minimum.
 *
 * @param current - The version to check
 * @param minimum - The minimum required version
 * @returns true if current >= minimum
 */
export const isVersionAtLeast = (current: Version, minimum: Version): boolean =>
  compareVersions(current, minimum) >= 0;

/**
 * Check if a version is less than the specified maximum.
 *
 * @param current - The version to check
 * @param maximum - The maximum version (exclusive)
 * @returns true if current < maximum
 */
export const isVersionLessThan = (current: Version, maximum: Version): boolean =>
  compareVersions(current, maximum) < 0;

/**
 * Check if a version falls within a range [min, max).
 *
 * @param current - The version to check
 * @param min - Minimum version (inclusive)
 * @param max - Maximum version (exclusive), undefined means no upper bound
 * @returns true if min <= current < max (or min <= current if max is undefined)
 */
export const isVersionInRange = (
  current: Version,
  min: Version,
  max: Version | undefined
): boolean =>
  isVersionAtLeast(current, min) && (max === undefined || isVersionLessThan(current, max));

/**
 * Get the major version number from a Version object.
 *
 * @param version - The version
 * @returns The major version number
 */
export const getMajorVersion = (version: Version): number => version.major;
