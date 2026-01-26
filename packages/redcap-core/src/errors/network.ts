/**
 * REDCap network errors
 *
 * Transport-level errors (DNS, timeouts, TLS, etc.).
 */

import { Data } from 'effect';

/** Network/transport error */
export class RedcapNetworkError extends Data.TaggedError('RedcapNetworkError')<{
  readonly cause: unknown;
  readonly url?: string;
}> {
  override get message(): string {
    const causeMsg = this.cause instanceof Error ? this.cause.message : String(this.cause);
    return `Network error${this.url ? ` at ${this.url}` : ''}: ${causeMsg}`;
  }

  /** Check if this is a timeout error */
  get isTimeout(): boolean {
    if (this.cause instanceof Error) {
      return (
        this.cause.name === 'TimeoutError' ||
        this.cause.message.toLowerCase().includes('timeout') ||
        this.cause.message.toLowerCase().includes('timed out')
      );
    }
    return false;
  }

  /** Check if this is a DNS error */
  get isDnsError(): boolean {
    if (this.cause instanceof Error) {
      return (
        this.cause.message.toLowerCase().includes('getaddrinfo') ||
        this.cause.message.toLowerCase().includes('dns') ||
        this.cause.message.toLowerCase().includes('enotfound')
      );
    }
    return false;
  }

  /** Check if this is a connection refused error */
  get isConnectionRefused(): boolean {
    if (this.cause instanceof Error) {
      return (
        this.cause.message.toLowerCase().includes('econnrefused') ||
        this.cause.message.toLowerCase().includes('connection refused')
      );
    }
    return false;
  }

  /** Check if this error is retryable */
  get isRetryable(): boolean {
    return this.isTimeout || this.isConnectionRefused;
  }
}

/** Create a network error from an exception */
export const fromException = (error: unknown, url?: string): RedcapNetworkError =>
  new RedcapNetworkError({ cause: error, url });
