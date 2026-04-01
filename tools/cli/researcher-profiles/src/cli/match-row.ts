/**
 * Per-researcher match step: downloads the publications file, extracts text,
 * fuzzy-matches against oa_references, and writes final_references to oa_data.
 *
 * Returns "ok" | "skipped" | "error".
 * Skips silently if there is no publications file or no oa_references.
 */

import { spinner, log } from "@clack/prompts";
import pc from "picocolors";
import { Effect, Either, Logger, LogLevel } from "effect";
import {
  fetchResearcherData,
  writeFinalReferences,
  downloadPublicationsFile,
} from "@univ-lehavre/atlas-researcher-profiles";
import { extractText } from "@univ-lehavre/atlas-researcher-profiles";
import { matchReferences } from "@univ-lehavre/atlas-researcher-profiles";
import type { WorksResult } from "@univ-lehavre/atlas-openalex-types";
import {
  searchWorksByDOI,
  type OpenAlexConfig,
} from "@univ-lehavre/atlas-fetch-openalex";
import type { ResearcherRow } from "@univ-lehavre/atlas-researcher-profiles";

const silenced = <A, E>(effect: Effect.Effect<A, E>): Effect.Effect<A, E> =>
  effect.pipe(Logger.withMinimumLogLevel(LogLevel.None));

export interface MatchRowConfig {
  readonly redcap: { readonly url: string; readonly token: string };
  readonly openAlex: OpenAlexConfig;
  readonly threshold: number;
}

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

