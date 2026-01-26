/**
 * @module version
 * @description REDCap version parsing, comparison, and validation utilities.
 *
 * Re-exports from @univ-lehavre/atlas-redcap-core.
 */

// Re-export types from redcap-core version module
export type { Version, VersionRange } from '@univ-lehavre/atlas-redcap-core/version';

// Re-export parsing functions
export {
  VERSION_PATTERN,
  parseVersion,
  tryParseVersion,
} from '@univ-lehavre/atlas-redcap-core/version';

// Re-export comparison functions
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
} from '@univ-lehavre/atlas-redcap-core/version';

// Re-export supported version constants
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
} from '@univ-lehavre/atlas-redcap-core/version';

// Re-export version errors (also available from errors module)
export { VersionParseError, UnsupportedVersionError } from '@univ-lehavre/atlas-redcap-core/errors';

// Backward compatibility aliases
export { LATEST_KNOWN_VERSION as MAX_SUPPORTED_VERSION } from '@univ-lehavre/atlas-redcap-core/version';

/**
 * Type alias for version strings in SUPPORTED_VERSIONS.
 * Since SUPPORTED_VERSIONS is typed as readonly string[], this is effectively string.
 */
export type SupportedVersionString = string;
