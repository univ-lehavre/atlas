/**
 * REDCap service for researcher profiles.
 */

import {
  createRedcapClient,
  RedcapUrl,
  RedcapToken,
} from "@univ-lehavre/atlas-crf/redcap";
import type {
  AuthorsResult,
  WorksResult,
} from "@univ-lehavre/atlas-openalex-types";
import { Effect } from "effect";
import { RedcapFetchError, RedcapWriteError } from "../errors.js";
import type { ResearcherRow } from "../types.js";

export interface RedcapConnectionConfig {
  readonly url: string;
  readonly token: string;
}

/**
 * Creates a REDCap client from connection config.
 */
const normalizeUrl = (url: string): string =>
  url.endsWith("/") ? url : `${url}/`;

const makeClient = (
  config: RedcapConnectionConfig,
): ReturnType<typeof createRedcapClient> =>
  createRedcapClient({
    url: RedcapUrl(normalizeUrl(config.url)),
    token: RedcapToken(config.token),
  });

/**
 * Fetches all researchers from the `references_openalex` REDCap instrument.
 * Maps `record_id` to `userid`.
 */
export const fetchResearchers = (
  config: RedcapConnectionConfig,
): Effect.Effect<readonly ResearcherRow[], RedcapFetchError> => {
  const client = makeClient(config);
  return client
    .exportRecords<Record<string, string>>({
      fields: [
        "userid",
        "last_name",
        "middle_name",
        "first_name",
        "orcid",
        "oa_author_ids_imported_date",
      ],
    })
    .pipe(
      Effect.map((records) =>
        records.map((r) => ({
          userid: r["userid"] ?? "",
          last_name: r["last_name"] ?? "",
          middle_name: r["middle_name"] ?? "",
          first_name: r["first_name"] ?? "",
          orcid: r["orcid"] ?? "",
          oa_author_ids_imported_date: r["oa_author_ids_imported_date"] ?? "",
        })),
      ),
      Effect.mapError((cause) => new RedcapFetchError({ cause })),
    );
};

/**
 * Writes selected OpenAlex author IDs to the `researcher_oa_ids` field for a given userid.
 */
const localIsoDateTime = (): string => {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
};

export const writeOaAuthorIds = (
  config: RedcapConnectionConfig,
  userid: string,
  authors: readonly AuthorsResult[],
): Effect.Effect<void, RedcapWriteError> => {
  const client = makeClient(config);
  return client
    .importRecords(
      [
        {
          userid,
          researcher_oa_ids: JSON.stringify(authors.map((a) => a.id)),
          oa_author_ids_imported_date: localIsoDateTime(),
        },
      ],
      { overwriteBehavior: "overwrite" },
    )
    .pipe(
      Effect.asVoid,
      Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
    );
};

/**
 * Writes OpenAlex works JSON to the `oa_references` field for a given userid.
 */
export const writeOaReferences = (
  config: RedcapConnectionConfig,
  userid: string,
  works: readonly WorksResult[],
): Effect.Effect<void, RedcapWriteError> => {
  const client = makeClient(config);
  return client
    .importRecords([{ userid, oa_references: JSON.stringify(works) }], {
      overwriteBehavior: "overwrite",
    })
    .pipe(
      Effect.asVoid,
      Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
    );
};
