/**
 * REDCap error types
 *
 * Tagged errors for type-safe error handling with Effect.
 */

export { CrfHttpError, fromResponse } from './http.js';

export { CrfApiError, parseApiError, isApiErrorResponse } from './api.js';

export { CrfNetworkError, fromException } from './network.js';

export { VersionParseError, UnsupportedVersionError } from './version.js';

/** Union of all REDCap client errors */
export type CrfClientError =
  | import('./http.js').CrfHttpError
  | import('./api.js').CrfApiError
  | import('./network.js').CrfNetworkError;

/** Union of all REDCap errors */
export type CrfError =
  | CrfClientError
  | import('./version.js').VersionParseError
  | import('./version.js').UnsupportedVersionError;
