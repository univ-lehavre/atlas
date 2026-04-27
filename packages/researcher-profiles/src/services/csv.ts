/**
 * CSV parsing service.
 */

import { parse } from "csv-parse/sync";
import { Effect } from "effect";
import { CsvParseError } from "../errors.js";
import type { ResearcherRow } from "../types.js";

const REQUIRED_COLUMNS = [
  "userid",
  "last_name",
  "middle_name",
  "first_name",
  "orcid",
] as const;

const asCell = (value: unknown): string =>
  typeof value === "string" ? value : "";

const ensureRequiredColumns = (
  records: readonly Record<string, string>[],
): Effect.Effect<readonly ResearcherRow[], CsvParseError> => {
  const first = records[0];
  const missing =
    first === undefined
      ? []
      : REQUIRED_COLUMNS.filter((column) => !(column in first));

  return missing.length > 0
    ? Effect.fail(
        new CsvParseError({
          cause: new Error(
            `Missing required CSV columns: ${missing.join(", ")}`,
          ),
        }),
      )
    : Effect.succeed(
        records.map((record) => ({
          userid: asCell(record["userid"]),
          last_name: asCell(record["last_name"]),
          middle_name: asCell(record["middle_name"]),
          first_name: asCell(record["first_name"]),
          orcid: asCell(record["orcid"]),
          oa_imported_at: asCell(record["oa_imported_at"]),
          oa_locked_at: asCell(record["oa_locked_at"]),
          openalex_complete: asCell(record["openalex_complete"]),
        })),
      );
};

/**
 * Parses CSV content into ResearcherRow records.
 * Expects columns: userid, last_name, middle_name, first_name, orcid
 */
export const parseCsv = (
  content: string,
): Effect.Effect<readonly ResearcherRow[], CsvParseError> =>
  Effect.try({
    try: () => {
      const records = parse(content, {
        columns: true,
        trim: true,
        skip_empty_lines: true,
      });
      return records as Record<string, string>[];
    },
    catch: (cause) => new CsvParseError({ cause }),
  }).pipe(Effect.flatMap(ensureRequiredColumns));
