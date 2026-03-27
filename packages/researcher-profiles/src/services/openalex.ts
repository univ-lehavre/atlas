/**
 * OpenAlex resolution service.
 * Resolves a researcher to their OpenAlex authors and works.
 */

import {
  searchAuthorsByName,
  searchAuthorsByORCID,
  searchWorksByAuthorID,
} from "@univ-lehavre/atlas-fetch-openalex";
import type {
  OpenAlexConfig,
  RateLimitInfo,
} from "@univ-lehavre/atlas-fetch-openalex";
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

export interface ResolveAuthorsResult {
  readonly byName: readonly AuthorsResult[];
  readonly byOrcid: readonly AuthorsResult[];
  readonly unique: readonly AuthorsResult[];
}

export type { RateLimitInfo } from "@univ-lehavre/atlas-fetch-openalex";

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
export const resolveAuthors = (
  row: ResearcherRow,
  config: OpenAlexConfig,
): Effect.Effect<ResolveAuthorsResult, OpenAlexSearchError> => {
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
    Effect.map(([byNameResults, byOrcidResults]) => ({
      byName: byNameResults,
      byOrcid: byOrcidResults,
      unique: deduplicateById([...byNameResults, ...byOrcidResults]),
    })),
  );
};

/**
 * Fetches and deduplicates works for a list of OpenAlex authors, one request per author.
 * Calls onProgress after each author with the current count.
 * Calls onRateLimit with the latest quota info after each page fetched.
 */
export const fetchWorksForAuthors = (
  authors: readonly AuthorsResult[],
  config: OpenAlexConfig,
  researcher: string,
  onProgress?: (
    authorIndex: number,
    authorTotal: number,
    page: number,
    pageTotal: number | null,
  ) => void,
  onRateLimit?: (info: RateLimitInfo) => void,
): Effect.Effect<readonly WorksResult[], OpenAlexSearchError> =>
  authors.length === 0
    ? Effect.succeed([])
    : Effect.reduce(authors, [] as WorksResult[], (acc, author, index) =>
        searchWorksByAuthorID(
          author.id,
          config,
          onRateLimit,
          onProgress === undefined
            ? undefined
            : (page: number, total: number | null) =>
                onProgress(index + 1, authors.length, page, total),
        ).pipe(
          Effect.mapError(
            (cause) => new OpenAlexSearchError({ researcher, cause }),
          ),
          Effect.map(
            (works) => deduplicateById([...acc, ...works]) as WorksResult[],
          ),
        ),
      ).pipe(Effect.map((works) => works as readonly WorksResult[]));

/**
 * Resolves authors and their deduplicated works for a researcher row.
 */
export const resolveAll = (
  row: ResearcherRow,
  config: OpenAlexConfig,
): Effect.Effect<ResolveResult, OpenAlexSearchError> =>
  resolveAuthors(row, config).pipe(
    Effect.flatMap((result) =>
      fetchWorksForAuthors(
        result.unique,
        config,
        `${row.first_name} ${row.last_name}`,
      ).pipe(Effect.map((works) => ({ authors: result.unique, works }))),
    ),
  );
