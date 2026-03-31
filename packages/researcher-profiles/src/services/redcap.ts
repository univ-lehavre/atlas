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
import {
  generateReferencesPdf,
  generateRawReferencesPdf,
} from "./pdf-generator.js";

export interface RedcapConnectionConfig {
  readonly url: string;
  readonly token: string;
}

const normalizeUrl = (url: string): string =>
  url.endsWith("/") ? url : `${url}/`;

const makeClient = (
  config: RedcapConnectionConfig,
): ReturnType<typeof createRedcapClient> =>
  createRedcapClient({
    url: RedcapUrl(normalizeUrl(config.url)),
    token: RedcapToken(config.token),
  });

const toJsonBytes = (value: unknown): Uint8Array =>
  new TextEncoder().encode(JSON.stringify(value));

/**
 * Fetches all researchers from the `references_openalex` REDCap instrument.
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
        "oa_references_imported_at",
        "final_references_imported_at",
        "raw_references_imported_at",
        "references_openalex_complete",
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
          oa_references_imported_at: r["oa_references_imported_at"] ?? "",
          final_references_imported_at: r["final_references_imported_at"] ?? "",
          raw_references_imported_at: r["raw_references_imported_at"] ?? "",
          references_openalex_complete: r["references_openalex_complete"] ?? "",
        })),
      ),
      Effect.mapError((cause) => new RedcapFetchError({ cause })),
    );
};

const localIsoDateTime = (): string => {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return (
    `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  );
};

/**
 * Uploads the full list of author fullnames (with selection status) to `alternative_author_fullnames`.
 * Also updates `oa_author_ids_imported_date` timestamp.
 */
export const writeAlternativeAuthorFullnames = (
  config: RedcapConnectionConfig,
  userid: string,
  entries: readonly { name: string; authorId: string; selected: boolean }[],
): Effect.Effect<void, RedcapWriteError> => {
  const client = makeClient(config);
  return Effect.all(
    [
      client
        .importFile(
          "alternative_author_fullnames",
          userid,
          "alternative_author_fullnames.json",
          toJsonBytes(entries),
        )
        .pipe(
          Effect.asVoid,
          Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
        ),
      client
        .importRecords(
          [{ userid, oa_author_ids_imported_date: localIsoDateTime() }],
          { overwriteBehavior: "overwrite" },
        )
        .pipe(
          Effect.asVoid,
          Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
        ),
    ],
    { concurrency: 1 },
  ).pipe(Effect.asVoid);
};

/**
 * Downloads the `alternative_author_affiliations` file field for a given userid.
 */
export const fetchAlternativeAuthorAffiliations = (
  config: RedcapConnectionConfig,
  userid: string,
): Effect.Effect<ArrayBuffer, RedcapFetchError> => {
  const client = makeClient(config);
  return client
    .exportFile("alternative_author_affiliations", userid)
    .pipe(Effect.mapError((cause) => new RedcapFetchError({ cause })));
};

/**
 * Uploads the full list of affiliation strings (with selection status) to `alternative_author_affiliations`.
 */
export const writeAlternativeAuthorAffiliations = (
  config: RedcapConnectionConfig,
  userid: string,
  entries: readonly { affiliation: string; selected: boolean }[],
): Effect.Effect<void, RedcapWriteError> => {
  const client = makeClient(config);
  return client
    .importFile(
      "alternative_author_affiliations",
      userid,
      "alternative_author_affiliations.json",
      toJsonBytes(entries),
    )
    .pipe(
      Effect.asVoid,
      Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
    );
};

/**
 * Downloads the `alternative_author_fullnames` file field for a given userid.
 */
export const fetchAlternativeAuthorFullnames = (
  config: RedcapConnectionConfig,
  userid: string,
): Effect.Effect<ArrayBuffer, RedcapFetchError> => {
  const client = makeClient(config);
  return client
    .exportFile("alternative_author_fullnames", userid)
    .pipe(Effect.mapError((cause) => new RedcapFetchError({ cause })));
};

/**
 * Downloads `oa_references` file field for a given userid and parses as JSON.
 */
