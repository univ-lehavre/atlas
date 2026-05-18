/**
 * Domain errors for researcher-profiles CLI.
 */

import { Data } from "effect";

export class CsvParseError extends Data.TaggedError("CsvParseError")<{
  readonly cause: unknown;
}> {}

export class CsvReadError extends Data.TaggedError("CsvReadError")<{
  readonly path: string;
  readonly cause: unknown;
}> {}

export class CitationSearchError extends Data.TaggedError(
  "CitationSearchError",
)<{
  readonly researcher: string;
  readonly cause: unknown;
}> {}

export class CrfWriteError extends Data.TaggedError("CrfWriteError")<{
  readonly userid: string;
  readonly cause: unknown;
}> {}

export class CrfFetchError extends Data.TaggedError("CrfFetchError")<{
  readonly cause: unknown;
}> {}
