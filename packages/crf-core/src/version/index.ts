/**
 * REDCap version utilities
 *
 * Functions for parsing, comparing, and managing REDCap versions.
 */

export type { Version, VersionRange } from './types.js';

export { VERSION_PATTERN, parseVersion, tryParseVersion } from './parse.js';

export {
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

export {
  SUPPORTED_VERSIONS,
  MIN_SUPPORTED_VERSION,
  LATEST_KNOWN_VERSION,
  PROJECT_SETTINGS_MIN_VERSION,
  FILE_INFO_MIN_VERSION,
  PROJECT_XML_MIN_VERSION,
  REPEATING_INSTRUMENTS_MIN_VERSION,
  DAG_MIN_VERSION,
  FILE_REPOSITORY_MIN_VERSION,
} from './supported.js';
