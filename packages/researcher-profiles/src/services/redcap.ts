/**
 * REDCap service for researcher profiles.
 */

import {
  createRedcapClient,
  RedcapUrl,
  RedcapToken,
} from "@univ-lehavre/atlas-crf/redcap";
import type { WorksResult } from "@univ-lehavre/atlas-openalex-types";
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
      fields: ["userid", "last_name", "middle_name", "first_name", "orcid"],
    })
    .pipe(
      Effect.map((records) =>
        records.map((r) => ({
          userid: r["userid"] ?? "",
          last_name: r["last_name"] ?? "",
          middle_name: r["middle_name"] ?? "",
          first_name: r["first_name"] ?? "",
          orcid: r["orcid"] ?? "",
        })),
      ),
      Effect.mapError((cause) => new RedcapFetchError({ cause })),
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
