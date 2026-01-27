import { ApplicationError } from '$lib/server/http';

/**
 * Error thrown when OpenAlex API request fails.
 */
export class OpenAlexApiError extends ApplicationError {
  constructor(message = 'OpenAlex API error', opts?: { cause?: string; details?: unknown }) {
    super('openalex_api_error', 502, message, opts);
  }
}

/**
 * Error thrown when OpenAlex response cannot be parsed.
 */
export class OpenAlexParseError extends ApplicationError {
  constructor(
    message = 'Failed to parse OpenAlex response',
    opts?: { cause?: string; details?: unknown }
  ) {
    super('openalex_parse_error', 502, message, opts);
  }
}
