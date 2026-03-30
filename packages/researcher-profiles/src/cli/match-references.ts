/**
 * `match-references` command — for each researcher, downloads their `publications`
 * file from REDCap, extracts text, fuzzy-matches titles from `oa_references`,
 * stores matched works in `final_references` + `final_references_imported_at`.
 */

import { spinner, log, note, outro } from "@clack/prompts";
import pc from "picocolors";
import { Effect, Either, Logger, LogLevel } from "effect";
import { selectResearchers } from "./select-researchers.js";

const silenced = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
  effect.pipe(Logger.withMinimumLogLevel(LogLevel.None));
import {
  fetchResearchers,
  fetchOaReferences,
  downloadPublicationsFile,
  writeFinalReferences,
  writeRawReferences,
} from "../services/redcap.js";
import { extractText } from "../services/file-extractor.js";
import { matchReferences } from "../services/reference-matcher.js";
import type { WorksResult } from "@univ-lehavre/atlas-openalex-types";
import {
  searchWorksByDOI,
  type OpenAlexConfig,
} from "@univ-lehavre/atlas-fetch-openalex";

interface MatchReferencesOptions {
  readonly redcapUrl: string;
  readonly redcapToken: string;
  readonly threshold: number;
  readonly openAlexUserAgent: string;
  readonly openAlexApiKey?: string;
  /** If provided, skip the interactive prompt and process only these userids. */
  readonly userids?: readonly string[];
}

interface RedcapConfig {
  readonly url: string;
  readonly token: string;
}

const parseOaReferences = (
  buffer: ArrayBuffer,
): { works: readonly WorksResult[]; error: string | null } => {
  const raw = new TextDecoder().decode(buffer);
  if (raw === "") return { works: [], error: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    const works = Array.isArray(parsed) ? (parsed as WorksResult[]) : [];
    return {
      works,
      error: Array.isArray(parsed) ? null : "parsed value is not an array",
    };
  } catch (e) {
    return {
      works: [],
      error: String(e) + ` (last 80 chars: ${raw.slice(-80)})`,
    };
  }
};

const DOI_REGEX = /\b10\.\d{4,}\/[^\s"'<>,;]+/g;

const extractDoisFromText = (text: string): string[] => {
  const matches = text.match(DOI_REGEX) ?? [];
  return [
    ...new Set(matches.map((d) => d.toLowerCase().replace(/[.)]+$/, ""))),
  ];
};

const normalizeDoi = (doi: string): string =>
  doi
    .toLowerCase()
    .replace(/^https?:\/\/doi\.org\//i, "")
    .replace(/[.)]+$/, "");

