/**
 * `match-references` command — for each researcher, downloads their `publications`
 * file from REDCap, extracts text, fuzzy-matches titles from `oa_references`,
 * stores matched works in `final_references` inside `oa_data` + generates `oa_pdf`.
 */

import { spinner, log, outro } from "@clack/prompts";
import pc from "picocolors";
import { Effect, Either } from "effect";
import { selectResearchers } from "./select-researchers.js";
import { matchRow } from "./match-row.js";
import type { OpenAlexConfig } from "@univ-lehavre/atlas-fetch-openalex";
import { fetchResearchers } from "@univ-lehavre/atlas-researcher-profiles";

interface MatchReferencesOptions {
  readonly redcapUrl: string;
  readonly redcapToken: string;
  readonly threshold: number;
  readonly openAlexUserAgent: string;
  readonly openAlexApiKey?: string;
  /** If provided, skip the interactive prompt and process only these userids. */
  readonly userids?: readonly string[];
}

export const matchReferencesCommand = async (
  opts: MatchReferencesOptions,
): Promise<void> => {
  const redcapConfig = { url: opts.redcapUrl, token: opts.redcapToken };
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
  const pending = allResearchers.filter((r) => r.openalex_complete !== "2");
  const complete = allResearchers.filter((r) => r.openalex_complete === "2");
  s.stop(
    `Found ${pc.bold(String(allResearchers.length))} researchers in REDCap`,
  );

  if (complete.length > 0) {
    log.info(
      `${pc.dim(String(complete.length))} researcher(s) complete (openalex_complete = 2) — excluded`,
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

  log.info(
    `Match threshold: ${pc.bold(String(opts.threshold))} (lower = stricter)`,
  );

  let skipped = 0;
  let errors = 0;

  for (const [i, row] of researchers.entries()) {
    const label = `${row.first_name} ${row.last_name} (${row.userid})`;
    const t0 = Date.now();
    log.info(
      pc.bold(`── ${label} ──`) +
        pc.dim(` [${String(i + 1)}/${String(researchers.length)}]`),
    );

    const status = await matchRow(row, {
      redcap: redcapConfig,
      openAlex: openAlexConfig,
      threshold: opts.threshold,
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    if (status === "ok") {
      log.success(`[${label}] Written ${pc.dim(`(${elapsed}s)`)}`);
    } else if (status === "skipped") {
      skipped++;
    } else {
      errors++;
    }
  }

  const parts: string[] = [];
  if (skipped > 0) parts.push(pc.dim(`${String(skipped)} skipped`));
  if (errors > 0) parts.push(pc.yellow(`${String(errors)} errors`));

  outro(parts.join(", ") || "Nothing to do");
};
