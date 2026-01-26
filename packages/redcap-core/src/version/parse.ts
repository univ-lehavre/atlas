/**
 * @module version/parse
 * @description Version parsing utilities for REDCap version strings.
 *
 * REDCap versions follow semantic versioning (major.minor.patch).
 * This module provides Effect-based and synchronous parsing functions.
 *
 * @example
 * ```typescript
 * import { parseVersion, tryParseVersion } from '@univ-lehavre/atlas-redcap-core/version';
 * import { Effect } from 'effect';
 *
 * // Effect-based parsing (recommended)
 * const program = Effect.gen(function* () {
 *   const version = yield* parseVersion('14.5.10');
 *   console.log(version.major); // 14
 * });
 *
 * // Synchronous parsing
 * const version = tryParseVersion('14.5.10');
 * if (version) {
 *   console.log(version.major); // 14
 * }
 * ```
 */

import { Effect } from 'effect';
import { VersionParseError } from '../errors/version.js';
import type { Version } from './types.js';

/**
 * Regular expression pattern for semantic version strings.
 *
 * Matches X.Y.Z where X, Y, Z are non-negative integers.
 * Captures major, minor, and patch as groups 1, 2, 3.
 */
export const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Parse a version string into a Version object using Effect.
 *
 * Provides type-safe error handling through Effect's error channel.
 * Whitespace is trimmed from the input before parsing.
 *
 * @param input - Version string in "X.Y.Z" format
 * @returns Effect that succeeds with Version or fails with VersionParseError
 *
 * @example
 * ```typescript
 * import { Effect, Either } from 'effect';
 *
 * // In an Effect generator
 * const program = Effect.gen(function* () {
 *   const version = yield* parseVersion('14.5.10');
 *   return version.major >= 14;
 * });
 *
 * // Convert to Either for error handling
 * const either = await Effect.runPromise(Effect.either(parseVersion('invalid')));
 * if (Either.isLeft(either)) {
 *   console.error(either.left.message);
 * }
 * ```
 */
export const parseVersion = (input: string): Effect.Effect<Version, VersionParseError> =>
  Effect.gen(function* () {
    const trimmed = input.trim();
    const match = VERSION_PATTERN.exec(trimmed);

    if (!match?.[1] || !match[2] || !match[3]) {
      return yield* Effect.fail(new VersionParseError({ input }));
    }

    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
    };
  });

/**
 * Try to parse a version string, returning undefined on failure.
 *
 * Synchronous version of parseVersion for cases where Effect
 * is not needed. Whitespace is trimmed from the input.
 *
 * @param input - Version string in "X.Y.Z" format
 * @returns Version object if valid, undefined if invalid
 *
 * @example
 * ```typescript
 * const version = tryParseVersion('14.5.10');
 * if (version) {
 *   console.log(`Major: ${version.major}`); // Major: 14
 * } else {
 *   console.log('Invalid version');
 * }
 * ```
 */
export const tryParseVersion = (input: string): Version | undefined => {
  const trimmed = input.trim();
  const match = VERSION_PATTERN.exec(trimmed);

  if (!match?.[1] || !match[2] || !match[3]) {
    return undefined;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
};
