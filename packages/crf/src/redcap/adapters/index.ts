/**
 * @module adapters
 * @description REDCap version adapter registry and selection.
 */
import { Effect, Option, pipe } from 'effect';
import {
  isVersionInRange,
  type Version,
  UnsupportedVersionError,
  formatVersion,
} from '../version.js';
import type { RedcapAdapter } from './types.js';
import { v14Adapter } from './v14.js';
import { v15Adapter } from './v15.js';
import { v16Adapter } from './v16.js';

// Re-export types
export type { RedcapAdapter, RedcapFeatures, TransformedParams } from './types.js';
export { createBaseAdapter, extendAdapter } from './base.js';

/**
 * Registry of all available adapters, ordered by version.
 * Adapters should be ordered from oldest to newest.
 */
const adapters: readonly RedcapAdapter[] = [v14Adapter, v15Adapter, v16Adapter];

/**
 * Find an adapter for a specific version (returns Option).
 */
const findAdapter = (version: Version): Option.Option<RedcapAdapter> =>
  Option.fromNullable(adapters.find((a) => isVersionInRange(version, a.minVersion, a.maxVersion)));

/**
 * Get the adapter for a specific REDCap version as an Effect.
 *
 * @param version - The REDCap server version
 * @returns Effect containing the adapter or UnsupportedVersionError
 *
 * @example
 * ```typescript
 * const adapter = yield* getAdapterEffect({ major: 14, minor: 5, patch: 10 });
 * // Returns v14Adapter
 * ```
 */
export const getAdapterEffect = (
  version: Version
): Effect.Effect<RedcapAdapter, UnsupportedVersionError> =>
  pipe(
    findAdapter(version),
    Effect.mapError(() => new UnsupportedVersionError({ version }))
  );

/**
 * Get the adapter for a specific REDCap version.
 * Prefer using getAdapterEffect for better error handling.
 *
 * @param version - The REDCap server version
 * @returns The appropriate adapter for that version, or undefined if not found
 */
export const getAdapter = (version: Version): RedcapAdapter | undefined =>
  Option.getOrUndefined(findAdapter(version));

/**
 * Get all supported version ranges.
 *
 * @returns Array of version range descriptions
 */
export const getSupportedVersionRanges = (): readonly string[] =>
  adapters.map((a) => {
    const min = formatVersion(a.minVersion);
    const max = a.maxVersion === undefined ? 'latest' : formatVersion(a.maxVersion);
    return `${a.name}: ${min} - ${max}`;
  });

/**
 * Check if a version is supported.
 *
 * @param version - The version to check
 * @returns true if the version is supported
 */
export const isVersionSupported = (version: Version): boolean =>
  adapters.some((a) => isVersionInRange(version, a.minVersion, a.maxVersion));

/**
 * Get the minimum supported version.
 *
 * @returns Option containing the minimum supported version
 */
export const getMinSupportedVersion = (): Option.Option<Version> =>
  pipe(
    Option.fromNullable(adapters[0]),
    Option.map((a) => a.minVersion)
  );

/**
 * Get the latest adapter (for the newest supported version).
 *
 * @returns Option containing the adapter for the latest version
 */
export const getLatestAdapter = (): Option.Option<RedcapAdapter> =>
  Option.fromNullable(adapters.at(-1));
