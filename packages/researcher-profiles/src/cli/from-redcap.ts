/**
 * `from-redcap` command — fetches researchers from REDCap and resolves their OpenAlex works.
 *
 * For each researcher:
 *   1. Shows OpenAlex authors found
 *   2. Shows works found (sample)
 *   3. Asks for confirmation before writing to REDCap
 */

import { spinner, log, outro, confirm, isCancel, cancel } from "@clack/prompts";
import pc from "picocolors";
import { Effect, Either } from "effect";
import type {
  AuthorsResult,
  WorksResult,
} from "@univ-lehavre/atlas-openalex-types";
import type { OpenAlexConfig } from "@univ-lehavre/atlas-fetch-openalex";
import { resolveAll, type ResolveResult } from "../services/openalex.js";
import { fetchResearchers, writeOaReferences } from "../services/redcap.js";
import type { ResearcherRow } from "../types.js";

interface FromRedcapOptions {
  readonly redcapUrl: string;
  readonly redcapToken: string;
  readonly openAlexUserAgent: string;
}

interface RedcapConfig {
  readonly url: string;
  readonly token: string;
}

const showAuthors = (authors: readonly AuthorsResult[]): void => {
  if (authors.length === 0) {
    log.warn("  No OpenAlex author profiles found");
    return;
  }
  log.info("  OpenAlex author profiles:");
  for (const a of authors) {
    const orcid = a.orcid !== "" ? pc.dim(` · ORCID: ${a.orcid}`) : "";
    log.message(`  · ${a.display_name}${pc.dim(` (${a.id})`)}${orcid}`);
  }
};

const showWorks = (works: readonly WorksResult[]): void => {
  if (works.length === 0) {
    log.warn("  No works found");
    return;
  }
  log.info("  Works (sample):");
  for (const w of works.slice(0, 5)) {
    log.message(`  · [${pc.dim(String(w.publication_year))}] ${w.title}`);
  }
  if (works.length > 5) {
    log.message(pc.dim(`  … and ${String(works.length - 5)} more`));
  }
};

const processRow = async (
  row: ResearcherRow,
  redcapConfig: RedcapConfig,
  openAlexConfig: OpenAlexConfig,
): Promise<"ok" | "skipped" | "error"> => {
  const label = `${row.first_name} ${row.last_name} (${row.userid})`;

  // Step 1: Resolve authors + works
  const s = spinner();
  s.start(`[${label}] Searching OpenAlex...`);

  const result: Either.Either<ResolveResult, unknown> = await Effect.runPromise(
    Effect.either(resolveAll(row, openAlexConfig)),
  );

  if (Either.isLeft(result)) {
    s.stop(pc.red(`[${label}] OpenAlex search failed`));
    log.error(String(result.left));
    return "error";
  }

  const { authors, works }: ResolveResult = result.right;
  s.stop(
    `[${label}] Found ${pc.bold(String(authors.length))} author profile(s), ${pc.bold(String(works.length))} work(s)`,
  );

  // Step 2: Show what was found
  showAuthors(authors);
  showWorks(works);

  // Step 3: Ask for confirmation
  const confirmed = await confirm({
    message: `Write ${String(works.length)} works to REDCap for ${label}?`,
  });

  if (isCancel(confirmed)) {
    cancel("Cancelled");
    process.exit(0);
  }

  if (!confirmed) {
    log.warn(`Skipped ${label}`);
    return "skipped";
  }

  // Step 4: Write to REDCap
  const writeSpinner = spinner();
  writeSpinner.start(`[${label}] Writing to REDCap...`);

  const writeResult: Either.Either<void, unknown> = await Effect.runPromise(
    Effect.either(writeOaReferences(redcapConfig, row.userid, works)),
  );

  if (Either.isLeft(writeResult)) {
    writeSpinner.stop(pc.red(`[${label}] REDCap write failed`));
    log.error(String(writeResult.left));
    return "error";
  }

  writeSpinner.stop(pc.green(`[${label}] Written to REDCap`));
  return "ok";
};

export const fromRedcap = async (opts: FromRedcapOptions): Promise<void> => {
  const redcapConfig: RedcapConfig = {
    url: opts.redcapUrl,
    token: opts.redcapToken,
  };
  const openAlexConfig: OpenAlexConfig = { userAgent: opts.openAlexUserAgent };

  // Fetch researchers from REDCap
  const s = spinner();
  s.start("Fetching researchers from REDCap...");

  const fetchResult: Either.Either<readonly ResearcherRow[], unknown> =
    await Effect.runPromise(Effect.either(fetchResearchers(redcapConfig)));

  if (Either.isLeft(fetchResult)) {
    s.stop(pc.red("Failed to fetch researchers from REDCap"));
    log.error(JSON.stringify(fetchResult.left, null, 2));
    process.exit(1);
  }

  const researchers = fetchResult.right;
  s.stop(`Found ${pc.bold(String(researchers.length))} researchers in REDCap`);

  let ok = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of researchers) {
    const status = await processRow(row, redcapConfig, openAlexConfig);
    if (status === "ok") ok++;
    else if (status === "skipped") skipped++;
    else errors++;
  }

  const parts: string[] = [];
  if (ok > 0) parts.push(pc.green(`${String(ok)} written`));
  if (skipped > 0) parts.push(pc.dim(`${String(skipped)} skipped`));
  if (errors > 0) parts.push(pc.yellow(`${String(errors)} errors`));

  outro(parts.join(", ") || "Nothing to do");
};
