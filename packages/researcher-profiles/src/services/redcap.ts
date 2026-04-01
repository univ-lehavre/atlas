/**
 * REDCap service for researcher profiles.
 */

import {
  createRedcapClient,
  RedcapUrl,
  RedcapToken,
} from "@univ-lehavre/atlas-redcap-client";
import type { WorksResult } from "@univ-lehavre/atlas-openalex-types";
import { Effect, Either } from "effect";
import { RedcapFetchError, RedcapWriteError } from "../errors.js";
import type { ResearcherRow, ResearcherData } from "../types.js";
import { emptyResearcherData } from "../types.js";
import { generateCombinedPdf, type PdfDebugInfo } from "./pdf-generator.js";

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

const parseJsonObject = (raw: string): Record<string, unknown> | null => {
  const parsed = Either.try(() => JSON.parse(raw) as unknown);
  const value = Either.isLeft(parsed) ? null : parsed.right;
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
};

const parseResearcherData = (buffer: ArrayBuffer): ResearcherData => {
  const raw = new TextDecoder().decode(buffer);
  const p = raw === "" ? null : parseJsonObject(raw);
  return p === null
    ? emptyResearcherData
    : {
        fullnames: Array.isArray(p["fullnames"])
          ? (p["fullnames"] as ResearcherData["fullnames"])
          : [],
        affiliations: Array.isArray(p["affiliations"])
          ? (p["affiliations"] as ResearcherData["affiliations"])
          : [],
        oa_references: Array.isArray(p["oa_references"])
          ? (p["oa_references"] as WorksResult[])
          : [],
        final_references: Array.isArray(p["final_references"])
          ? (p["final_references"] as WorksResult[])
          : [],
      };
};

/**
 * Fetches all researchers from the `openalex` REDCap instrument.
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
        "oa_imported_at",
        "oa_locked_at",
        "openalex_complete",
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
          oa_imported_at: r["oa_imported_at"] ?? "",
          oa_locked_at: r["oa_locked_at"] ?? "",
          openalex_complete: r["openalex_complete"] ?? "",
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
 * Fetches the `oa_data` file field for a given userid and parses it as ResearcherData.
 * Returns empty ResearcherData if the field has no file.
 */
export const fetchResearcherData = (
  config: RedcapConnectionConfig,
  userid: string,
): Effect.Effect<ResearcherData, RedcapFetchError> => {
  const client = makeClient(config);
  return client.exportFile("oa_data", userid).pipe(
    Effect.map(parseResearcherData),
    Effect.catchAll(() => Effect.succeed(emptyResearcherData)),
  );
};

/**
 * Writes the full ResearcherData to `oa_data` and updates `oa_imported_at`.
 * Used after resolving authors (fullnames + affiliations + oa_references).
 */
export const writeResearcherData = (
  config: RedcapConnectionConfig,
  userid: string,
  data: ResearcherData,
): Effect.Effect<void, RedcapWriteError> => {
  const client = makeClient(config);
  return Effect.all(
    [
      client
        .importFile("oa_data", userid, "oa_data.json", toJsonBytes(data))
        .pipe(
          Effect.asVoid,
          Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
        ),
      client
        .importRecords([{ userid, oa_imported_at: localIsoDateTime() }], {
          overwriteBehavior: "overwrite",
        })
        .pipe(
          Effect.asVoid,
          Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
        ),
    ],
    { concurrency: 1 },
  ).pipe(Effect.asVoid);
};

const writeFilesAndRecord = (
  client: ReturnType<typeof makeClient>,
  userid: string,
  data: ResearcherData,
  pdfBytes: Uint8Array,
): Effect.Effect<void, RedcapWriteError> =>
  Effect.all(
    [
      client
        .importFile("oa_data", userid, "oa_data.json", toJsonBytes(data))
        .pipe(
          Effect.asVoid,
          Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
        ),
      client.importFile("oa_pdf", userid, "oa_references.pdf", pdfBytes).pipe(
        Effect.asVoid,
        Effect.mapError((cause) => new RedcapWriteError({ userid, cause })),
      ),
      client
        .importRecords(
          [
            {
              userid,
              oa_imported_at: localIsoDateTime(),
              openalex_complete: "2",
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

/**
 * Writes the full ResearcherData to `oa_data`, generates a combined PDF in `oa_pdf`,
 * updates `oa_imported_at`, and marks `openalex_complete = "2"`.
 *
 * The PDF contains two sections:
 *   1. Références vérifiées — data.final_references (Chicago Notes)
 *   2. En attente de vérification — oa_references not in final_references (Chicago Notes)
 */
export const writeFinalReferences = (
  config: RedcapConnectionConfig,
  userid: string,
  data: ResearcherData,
  researcherName: string,
  debugInfo?: PdfDebugInfo,
): Effect.Effect<void, RedcapWriteError> => {
  const client = makeClient(config);
  const finalIds = new Set(data.final_references.map((w) => w.id));
  const pendingReferences = data.oa_references.filter(
    (w) => !finalIds.has(w.id),
  );

  return Effect.tryPromise<Uint8Array, RedcapWriteError>({
    try: () =>
      generateCombinedPdf(
        data.final_references,
        pendingReferences,
        researcherName,
        debugInfo,
      ),
    catch: (cause) => new RedcapWriteError({ userid, cause }),
  }).pipe(
    Effect.flatMap((pdfBytes) =>
      writeFilesAndRecord(client, userid, data, pdfBytes),
    ),
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