export const matchReferencesCommand = async (
  opts: MatchReferencesOptions,
): Promise<void> => {
  const redcapConfig: RedcapConfig = {
    url: opts.redcapUrl,
    token: opts.redcapToken,
  };
  const openAlexConfig: OpenAlexConfig = {
    userAgent: opts.openAlexUserAgent,
    apiKey: opts.openAlexApiKey,
  };

  // Fetch researchers
  const s = spinner();
  s.start("Fetching researchers from REDCap…");

  const fetchResult = await Effect.runPromise(
    Effect.either(fetchResearchers(redcapConfig)),
  );

  if (Either.isLeft(fetchResult)) {
    s.stop(pc.red("Failed to fetch researchers from REDCap"));
    log.error(JSON.stringify(fetchResult.left, null, 2));
    process.exit(1);
  }

  const allResearchers = fetchResult.right;
  const pending = allResearchers.filter(
    (r) => r.references_openalex_complete !== "2",
  );
  const complete = allResearchers.filter(
    (r) => r.references_openalex_complete === "2",
  );
  s.stop(
    `Found ${pc.bold(String(allResearchers.length))} researchers in REDCap`,
  );

  if (complete.length > 0) {
    log.info(
      `${pc.dim(String(complete.length))} researcher(s) complete (references_openalex_complete = 2) — excluded`,
    );
  }

  if (pending.length === 0) {
    outro("All researchers are already complete");
    return;
  }

  const { userids } = opts;
  const researchers =
    userids !== undefined
      ? pending.filter((r) => userids.includes(r.userid))
      : await selectResearchers(pending, true);

  let ok = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of researchers) {
    const label = `${row.first_name} ${row.last_name} (${row.userid})`;

    // Fetch oa_references individually to avoid REDCap truncation of large notes fields
    const refsResult = await Effect.runPromise(
      Effect.either(fetchOaReferences(redcapConfig, row.userid)),
    );

    if (Either.isLeft(refsResult)) {
      log.warn(
        `[${label}] Failed to fetch oa_references — skipping: ${JSON.stringify(refsResult.left)}`,
      );
      skipped++;
      continue;
    }

    const { works: oaWorks, error: parseError } = parseOaReferences(
      refsResult.right,
    );
    if (parseError !== null) {
      log.warn(`[${label}] JSON parse error: ${parseError}`);
    }

    if (oaWorks.length === 0) {
      log.warn(`[${label}] No oa_references found — skipping`);
      skipped++;
      continue;
    }

    // Download publications file
    const fileSpinner = spinner();
    fileSpinner.start(`[${label}] Downloading publications file…`);

    const fileResult = await Effect.runPromise(
      Effect.either(downloadPublicationsFile(redcapConfig, row.userid)),
    );

    if (Either.isLeft(fileResult)) {
      fileSpinner.stop(pc.yellow(`[${label}] No publications file — skipping`));
      skipped++;
      continue;
    }

    fileSpinner.stop(`[${label}] File downloaded`);

    // Extract text
    const extractResult = await Effect.runPromise(
      Effect.either(extractText(fileResult.right)),
    );

    if (Either.isLeft(extractResult)) {
      const extractErr = extractResult.left;
      const extractCause = (extractErr as { cause?: unknown }).cause;
      const extractCauseStr =
        extractCause instanceof Error
          ? extractCause.message
          : JSON.stringify(extractCause);
      log.warn(
        `[${label}] Failed to extract text — skipping: ${extractCauseStr}`,
      );
      skipped++;
      continue;
    }

    const text = extractResult.right;

    const previewLines = text
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 20)
      .slice(0, 3);
    log.info(
      `[${label}] Extracted ${String(text.trim().length)} chars — preview: ${previewLines.map((l) => `"${l.trim().slice(0, 60)}"`).join(" | ")}`,
    );

    if (text.trim().length < 100) {
      log.warn(
        `[${label}] Too little text extracted (${String(text.trim().length)} chars) — PDF may be a scanned image (OCR not supported)`,
      );
      skipped++;
      continue;
    }

    // Write raw references PDF (silent)
    await Effect.runPromise(
      Effect.either(
        writeRawReferences(
          redcapConfig,
          row.userid,
          text,
          `${row.first_name} ${row.last_name}`,
        ),
      ),
    );

    note(
      `[${label}] Matching entre OpenAlex et les références uploadées par le chercheur`,
    );

    // Match references by title (fuzzy)
    const matched = matchReferences(oaWorks, text, opts.threshold);
    const fuzzyWithDoi = matched
      .map((m) => m.work)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- doi is typed string but can be null at runtime
      .filter((w) => w.doi !== null && w.doi !== undefined && w.doi !== "");

    // Find DOIs in extracted text
    const textDois = extractDoisFromText(text);
    const oaDoiMap = new Map<string, WorksResult>();
    for (const w of oaWorks) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- doi is typed string but can be null at runtime
      if (w.doi !== null && w.doi !== undefined && w.doi !== "") {
        oaDoiMap.set(normalizeDoi(w.doi), w);
      }
    }

    // DOIs from text already covered by oa_references
    const doiWorksFromText: WorksResult[] = [];
    const missingDois: string[] = [];
    for (const doi of textDois) {
      const found = oaDoiMap.get(doi);
      if (found !== undefined) {
        doiWorksFromText.push(found);
      } else {
        missingDois.push(doi);
      }
    }

    // Fetch missing DOIs from OpenAlex
    let fetchedByDoi: WorksResult[] = [];
    if (missingDois.length > 0) {
      const doiSpinner = spinner();
      doiSpinner.start(
        `[${label}] Fetching ${String(missingDois.length)} DOI(s) not in oa_references…`,
      );
      const doiResult = await Effect.runPromise(
        Effect.either(silenced(searchWorksByDOI(missingDois, openAlexConfig))),
      );
      if (Either.isLeft(doiResult)) {
        doiSpinner.stop(
          pc.yellow(
            `[${label}] Could not fetch missing DOIs — continuing without them`,
          ),
        );
      } else {
        fetchedByDoi = doiResult.right as WorksResult[];
        doiSpinner.stop(
          `[${label}] Fetched ${pc.bold(String(fetchedByDoi.length))} work(s) by DOI from OpenAlex`,
        );
      }
    }

    // Merge: DOI-based works take precedence, then fuzzy matches — deduplicate by DOI
    const seenDois = new Set<string>();
    const matchedWorks: WorksResult[] = [];
    let doiAdded = 0;
    let fuzzyAdded = 0;
    for (const [source, w] of [
      ...[...doiWorksFromText, ...fetchedByDoi].map((w) => ["doi", w] as const),
      ...fuzzyWithDoi.map((w) => ["fuzzy", w] as const),
    ]) {
      const key = normalizeDoi(w.doi);
      if (seenDois.has(key)) continue;
      seenDois.add(key);
      matchedWorks.push(w);
      if (source === "doi") doiAdded++;
      else fuzzyAdded++;
    }

    log.info(
      `[${label}] fuzzy: ${pc.bold(String(fuzzyAdded))} · DOI: ${pc.bold(String(doiAdded))} · total: ${pc.bold(String(matchedWorks.length))}`,
    );

    if (matchedWorks.length === 0) {
      log.warn(
        `[${label}] No matches — PDF may be a scanned image or titles do not overlap. Skipping write.`,
      );
      skipped++;
      continue;
    }

    // Write final references
    const writeSpinner = spinner();
    writeSpinner.start(`[${label}] Writing final references to REDCap…`);

    const writeResult = await Effect.runPromise(
      Effect.either(
        writeFinalReferences(
          redcapConfig,
          row.userid,
          matchedWorks,
          `${row.first_name} ${row.last_name}`,
        ),
      ),
    );

    if (Either.isLeft(writeResult)) {
      writeSpinner.stop(pc.red(`[${label}] REDCap write failed`));
      const err = writeResult.left;
      const cause = (err as { cause?: unknown }).cause;
      const causeStr =
        cause instanceof Error ? cause.message : JSON.stringify(cause, null, 2);
      log.error(
        JSON.stringify(
          { userid: err.userid, _tag: err._tag, cause: causeStr },
          null,
          2,
        ),
      );
      errors++;
      continue;
    }

    writeSpinner.stop(`[${label}] Written`);
    ok++;
  }

  const parts: string[] = [];
  if (ok > 0) parts.push(pc.green(`${String(ok)} written`));
  if (skipped > 0) parts.push(pc.dim(`${String(skipped)} skipped`));
  if (errors > 0) parts.push(pc.yellow(`${String(errors)} errors`));

  outro(parts.join(", ") || "Nothing to do");
};
