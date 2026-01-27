/**
 * HTTP utilities module
 * Shared error classes and response helpers for API endpoints.
 */
export {
  ApplicationError,
  SessionError,
  InvalidJsonBodyError,
  InvalidContentTypeError,
} from './errors';

export { mapErrorToResponse } from './response';
