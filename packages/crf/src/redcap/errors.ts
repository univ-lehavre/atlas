/**
 * @module errors
 * @description Error types for REDCap API client.
 *
 * Re-exports from @univ-lehavre/atlas-redcap-core.
 */

// Re-export error types from redcap-core
export {
  RedcapHttpError,
  fromResponse,
  RedcapApiError,
  parseApiError,
  isApiErrorResponse,
  RedcapNetworkError,
  fromException,
  VersionParseError,
  UnsupportedVersionError,
} from '@univ-lehavre/atlas-redcap-core/errors';

// Re-export union types
export type { RedcapClientError, RedcapError } from '@univ-lehavre/atlas-redcap-core/errors';
