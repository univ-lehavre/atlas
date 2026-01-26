/**
 * REDCap HTTP errors
 *
 * Errors related to HTTP communication with REDCap server.
 */

import { Data } from 'effect';

/** HTTP error response from REDCap */
export class RedcapHttpError extends Data.TaggedError('RedcapHttpError')<{
  readonly status: number;
  readonly statusText: string;
  readonly body?: string;
  readonly url?: string;
}> {
  override get message(): string {
    return `HTTP ${this.status} ${this.statusText}${this.url ? ` at ${this.url}` : ''}`;
  }

  /** Check if this is an authentication error */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** Check if this is a rate limit error */
  get isRateLimitError(): boolean {
    return this.status === 429;
  }

  /** Check if this is a server error */
  get isServerError(): boolean {
    return this.status >= 500;
  }

  /** Check if this error is retryable */
  get isRetryable(): boolean {
    return this.isRateLimitError || this.isServerError;
  }
}

/** Create an HTTP error from a fetch Response */
export const fromResponse = async (response: Response, url?: string): Promise<RedcapHttpError> => {
  const body = await response.text().catch(() => undefined);
  return new RedcapHttpError({
    status: response.status,
    statusText: response.statusText,
    body,
    url,
  });
};
