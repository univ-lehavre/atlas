/**
 * Adapter selection
 */

import { Option } from 'effect';
import type { Version } from '../version/types.js';
import { isVersionInRange } from '../version/compare.js';
import type { RedcapAdapter } from './types.js';
import { v14Adapter } from './v14.js';
import { v15Adapter } from './v15.js';
import { v16Adapter } from './v16.js';

/** All available adapters, ordered by version (newest first) */
export const ADAPTERS: readonly RedcapAdapter[] = [v16Adapter, v15Adapter, v14Adapter];

/**
 * Select the appropriate adapter for a version
 *
 * @example
 * ```ts
 * const adapter = selectAdapter({ major: 15, minor: 5, patch: 0 });
 * // Option.some(v15Adapter)
 * ```
 */
export const selectAdapter = (version: Version): Option.Option<RedcapAdapter> => {
  for (const adapter of ADAPTERS) {
    if (isVersionInRange(version, adapter.minVersion, adapter.maxVersion)) {
      return Option.some(adapter);
    }
  }
  return Option.none();
};

/**
 * Get adapter by name
 *
 * @example
 * ```ts
 * const adapter = getAdapterByName('v15');
 * // Option.some(v15Adapter)
 * ```
 */
export const getAdapterByName = (name: string): Option.Option<RedcapAdapter> => {
  const adapter = ADAPTERS.find((a) => a.name === name);
  return adapter ? Option.some(adapter) : Option.none();
};

/**
 * Get the latest adapter (for newest version)
 */
export const getLatestAdapter = (): RedcapAdapter => v16Adapter;

/**
 * Check if a version is supported by any adapter
 */
export const isVersionSupported = (version: Version): boolean =>
  Option.isSome(selectAdapter(version));
