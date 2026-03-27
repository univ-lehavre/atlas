/**
 * `from-redcap` command — fetches researchers from REDCap and resolves their OpenAlex works.
 */

import { spinner, log, note, outro } from "@clack/prompts";
import pc from "picocolors";
import { Effect, Either } from "effect";
import type { OpenAlexConfig } from "@univ-lehavre/atlas-fetch-openalex";
import type { RateLimitInfo } from "@univ-lehavre/atlas-fetch-openalex";
import { fetchResearchers } from "../services/redcap.js";
import type { ResearcherRow } from "../types.js";
import { processRow, daysUntilNextUpdate } from "./process-row.js";
import { selectResearchers } from "./select-researchers.js";

interface FromRedcapOptions {
  readonly redcapUrl: string;
  readonly redcapToken: string;
  readonly openAlexUserAgent: string;
  readonly openAlexApiKey?: string;
}

interface RedcapConfig {
  readonly url: string;
  readonly token: string;
}

const showQuota = (
  quota: RateLimitInfo | null,
  totalCredits: number,
  label: string,
): void => {
  if (quota === null) return;
  log.info(
    `${label} — quota: ${pc.bold(String(quota.remaining))}/${pc.bold(String(quota.limit))} requests remaining` +
      ` · ${pc.bold(String(totalCredits))} credits used this session` +
      ` · resets in ${pc.dim(String(quota.resetInSeconds) + "s")}`,
  );
};

export const fromRedcap = async (opts: FromRedcapOptions): Promise<void> => {
  const redcapConfig: RedcapConfig = {
    url: opts.redcapUrl,
    token: opts.redcapToken,
  };
  const openAlexConfig: OpenAlexConfig = {
    userAgent: opts.openAlexUserAgent,
    ...(opts.openAlexApiKey !== undefined
      ? { apiKey: opts.openAlexApiKey }
      : {}),
  };

  // Fetch researchers from REDCap
  const s = spinner();
  s.start("Fetching researchers from REDCap…");

  const fetchResult: Either.Either<readonly ResearcherRow[], unknown> =
    await Effect.runPromise(Effect.either(fetchResearchers(redcapConfig)));

  if (Either.isLeft(fetchResult)) {
    s.stop(pc.red("Failed to fetch researchers from REDCap"));
    log.error(JSON.stringify(fetchResult.left, null, 2));
    process.exit(1);
  }

  const allResearchers = fetchResult.right;
  s.stop(
    `Found ${pc.bold(String(allResearchers.length))} researchers in REDCap`,
  );

  const isUpToDate = (row: ResearcherRow): boolean => {
    const authorDays = daysUntilNextUpdate(row.oa_author_ids_imported_date);
    const worksDays = daysUntilNextUpdate(row.oa_references_imported_at);
    return authorDays !== null && worksDays !== null;
  };

  const upToDate = allResearchers.filter(isUpToDate);
  const pending = allResearchers.filter((r) => !isUpToDate(r));

  if (upToDate.length > 0) {
    log.info(
      `${pc.dim(String(upToDate.length))} researcher(s) already up-to-date — excluded from selection`,
    );
  }

  if (pending.length === 0) {
    outro("All researchers are up-to-date — nothing to do");
    return;
  }

  const researchers = await selectResearchers(pending);

  let ok = 0;
  let skipped = 0;
  let errors = 0;
  let lastQuota: RateLimitInfo | null = null;
  let totalCredits = 0;

  for (const [i, row] of researchers.entries()) {
    note(
      `${row.first_name} ${row.last_name} · ${row.userid}`,
      `Researcher ${String(i + 1)}/${String(researchers.length)}`,
    );
    const status = await processRow(row, redcapConfig, openAlexConfig, (q) => {
      lastQuota = q;
      totalCredits += q.creditsUsed;
    });
    if (status === "ok") ok++;
    else if (status === "skipped") skipped++;
    else errors++;
  }

  showQuota(lastQuota, totalCredits, "OpenAlex quota after");

  const parts: string[] = [];
  if (ok > 0) parts.push(pc.green(`${String(ok)} written`));
  if (skipped > 0) parts.push(pc.dim(`${String(skipped)} skipped`));
  if (errors > 0) parts.push(pc.yellow(`${String(errors)} errors`));

  outro(parts.join(", ") || "Nothing to do");
};
