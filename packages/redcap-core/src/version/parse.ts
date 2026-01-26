/**
 * Version parsing with Effect
 */

import { Effect } from 'effect';
import { VersionParseError } from '../errors/version.js';
import type { Version } from './types.js';

/** Version string pattern */
export const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Parse a version string into a Version object
 *
 * @example
 * ```ts
 * const version = yield* parseVersion("14.5.10");
 * // { major: 14, minor: 5, patch: 10 }
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
 * Try to parse a version, returning undefined on failure
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