export const fetchOaReferences = (
  config: RedcapConnectionConfig,
  userid: string,
): Effect.Effect<ArrayBuffer, RedcapFetchError> => {
  const client = makeClient(config);
  return client
    .exportFile("oa_references", userid)
    .pipe(Effect.mapError((cause) => new RedcapFetchError({ cause })));
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
 * Uploads OpenAlex works as a JSON file to the `oa_references` file field.
 * Also updates the `oa_references_imported_at` timestamp via importRecords.
 */
export const writeOaReferences = (
  config: RedcapConnectionConfig,
  userid: string,
  works: readonly WorksResult[],
): Effect.Effect<void, RedcapWriteError> => {
  const client = makeClient(config);
  return Effect.all(
    [
      client
        .importFile(
          "oa_references",
          userid,
          "oa_references.json",
          toJsonBytes(works),
        )
        .pipe(
          Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
        ),
      client
        .importRecords(
          [
            {
              userid,
              oa_references_imported_at: localIsoDateTime(),
            },
          ],
          { overwriteBehavior: "overwrite" },
        )
        .pipe(
          Effect.asVoid,
          Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
        ),
    ],
    { concurrency: 1 },
  ).pipe(Effect.asVoid);
};

/**
 * Generates a simple plain-text PDF from extracted text and uploads it to `raw_references`.
 * Also updates `raw_references_imported_at`.
 */
export const writeRawReferences = (
  config: RedcapConnectionConfig,
  userid: string,
  text: string,
  researcherName: string,
): Effect.Effect<void, RedcapWriteError> => {
  const client = makeClient(config);
  return Effect.tryPromise<Uint8Array, RedcapWriteError>({
    try: () => generateRawReferencesPdf(text, researcherName),
    catch: (cause) => new RedcapWriteError({ userid, cause }),
  }).pipe(
    Effect.flatMap((pdfBytes) =>
      Effect.all(
        [
          client
            .importFile(
              "raw_references",
              userid,
              "raw_references.pdf",
              pdfBytes,
            )
            .pipe(
              Effect.mapError(
                (cause) => new RedcapWriteError({ userid, cause }),
              ),
            ),
          client
            .importRecords(
              [{ userid, raw_references_imported_at: localIsoDateTime() }],
              { overwriteBehavior: "overwrite" },
            )
            .pipe(
              Effect.asVoid,
              Effect.mapError(
                (cause) => new RedcapWriteError({ userid, cause }),
              ),
            ),
        ],
        { concurrency: 1 },
      ),
    ),
    Effect.asVoid,
  );
};

/**
 * Uploads matched final references as a JSON file to the `final_references` file field.
 * Also updates the `final_references_imported_at` timestamp via importRecords.
 */
export const writeFinalReferences = (
  config: RedcapConnectionConfig,
  userid: string,
  works: readonly WorksResult[],
  researcherName: string,
): Effect.Effect<void, RedcapWriteError> => {
  const client = makeClient(config);
  return Effect.all(
    [
      client
        .importFile(
          "final_references",
          userid,
          "final_references.json",
          toJsonBytes(works),
        )
        .pipe(
          Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
        ),
      Effect.tryPromise({
        try: () => generateReferencesPdf(works, researcherName),
        catch: (cause) => new RedcapWriteError({ userid, cause }),
      }).pipe(
        Effect.flatMap((pdfBytes) =>
          client
            .importFile(
              "final_references_pdf",
              userid,
              "final_references.pdf",
              pdfBytes,
            )
            .pipe(
              Effect.mapError(
                (cause) => new RedcapWriteError({ userid, cause }),
              ),
            ),
        ),
      ),
      client
        .importRecords(
          [
            {
              userid,
              final_references_imported_at: localIsoDateTime(),
              references_openalex_complete: "2",
            },
          ],
          { overwriteBehavior: "overwrite" },
        )
        .pipe(
          Effect.asVoid,
          Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
        ),
    ],
    { concurrency: 1 },
  ).pipe(Effect.asVoid);
};
