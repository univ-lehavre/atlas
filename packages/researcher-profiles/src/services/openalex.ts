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

export interface OpenAlexQuota {
  readonly limit: number;
  readonly remaining: number;
  readonly creditsUsed: number;
  readonly resetInSeconds: number;
}

const deduplicateById = <T extends { id: string }>(
  items: readonly T[],
): readonly T[] =>
  items.filter(
    (item, index) => items.findIndex((i) => i.id === item.id) === index,
  );

/**
 * Fetches current OpenAlex API quota via a minimal HEAD-like request.
 * Requires an apiKey to get personalized quota headers.
 */
const parseQuotaHeaders = (headers: Headers): OpenAlexQuota => ({
  limit: Number(headers.get("x-ratelimit-limit") ?? "0"),
  remaining: Number(headers.get("x-ratelimit-remaining") ?? "0"),
  creditsUsed: Number(headers.get("x-ratelimit-credits-used") ?? "0"),
  resetInSeconds: Number(headers.get("x-ratelimit-reset") ?? "0"),
});

/**
 * Fetches current OpenAlex API quota via a minimal request.
 * Requires an apiKey to get personalized quota headers.
 */
// A DOI lookup costs 0 credits (vs 1 credit for a search), making it ideal for quota probing.
const QUOTA_PROBE_URL =
  "https://api.openalex.org/works/https://doi.org/10.1038/s41586-020-2649-2";

export const fetchQuota = (
  config: OpenAlexConfig,
): Promise<OpenAlexQuota | null> =>
  config.apiKey === undefined
    ? Promise.resolve(null)
    : fetch(`${QUOTA_PROBE_URL}?api_key=${config.apiKey}`, {
        headers: { "User-Agent": config.userAgent },
      }).then((r) => parseQuotaHeaders(r.headers));

/**
 * Resolves unique OpenAlex author profiles for a researcher.
 * Searches by name (with and without middle name) and by ORCID if present.
 */
export const resolveAuthors = (
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
export const fetchWorksForAuthors = (
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