export const matchRow = async (
  row: ResearcherRow,
  config: MatchRowConfig,
): Promise<"ok" | "skipped" | "error"> => {
  const label = `${row.first_name} ${row.last_name} (${row.userid})`;

  // Check lock
  if (row.oa_locked_at !== "") {
    log.error(`[${label}] Locked since ${row.oa_locked_at} — aborting`);
    process.exit(1);
  }

  // Fetch oa_data
  const dataResult = await Effect.runPromise(
    Effect.either(fetchResearcherData(config.redcap, row.userid)),
  );

  if (Either.isLeft(dataResult)) {
    log.warn(
      `[${label}] Failed to fetch oa_data — skipping: ${JSON.stringify(dataResult.left)}`,
    );
    return "skipped";
  }

  const data = dataResult.right;

  if (data.oa_references.length === 0) {
    log.warn(`[${label}] No oa_references found — skipping`);
    return "skipped";
  }

  // Apply name filter
  const allAuthorIds = new Set(data.fullnames.map((e) => e.authorId));
  const selectedNameFilter = new Set(
    data.fullnames.filter((e) => e.selected).map((e) => e.name),
  );

  if (selectedNameFilter.size === 0) {
    log.warn(`[${label}] No names selected — skipping`);
    return "skipped";
  }

  const worksAfterNameFilter = data.oa_references.filter((w) =>
    w.authorships.some(
      (a) =>
        allAuthorIds.has(a.author.id) &&
        (a.raw_author_name === "" || selectedNameFilter.has(a.raw_author_name)),
    ),
  );

  log.info(
    `[${label}] ${pc.bold(String(worksAfterNameFilter.length))}/${pc.bold(String(data.oa_references.length))} work(s) after name filter`,
  );

  // Apply affiliation filter
  const selectedAffiliationFilter = new Set(
    data.affiliations.filter((e) => e.selected).map((e) => e.affiliation),
  );

  const worksAfterAffFilter =
    selectedAffiliationFilter.size === 0
      ? worksAfterNameFilter
      : worksAfterNameFilter.filter((w) =>
          w.authorships.some(
            (a) =>
              allAuthorIds.has(a.author.id) &&
              (a.institutions.length === 0 ||
                a.institutions.some((i) =>
                  selectedAffiliationFilter.has(i.id),
                )),
          ),
        );

  if (selectedAffiliationFilter.size > 0) {
    log.info(
      `[${label}] ${pc.bold(String(worksAfterAffFilter.length))}/${pc.bold(String(worksAfterNameFilter.length))} work(s) after affiliation filter`,
    );
  }

  const oaWorks = worksAfterAffFilter;

  // Download publications file
  const fileSpinner = spinner();
  fileSpinner.start(`[${label}] Downloading publications file…`);

  const fileResult = await Effect.runPromise(
    Effect.either(downloadPublicationsFile(config.redcap, row.userid)),
  );

  if (Either.isLeft(fileResult)) {
    fileSpinner.stop(pc.yellow(`[${label}] No publications file — skipping`));
    return "skipped";
  }

  fileSpinner.stop(`[${label}] File downloaded`);

  // Extract text
  const extractSpinner = spinner();
  extractSpinner.start(`[${label}] Extracting text…`);

  const extractResult = await Effect.runPromise(
    Effect.either(extractText(fileResult.right)),
  );

  if (Either.isLeft(extractResult)) {
    extractSpinner.stop(
      pc.yellow(`[${label}] Failed to extract text — skipping`),
    );
    const extractErr = extractResult.left;
    const extractCause = (extractErr as { cause?: unknown }).cause;
    const extractCauseStr =
      extractCause instanceof Error
        ? extractCause.message
        : JSON.stringify(extractCause);
    log.warn(`  ${extractCauseStr}`);
    return "skipped";
  }

  const text = extractResult.right;

  const previewLines = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 20)
    .slice(0, 3);
  extractSpinner.stop(
    `[${label}] Extracted ${pc.bold(String(text.trim().length))} chars — preview: ${previewLines.map((l) => `"${l.trim().slice(0, 60)}"`).join(" | ")}`,
  );

  if (text.trim().length < 100) {
    log.warn(
      `[${label}] Too little text extracted (${String(text.trim().length)} chars) — PDF may be a scanned image (OCR not supported)`,
    );
    return "skipped";
  }

  log.info("Matching OpenAlex works against uploaded references…");

  // Match references by title (fuzzy)
  const matched = matchReferences(oaWorks, text, config.threshold);
  const fuzzyWithDoi = matched
    .map((m) => m.work)
    .filter((w) => w.doi !== null && w.doi !== "");

  // Find DOIs in extracted text
  const textDois = extractDoisFromText(text);
  const oaDoiMap = new Map<string, WorksResult>();
  for (const w of oaWorks) {
    if (w.doi !== null && w.doi !== "") {
      oaDoiMap.set(normalizeDoi(w.doi), w);
    }
  }

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
      Effect.either(silenced(searchWorksByDOI(missingDois, config.openAlex))),
    );
    if (Either.isLeft(doiResult)) {
      doiSpinner.stop(
        pc.yellow(
          `[${label}] Could not fetch missing DOIs — continuing without them`,
        ),
      );
    } else {
      fetchedByDoi = [...doiResult.right];
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
    const key = normalizeDoi(w.doi ?? "");
    if (seenDois.has(key)) continue;
    seenDois.add(key);
    matchedWorks.push(w);
    if (source === "doi") doiAdded++;
    else fuzzyAdded++;
  }

  log.info(
    `[${label}] fuzzy: ${pc.bold(String(fuzzyAdded))} · DOI: ${pc.bold(String(doiAdded))} · total: ${pc.bold(String(matchedWorks.length))} · threshold: ${String(config.threshold)}`,
  );

  if (matchedWorks.length === 0) {
    log.warn(
      `[${label}] No matches — PDF may be a scanned image or titles do not overlap. Skipping write.`,
    );
    return "skipped";
  }

  // Write final references
  const writeSpinner = spinner();
  writeSpinner.start(`[${label}] Writing final references to REDCap…`);

  const updatedData = { ...data, final_references: matchedWorks };

  const writeResult = await Effect.runPromise(
    Effect.either(
      writeFinalReferences(
        config.redcap,
        row.userid,
        updatedData,
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
    return "error";
  }

  writeSpinner.stop(`[${label}] Final references written`);
  return "ok";
};
