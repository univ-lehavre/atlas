/**
 * @module errors
 * @description Error types for REDCap API client.
 *
 * Re-exports from @univ-lehavre/atlas-crf-core.
 */

// Re-export error types from redcap-core
export {
  CrfHttpError,
  fromResponse,
  CrfApiError,
  parseApiError,
  isApiErrorResponse,
  CrfNetworkError,
  fromException,
  VersionParseError,
  UnsupportedVersionError,
} from '@univ-lehavre/atlas-crf-core/errors';

// Re-export union types
export type { CrfClientError, CrfError } from '@univ-lehavre/atlas-crf-core/errors';
