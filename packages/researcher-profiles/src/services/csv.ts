/**
 * CSV parsing service.
 */

import { parse } from "csv-parse/sync";
import { Effect } from "effect";
import { CsvParseError } from "../errors.js";
import type { ResearcherRow } from "../types.js";

/**
 * Parses CSV content into ResearcherRow records.
 * Expects columns: userid, last_name, middle_name, first_name, orcid
 */
export const parseCsv = (
  content: string,
): Effect.Effect<readonly ResearcherRow[], CsvParseError> =>
  Effect.try({
    try: () =>
      parse(content, {
        columns: true,
        trim: true,
        skip_empty_lines: true,
      }),
    catch: (cause) => new CsvParseError({ cause }),
  });
