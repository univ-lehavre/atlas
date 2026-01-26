/**
 * REDCap API errors
 *
 * Application-level errors returned by REDCap API (HTTP 200 with error body).
 */

import { Data } from 'effect';

/** API error response from REDCap */
export class RedcapApiError extends Data.TaggedError('RedcapApiError')<{
  readonly error: string;
  readonly code?: string;
}> {
  override get message(): string {
    return this.code ? `[${this.code}] ${this.error}` : this.error;
  }

  /** Check if this is an invalid token error */
  get isInvalidToken(): boolean {
    return (
      this.error.toLowerCase().includes('invalid token') ||
      this.error.toLowerCase().includes('api token')
    );
  }

  /** Check if this is a permission error */
  get isPermissionError(): boolean {
    return (
      this.error.toLowerCase().includes('permission') ||
      this.error.toLowerCase().includes('not authorized') ||
      this.error.toLowerCase().includes('access denied')
    );
  }

  /** Check if this is a validation error */
  get isValidationError(): boolean {
    return (
      this.error.toLowerCase().includes('invalid') ||
      this.error.toLowerCase().includes('required') ||
      this.error.toLowerCase().includes('must be')
    );
  }
}

/** Parse an API error response */
export const parseApiError = (response: unknown): RedcapApiError | null => {
  if (typeof response === 'object' && response !== null && 'error' in response) {
    const errorObj = response as { error: string; code?: string };
    return new RedcapApiError({
      error: String(errorObj.error),
      code: errorObj.code ? String(errorObj.code) : undefined,
    });
  }
  return null;
};

/** Check if a response is an API error */
export const isApiErrorResponse = (response: unknown): boolean => {
  return typeof response === 'object' && response !== null && 'error' in response;
};
