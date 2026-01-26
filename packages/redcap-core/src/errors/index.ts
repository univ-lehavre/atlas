/**
 * REDCap error types
 *
 * Tagged errors for type-safe error handling with Effect.
 */

export { RedcapHttpError, fromResponse } from './http.js';

export { RedcapApiError, parseApiError, isApiErrorResponse } from './api.js';

export { RedcapNetworkError, fromException } from './network.js';

export { VersionParseError, UnsupportedVersionError } from './version.js';

/** Union of all REDCap client errors */
export type RedcapClientError =
  | import('./http.js').RedcapHttpError
  | import('./api.js').RedcapApiError
  | import('./network.js').RedcapNetworkError;

/** Union of all REDCap errors */
export type RedcapError =
  | RedcapClientError
  | import('./version.js').VersionParseError
  | import('./version.js').UnsupportedVersionError;
