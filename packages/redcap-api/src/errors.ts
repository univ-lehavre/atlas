import { Data } from 'effect';

/**
 * REDCap HTTP error (non-2xx response)
 */
export class RedcapHttpError extends Data.TaggedError('RedcapHttpError')<{
  readonly status: number;
  readonly message: string;
}> {}

/**
 * REDCap API error (200 response with error in body)
 */
export class RedcapApiError extends Data.TaggedError('RedcapApiError')<{
  readonly message: string;
}> {}

/**
 * Network or fetch error
 */
export class RedcapNetworkError extends Data.TaggedError('RedcapNetworkError')<{
  readonly cause: unknown;
}> {}

/**
 * Union of all REDCap errors
 */
export type RedcapError = RedcapHttpError | RedcapApiError | RedcapNetworkError;
