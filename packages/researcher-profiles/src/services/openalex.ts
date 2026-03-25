/**
 * OpenAlex resolution service.
 * Resolves a researcher to their OpenAlex authors and works.
 */

import {
  searchAuthorsByName,
  searchAuthorsByORCID,
  searchWorksByAuthorIDs,
} from "@univ-lehavre/atlas-fetch-openalex";
import type { OpenAlexConfig } from "@univ-lehavre/atlas-fetch-openalex";
import type {
  AuthorsResult,
  WorksResult,
} from "@univ-lehavre/atlas-openalex-types";
import { Effect } from "effect";
import { OpenAlexSearchError } from "../errors.js";
import type { ResearcherRow } from "../types.js";

export interface ResolveResult {
  readonly authors: readonly AuthorsResult[];
  readonly works: readonly WorksResult[];
}

const deduplicateById = <T extends { id: string }>(
  items: readonly T[],
): readonly T[] =>
  items.filter(
    (item, index) => items.findIndex((i) => i.id === item.id) === index,
  );

/**
 * Resolves unique OpenAlex author profiles for a researcher.
 * Searches by name (with and without middle name) and by ORCID if present.
 */
const resolveAuthors = (
  row: ResearcherRow,
  config: OpenAlexConfig,
): Effect.Effect<readonly AuthorsResult[], OpenAlexSearchError> => {
  const researcher = `${row.first_name} ${row.last_name}`;
  const names =
    row.middle_name === ""
      ? [`${row.first_name} ${row.last_name}`]
      : [
          `${row.first_name} ${row.last_name}`,
          `${row.first_name} ${row.middle_name} ${row.last_name}`,
        ];

  const byName: Effect.Effect<readonly AuthorsResult[], OpenAlexSearchError> =
    searchAuthorsByName(names, config).pipe(
      Effect.mapError(
        (cause) => new OpenAlexSearchError({ researcher, cause }),
      ),
    );

  const byOrcid: Effect.Effect<readonly AuthorsResult[], OpenAlexSearchError> =
    row.orcid === ""
      ? Effect.succeed([])
      : searchAuthorsByORCID([row.orcid], config).pipe(
          Effect.mapError(
            (cause) => new OpenAlexSearchError({ researcher, cause }),
          ),
        );

  return Effect.all([byName, byOrcid], { concurrency: 1 }).pipe(
    Effect.map(([nameResults, orcidResults]) =>
      deduplicateById([...nameResults, ...orcidResults]),
    ),
  );
};

/**
 * Fetches and deduplicates works for a list of OpenAlex authors.
 */
const fetchWorksForAuthors = (
  authors: readonly AuthorsResult[],
  config: OpenAlexConfig,
  researcher: string,
): Effect.Effect<readonly WorksResult[], OpenAlexSearchError> =>
  authors.length === 0
    ? Effect.succeed([])
    : searchWorksByAuthorIDs(
        authors.map((a) => a.id),
        config,
      ).pipe(
        Effect.map((works) => deduplicateById([...works])),
        Effect.mapError(
          (cause) => new OpenAlexSearchError({ researcher, cause }),
        ),
      );

/**
 * Resolves authors and their deduplicated works for a researcher row.
 */
export const resolveAll = (
  row: ResearcherRow,
  config: OpenAlexConfig,
): Effect.Effect<ResolveResult, OpenAlexSearchError> =>
  resolveAuthors(row, config).pipe(
    Effect.flatMap((authors) =>
      fetchWorksForAuthors(
        authors,
        config,
        `${row.first_name} ${row.last_name}`,
      ).pipe(Effect.map((works) => ({ authors, works }))),
    ),
  );
