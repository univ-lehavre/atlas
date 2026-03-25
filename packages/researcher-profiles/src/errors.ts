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

export class OpenAlexSearchError extends Data.TaggedError(
  "OpenAlexSearchError",
)<{
  readonly researcher: string;
  readonly cause: unknown;
}> {}

export class RedcapWriteError extends Data.TaggedError("RedcapWriteError")<{
  readonly userid: string;
  readonly cause: unknown;
}> {}

export class RedcapFetchError extends Data.TaggedError("RedcapFetchError")<{
  readonly cause: unknown;
}> {}
