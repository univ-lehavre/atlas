/**
 * `match-references` command — for each researcher, downloads their `publications`
 * file from REDCap, extracts text, fuzzy-matches titles from `oa_references`,
 * stores matched works in `final_references` + `final_references_imported_at`.
 */

import {
  spinner,
  log,
  outro,
  multiselect,
  isCancel,
  cancel,
} from "@clack/prompts";
import pc from "picocolors";
import { Effect, Either } from "effect";
import {
  fetchResearchers,
  downloadPublicationsFile,
  writeFinalReferences,
} from "../services/redcap.js";
import { extractText } from "../services/file-extractor.js";
import { matchReferences } from "../services/reference-matcher.js";
import { daysUntilNextUpdate } from "./process-row.js";
import type { ResearcherRow } from "../types.js";
import type { WorksResult } from "@univ-lehavre/atlas-openalex-types";

interface MatchReferencesOptions {
  readonly redcapUrl: string;
  readonly redcapToken: string;
  readonly threshold: number;
}

interface RedcapConfig {
  readonly url: string;
  readonly token: string;
}

const relativeDate = (dateStr: string): string => {
  if (dateStr === "") return "never";
  const days = daysUntilNextUpdate(dateStr);
  if (days !== null) return `update in ${String(days)}d`;
  return `imported ${new Date(dateStr).toISOString().slice(0, 10)}`;
};

const selectResearchersForMatch = async (
  researchers: readonly ResearcherRow[],
): Promise<readonly ResearcherRow[]> => {
  const selected = await multiselect({
    message: `Select researchers to match (${pc.bold(String(researchers.length))} with oa_references):`,
    options: [...researchers]
      .sort((a, b) => a.last_name.localeCompare(b.last_name, "fr"))
      .map((r) => ({
        value: r.userid,
        label: `${r.first_name} ${r.last_name}`,
        hint: `works: ${relativeDate(r.oa_references_imported_at)} · final: ${relativeDate(r.final_references_imported_at)}`,
      })),
    initialValues: researchers.map((r) => r.userid),
  });

  if (isCancel(selected)) {
    cancel("Cancelled.");
    process.exit(0);
  }

  return researchers.filter((r) =>
    (selected as readonly string[]).includes(r.userid),
  );
};

const parseOaReferences = (raw: string): readonly WorksResult[] => {
  if (raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WorksResult[]) : [];
  } catch {
    return [];
  }
};

export const matchReferencesCommand = async (
  opts: MatchReferencesOptions,
): Promise<void> => {
  const redcapConfig: RedcapConfig = {
    url: opts.redcapUrl,
    token: opts.redcapToken,
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
  s.stop(
    `Found ${pc.bold(String(allResearchers.length))} researchers in REDCap`,
  );

  const withRefs = allResearchers.filter((r) => r.oa_references !== "");

  if (withRefs.length === 0) {
    outro("No researchers with oa_references — nothing to do");
    return;
  }

  const researchers = await selectResearchersForMatch(withRefs);

  if (researchers.length === 0) {
    outro("Nothing selected");
    return;
  }

  let ok = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of researchers) {
    const label = `${row.first_name} ${row.last_name} (${row.userid})`;
    const oaWorks = parseOaReferences(row.oa_references);

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
      log.warn(`[${label}] Failed to extract text — skipping`);
      skipped++;
      continue;
    }

    const text = extractResult.right;

    // Match references
    const matched = matchReferences(oaWorks, text, opts.threshold);
    const matchedWorks = matched.map((m) => m.work);
    const ratio =
      oaWorks.length > 0
        ? Math.round((matchedWorks.length / oaWorks.length) * 100)
        : 0;

    log.info(
      `[${label}] ${pc.bold(String(matchedWorks.length))}/${pc.bold(String(oaWorks.length))} works matched (${String(ratio)}%)`,
    );

    // Write final references
    const writeSpinner = spinner();
    writeSpinner.start(`[${label}] Writing final references to REDCap…`);

    const writeResult = await Effect.runPromise(
      Effect.either(
        writeFinalReferences(redcapConfig, row.userid, matchedWorks),
      ),
    );

    if (Either.isLeft(writeResult)) {
      writeSpinner.stop(pc.red(`[${label}] REDCap write failed`));
      log.error(JSON.stringify(writeResult.left, null, 2));
      errors++;
      continue;
    }

    writeSpinner.stop(pc.green(`[${label}] Written ✓`));
    ok++;
  }

  const parts: string[] = [];
  if (ok > 0) parts.push(pc.green(`${String(ok)} written`));
  if (skipped > 0) parts.push(pc.dim(`${String(skipped)} skipped`));
  if (errors > 0) parts.push(pc.yellow(`${String(errors)} errors`));

  outro(parts.join(", ") || "Nothing to do");
};
