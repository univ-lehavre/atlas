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
 * Uses two separate exports to avoid REDCap truncating large `notes` fields
 * when mixed with other fields in the same request.
 */
export const fetchResearchers = (
  config: RedcapConnectionConfig,
): Effect.Effect<readonly ResearcherRow[], RedcapFetchError> => {
  const client = makeClient(config);

  const fetchMeta = client
    .exportRecords<Record<string, string>>({
      fields: [
        "userid",
        "last_name",
        "middle_name",
        "first_name",
        "orcid",
        "researcher_oa_ids",
        "oa_author_ids_imported_date",
        "oa_references_imported_at",
        "final_references_imported_at",
      ],
    })
    .pipe(Effect.mapError((cause) => new RedcapFetchError({ cause })));

  const fetchRefs = client
    .exportRecords<Record<string, string>>({
      fields: ["userid", "oa_references"],
    })
    .pipe(Effect.mapError((cause) => new RedcapFetchError({ cause })));

  return Effect.all([fetchMeta, fetchRefs], { concurrency: 1 }).pipe(
    Effect.map(([metaRecords, refRecords]) => {
      const refsByUserid = new Map(
        refRecords.map((r) => [r["userid"] ?? "", r["oa_references"] ?? ""]),
      );
      return metaRecords.map((r) => {
        const userid = r["userid"] ?? "";
        return {
          userid,
          last_name: r["last_name"] ?? "",
          middle_name: r["middle_name"] ?? "",
          first_name: r["first_name"] ?? "",
          orcid: r["orcid"] ?? "",
          researcher_oa_ids: r["researcher_oa_ids"] ?? "",
          oa_references: refsByUserid.get(userid) ?? "",
          oa_author_ids_imported_date: r["oa_author_ids_imported_date"] ?? "",
          oa_references_imported_at: r["oa_references_imported_at"] ?? "",
          final_references_imported_at: r["final_references_imported_at"] ?? "",
        };
      });
    }),
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
 * Downloads the `publications` file field for a given userid.
 */
export const downloadPublicationsFile = (
  config: RedcapConnectionConfig,
  userid: string,
): Effect.Effect<ArrayBuffer, RedcapFetchError> => {
  const client = makeClient(config);
  return client
    .exportFile("publications", userid)
    .pipe(Effect.mapError((cause) => new RedcapFetchError({ cause })));
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
    .importRecords(
      [
        {
          userid,
          oa_references: JSON.stringify(works),
          oa_references_imported_at: localIsoDateTime(),
          references_openalex_complete: "2",
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
 * Writes matched final references JSON to the `final_references` field for a given userid.
 */
export const writeFinalReferences = (
  config: RedcapConnectionConfig,
  userid: string,
  works: readonly WorksResult[],
): Effect.Effect<void, RedcapWriteError> => {
  const client = makeClient(config);
  return client
    .importRecords(
      [
        {
          userid,
          final_references: JSON.stringify(works),
          final_references_imported_at: localIsoDateTime(),
        },
      ],
      { overwriteBehavior: "overwrite" },
    )
    .pipe(
      Effect.asVoid,
      Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
    );
};
